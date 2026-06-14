import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { IntercomBridge } = NativeModules;
const emitter = IntercomBridge ? new NativeEventEmitter(IntercomBridge) : null;

export type BridgeState = 'connecting' | 'active' | 'disconnected' | 'error';

export interface BridgeStateEvent {
  state: BridgeState;
  message?: string;
}

/** Fuente del micrófono en modo puente (ver BRIDGE_ENV.md en el PC). */
export type BridgeMicAudioSource = 'voice_communication' | 'mic';

export interface BridgeConnectParams {
  bridgeUrl: string;
  cameraIp: string;
  sdkPort: number;
  username: string;
  password: string;
  channel: number;
  /** Por defecto voice_communication (AGC/eco). mic = captura más cruda. */
  micAudioSource?: BridgeMicAudioSource;
}

class IntercomBridgeService {
  isAvailable(): boolean {
    return Platform.OS === 'android' && !!IntercomBridge;
  }

  async connect(params: BridgeConnectParams): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Puente intercom solo disponible en Android compilado');
    }
    const sdkPort = Number(params.sdkPort);
    const channel = Number(params.channel);
    if (!Number.isFinite(sdkPort)) {
      throw new Error('sdkPort inválido');
    }
    return IntercomBridge.connect(
      params.bridgeUrl,
      params.cameraIp,
      sdkPort,
      params.username,
      params.password,
      Number.isFinite(channel) ? channel : -1,
      params.micAudioSource ?? 'voice_communication',
    );
  }

  async disconnect(): Promise<void> {
    if (!this.isAvailable()) return;
    await IntercomBridge.disconnect();
  }

  async isConnected(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    return IntercomBridge.isConnected();
  }

  addStateListener(listener: (event: BridgeStateEvent) => void): () => void {
    if (!emitter) {
      return () => {};
    }
    const sub = emitter.addListener('IntercomBridgeState', listener);
    return () => sub.remove();
  }
}

export default new IntercomBridgeService();
