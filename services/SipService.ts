import { EventEmitter } from 'events';
import { Platform } from 'react-native';

export interface SipConfig {
  sipUri: string;
  sipUsername: string;
  sipPassword: string;
  sipDomain: string;
  enableTLS: boolean;
  /** Servidor SIP explícito (host:puerto). Si vacío, se deriva de sipDomain. */
  sipServer?: string;
}

export interface SipCallState {
  isActive: boolean;
  isConnected: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  duration: number;
  remoteUri?: string;
}

export type SipEventType = 'callStarted' | 'callConnected' | 'callEnded' | 'callFailed' | 'error';

type SimpleUserLike = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  call: (destination: string) => Promise<void>;
  hangup: () => Promise<void>;
  mute: () => void;
  unmute: () => void;
  hold: () => Promise<void>;
  unhold: () => Promise<void>;
  isConnected: () => boolean;
  stateChange: { addListener: (cb: (state: string) => void) => void };
};

let webrtcGlobalsReady = false;

function ensureWebRtcGlobals(): void {
  if (webrtcGlobalsReady || Platform.OS === 'web') {
    webrtcGlobalsReady = true;
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const webrtc = require('react-native-webrtc');
    const g = global as typeof globalThis & {
      RTCPeerConnection?: unknown;
      RTCSessionDescription?: unknown;
      RTCIceCandidate?: unknown;
      MediaStream?: unknown;
      navigator?: { mediaDevices?: unknown };
    };
    g.RTCPeerConnection = webrtc.RTCPeerConnection;
    g.RTCSessionDescription = webrtc.RTCSessionDescription;
    g.RTCIceCandidate = webrtc.RTCIceCandidate;
    g.MediaStream = webrtc.MediaStream;
    g.navigator = g.navigator ?? {};
    g.navigator.mediaDevices = webrtc.mediaDevices;
    webrtcGlobalsReady = true;
  } catch (error) {
    console.warn('[SIP] react-native-webrtc no disponible:', error);
  }
}

