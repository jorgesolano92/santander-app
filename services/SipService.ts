import { EventEmitter } from 'events';
import { Platform } from 'react-native';

import {
  setSpeakerphoneOn,
  startCommunicationAudio,
  stopCommunicationAudio,
} from '@/services/tabletWake';

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
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  call: (destination: string) => Promise<void>;
  hangup: () => Promise<void>;
  mute: () => void;
  unmute: () => void;
  hold: () => Promise<void>;
  unhold: () => Promise<void>;
  isConnected: () => boolean;
};

let webrtcGlobalsReady = false;
let webSocketPatched = false;

/**
 * sip.js Transport usa ws.addEventListener(...). En React Native el WebSocket
 * nativo solo expone onopen/onmessage/onerror/onclose → "undefined is not a function".
 */
function ensureWebSocketAddEventListener(): void {
  if (webSocketPatched || Platform.OS === 'web') {
    webSocketPatched = true;
    return;
  }

  // SessionManager también llama window.addEventListener('online'|'beforeunload').
  const g = global as typeof globalThis & {
    window?: Window & typeof globalThis;
  };
  if (!g.window) {
    g.window = g as unknown as Window & typeof globalThis;
  }
  if (typeof g.window.addEventListener !== 'function') {
    const noop = () => {};
    g.window.addEventListener = noop as Window['addEventListener'];
    g.window.removeEventListener = noop as Window['removeEventListener'];
  }

  const RNWebSocket = global.WebSocket as typeof WebSocket | undefined;
  if (!RNWebSocket) {
    console.warn('[SIP] global.WebSocket no disponible');
    return;
  }
  const proto = RNWebSocket.prototype as WebSocket & {
    addEventListener?: (type: string, listener: (...args: unknown[]) => void) => void;
    removeEventListener?: (type: string, listener: (...args: unknown[]) => void) => void;
  };
  if (typeof proto.addEventListener === 'function') {
    webSocketPatched = true;
    return;
  }

  proto.addEventListener = function addEventListener(type: string, listener: (...args: unknown[]) => void) {
    const handler = (event: unknown) => listener(event);
    switch (type) {
      case 'open':
        this.onopen = handler as WebSocket['onopen'];
        break;
      case 'message':
        this.onmessage = handler as WebSocket['onmessage'];
        break;
      case 'error':
        this.onerror = handler as WebSocket['onerror'];
        break;
      case 'close':
        this.onclose = handler as WebSocket['onclose'];
        break;
      default:
        break;
    }
  };

  proto.removeEventListener = function removeEventListener(type: string, _listener: (...args: unknown[]) => void) {
    switch (type) {
      case 'open':
        this.onopen = null;
        break;
      case 'message':
        this.onmessage = null;
        break;
      case 'error':
        this.onerror = null;
        break;
      case 'close':
        this.onclose = null;
        break;
      default:
        break;
    }
  };

  webSocketPatched = true;
  console.log('[SIP] WebSocket/window event polyfill activo (React Native)');
}