function parseSipTarget(uri: string): { user: string; host: string } {
  const trimmed = uri.trim();
  const withoutScheme = trimmed.replace(/^sips?:\/\//i, '');
  const atIndex = withoutScheme.indexOf('@');
  if (atIndex < 0) {
    return { user: withoutScheme, host: '' };
  }
  return {
    user: withoutScheme.slice(0, atIndex),
    host: withoutScheme.slice(atIndex + 1).split(/[;:]/)[0],
  };
}

function buildAor(config: SipConfig): string {
  const parsed = parseSipTarget(config.sipUri);
  const domain = config.sipDomain?.trim() || parsed.host;
  const user = config.sipUsername?.trim() || parsed.user;
  if (!user || !domain) {
    throw new Error('SIP URI, usuario o dominio incompletos.');
  }
  const scheme = config.enableTLS ? 'sips' : 'sip';
  return `${scheme}:${user}@${domain}`;
}

function buildWebSocketServer(config: SipConfig): string {
  const scheme = config.enableTLS ? 'wss' : 'ws';

  if (config.sipServer?.trim()) {
    const raw = config.sipServer.trim();
    // URL completa (ws://… o wss://…)
    if (/^wss?:\/\//i.test(raw)) {
      return raw;
    }
    // host:puerto[/ruta] — Asterisk suele usar …:8088/ws
    return `${scheme}://${raw.replace(/^\/+/, '')}`;
  }

  const domain = config.sipDomain?.trim() || parseSipTarget(config.sipUri).host;
  if (!domain) {
    throw new Error('No se puede determinar el servidor SIP (sipDomain o sipServer).');
  }
  // Sin sipServer explícito: WS en el mismo host (Asterisk: preferid sipServer=IP:8088/ws).
  return `${scheme}://${domain}`;
}

function isSipConfigured(config: SipConfig): boolean {
  return Boolean(
    config.sipUri?.trim() &&
      config.sipUsername?.trim() &&
      config.sipPassword?.trim() &&
      (config.sipDomain?.trim() || parseSipTarget(config.sipUri).host),
  );
}

class SipService extends EventEmitter {
  private isInitialized = false;
  private currentConfig: SipConfig | null = null;
  private simpleUser: SimpleUserLike | null = null;
  private callState: SipCallState = {
    isActive: false,
    isConnected: false,
    isMuted: false,
    isSpeakerOn: false,
    duration: 0,
  };
  private callDurationInterval: ReturnType<typeof setInterval> | null = null;

  async initialize(config: SipConfig): Promise<boolean> {
    try {
      if (!isSipConfigured(config)) {
        throw new Error('Configuración SIP incompleta.');
      }

      ensureWebRtcGlobals();
      this.currentConfig = config;

      if (this.simpleUser) {
        try {
          await this.simpleUser.disconnect();
        } catch {
          // ignore
        }
        this.simpleUser = null;
      }

      const { Web } = await import('sip.js');
      const aor = buildAor(config);
      const server = buildWebSocketServer(config);

      const options = {
        aor,
        media: {
          constraints: { audio: true, video: false },
        },
        userAgentOptions: {
          authorizationUsername: config.sipUsername.trim(),
          authorizationPassword: config.sipPassword,
          transportOptions: {
            server,
          },
        },
      };

      const user = new Web.SimpleUser(server, options) as SimpleUserLike;
      user.stateChange.addListener((state) => {
        console.log('[SIP] estado SimpleUser:', state);
        if (state === 'Established' && this.callState.isActive) {
          this.callState.isConnected = true;
          this.startCallDuration();
          this.emit('callConnected', { remoteUri: this.callState.remoteUri });
        }
      });

      await user.connect();
      this.simpleUser = user;
      this.isInitialized = true;
      console.log('[SIP] Registrado/conectado a', server, 'como', aor);
      return true;
    } catch (error) {
      console.error('[SIP] Error inicializando:', error);
      this.isInitialized = false;
      this.simpleUser = null;
      this.emit('error', {
        error: error instanceof Error ? error.message : 'Error inicializando SIP',
      });
      return false;
    }
  }

  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  async startCall(remoteUri: string): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.simpleUser) {
        throw new Error('Servicio SIP no inicializado');
      }

      const destination = remoteUri.trim();
      if (!destination) {
        throw new Error('Destino SIP vacío');
      }

      console.log('[SIP] Iniciando llamada a:', destination);
      this.callState = {
        isActive: true,
        isConnected: false,
        isMuted: false,
        isSpeakerOn: true,
        duration: 0,
        remoteUri: destination,
      };
      this.emit('callStarted', { remoteUri: destination });

      await this.simpleUser.call(destination);
      return true;
    } catch (error) {
      console.error('[SIP] Error iniciando llamada:', error);
      this.callState.isActive = false;
      this.emit('callFailed', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      return false;
    }
  }

  async endCall(): Promise<void> {
    try {
      console.log('[SIP] Finalizando llamada');
      if (this.simpleUser) {
        await this.simpleUser.hangup();
      }
      this.resetCallState();
      this.emit('callEnded', {});
    } catch (error) {
      console.error('[SIP] Error finalizando llamada:', error);
      this.resetCallState();
      this.emit('error', {
        error: error instanceof Error ? error.message : 'Error finalizando llamada',
      });
    }
  }

  async muteMicrophone(mute: boolean): Promise<void> {
    if (!this.simpleUser) return;
    if (mute) {
      this.simpleUser.mute();
    } else {
      this.simpleUser.unmute();
    }
    this.callState.isMuted = mute;
  }

  async setSpeakerphone(enabled: boolean): Promise<void> {
    // El enrutamiento de altavoz depende del SO; se deja el flag para la UI.
    this.callState.isSpeakerOn = enabled;
  }

  getCallState(): SipCallState {
    return { ...this.callState };
  }

  async shutdown(): Promise<void> {
    await this.endCall();
    if (this.simpleUser) {
      try {
        await this.simpleUser.disconnect();
      } catch {
        // ignore
      }
      this.simpleUser = null;
    }
    this.isInitialized = false;
    this.currentConfig = null;
  }

  private resetCallState(): void {
    this.callState = {
      isActive: false,
      isConnected: false,
      isMuted: false,
      isSpeakerOn: false,
      duration: 0,
    };
    if (this.callDurationInterval) {
      clearInterval(this.callDurationInterval);
      this.callDurationInterval = null;
    }
  }

  private startCallDuration(): void {
    if (this.callDurationInterval) {
      clearInterval(this.callDurationInterval);
    }
    this.callDurationInterval = setInterval(() => {
      if (this.callState.isActive && this.callState.isConnected) {
        this.callState.duration += 1;
      }
    }, 1000);
  }

  removeAllListeners(): this {
    super.removeAllListeners();
    return this;
  }
}

const sipService = new SipService();
export { sipService, isSipConfigured };