function ensureWebRtcGlobals(): void {
  if (webrtcGlobalsReady || Platform.OS === 'web') {
    webrtcGlobalsReady = true;
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const webrtc = require('react-native-webrtc');
    // registerGlobals: MediaStream, MediaStreamTrackEvent, getUserMedia, RTCPeerConnection, etc.
    if (typeof webrtc.registerGlobals === 'function') {
      webrtc.registerGlobals();
    } else {
      const g = global as typeof globalThis & {
        RTCPeerConnection?: unknown;
        RTCSessionDescription?: unknown;
        RTCIceCandidate?: unknown;
        MediaStream?: unknown;
        MediaStreamTrack?: unknown;
        MediaStreamTrackEvent?: unknown;
        navigator?: { mediaDevices?: unknown };
      };
      g.RTCPeerConnection = webrtc.RTCPeerConnection;
      g.RTCSessionDescription = webrtc.RTCSessionDescription;
      g.RTCIceCandidate = webrtc.RTCIceCandidate;
      g.MediaStream = webrtc.MediaStream;
      g.MediaStreamTrack = webrtc.MediaStreamTrack;
      g.MediaStreamTrackEvent = webrtc.MediaStreamTrackEvent;
      g.navigator = g.navigator ?? {};
      g.navigator.mediaDevices = webrtc.mediaDevices;
    }
    webrtcGlobalsReady = true;
    console.log('[SIP] WebRTC globals listos (react-native-webrtc)');
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

      ensureWebSocketAddEventListener();
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
          constraints: {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          },
        },
        delegate: {
          onServerConnect: () => {
            console.log('[SIP] WS conectado');
          },
          onServerDisconnect: (err?: Error) => {
            console.warn('[SIP] WS desconectado', err?.message);
            this.isInitialized = false;
          },
          onRegistered: () => {
            console.log('[SIP] REGISTER OK', aor);
          },
          onUnregistered: () => {
            console.log('[SIP] UNREGISTER');
          },
          onCallAnswered: () => {
            if (this.callState.isActive) {
              this.callState.isConnected = true;
              startCommunicationAudio(true);
              this.callState.isSpeakerOn = true;
              this.startCallDuration();
              this.emit('callConnected', { remoteUri: this.callState.remoteUri });
            }
          },
          onCallHangup: () => {
            stopCommunicationAudio();
            this.resetCallState();
            this.emit('callEnded', {});
          },
        },
        userAgentOptions: {
          authorizationUsername: config.sipUsername.trim(),
          authorizationPassword: config.sipPassword,
          logLevel: 'warn' as const,
          transportOptions: {
            server,
          },
          // FreePBX en la misma LAN: bastan candidatos host. Un STUN público sin salida a
          // Internet hace que sip.js agote su espera de ICE (5 s por defecto) en cada INVITE.
          sessionDescriptionHandlerFactoryOptions: {
            peerConnectionConfiguration: {
              iceServers: [],
            },
            iceGatheringTimeout: 500,
          },
        },
      };

      console.log('[SIP] Conectando WS', server, 'AOR', aor);
      const user = new Web.SimpleUser(server, options) as SimpleUserLike;

      await user.connect();
      // sip.js: connect solo abre el WebSocket; el REGISTER es aparte.
      await user.register();
      this.simpleUser = user;
      this.isInitialized = true;
      console.log('[SIP] Registrado/conectado a', server, 'como', aor);
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Error inicializando SIP';
      let endpoint = '(sip)';
      try {
        endpoint = `${buildWebSocketServer(config)} / ${buildAor(config)}`;
      } catch {
        // ignore
      }
      console.error('[SIP] Error inicializando:', endpoint, message, error);
      this.isInitialized = false;
      this.simpleUser = null;
      this.emit('error', { error: message });
      throw new Error(`SIP no registrado (${endpoint}): ${message}`);
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

      // Si quedó una sesión colgada de un intento anterior, limpiar.
      try {
        await this.simpleUser.hangup();
      } catch {
        // no había sesión activa
      }

      console.log('[SIP] Iniciando llamada a:', destination);
      startCommunicationAudio(true);
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
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Error desconocido iniciando llamada SIP';
      console.error('[SIP] Error iniciando llamada:', message, error);
      this.callState.isActive = false;
      this.emit('callFailed', { error: message });
      throw new Error(`No se pudo iniciar la llamada SIP: ${message}`);
    }
  }

  async endCall(): Promise<void> {
    try {
      console.log('[SIP] Finalizando llamada');
      if (this.simpleUser) {
        try {
          await this.simpleUser.hangup();
        } catch (hangupError) {
          // Sin sesión activa (p. ej. al pulsar VOLVER sin contestar): no es error de usuario.
          console.log(
            '[SIP] hangup omitido/fallido (esperado si no hay sesión):',
            hangupError instanceof Error ? hangupError.message : hangupError,
          );
        }
      }
      this.resetCallState();
      this.emit('callEnded', {});
    } catch (error) {
      console.error('[SIP] Error finalizando llamada:', error);
      this.resetCallState();
      this.emit('callEnded', {});
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
    setSpeakerphoneOn(enabled);
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
    stopCommunicationAudio();
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
