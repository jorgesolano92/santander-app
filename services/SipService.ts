import { EventEmitter } from 'events';

export interface SipConfig {
  sipUri: string;
  sipUsername: string;
  sipPassword: string;
  sipDomain: string;
  enableTLS: boolean;
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

class SipService extends EventEmitter {
  private isInitialized: boolean = false;
  private currentConfig: SipConfig | null = null;
  private callState: SipCallState = {
    isActive: false,
    isConnected: false,
    isMuted: false,
    isSpeakerOn: false,
    duration: 0,
  };
  private callDurationInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
  }

  async initialize(config: SipConfig): Promise<boolean> {
    try {
      console.log('🔊 Inicializando servicio SIP...', config);
      
      // Simular inicialización SIP
      this.currentConfig = config;
      this.isInitialized = true;
      
      console.log('✅ Servicio SIP inicializado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando servicio SIP:', error);
      return false;
    }
  }

  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  async startCall(remoteUri: string): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        throw new Error('Servicio SIP no inicializado');
      }

      console.log(`📞 Iniciando llamada SIP a: ${remoteUri}`);
      
      // Simular inicio de llamada
      this.callState = {
        isActive: true,
        isConnected: false,
        isMuted: false,
        isSpeakerOn: false,
        duration: 0,
        remoteUri,
      };

      this.emit('callStarted', { remoteUri });

      // Simular conexión después de 2 segundos
      setTimeout(() => {
        if (this.callState.isActive) {
          this.callState.isConnected = true;
          this.startCallDuration();
          this.emit('callConnected', { remoteUri });
        }
      }, 2000);

      return true;
    } catch (error) {
      console.error('❌ Error iniciando llamada SIP:', error);
      this.emit('callFailed', { error: error instanceof Error ? error.message : 'Error desconocido' });
      return false;
    }
  }

  async endCall(): Promise<void> {
    try {
      console.log('📞 Finalizando llamada SIP');
      
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

      this.emit('callEnded', {});
    } catch (error) {
      console.error('❌ Error finalizando llamada SIP:', error);
      this.emit('error', { error: error instanceof Error ? error.message : 'Error desconocido' });
    }
  }

  async muteMicrophone(mute: boolean): Promise<void> {
    try {
      console.log(`🔇 ${mute ? 'Silenciando' : 'Activando'} micrófono`);
      this.callState.isMuted = mute;
    } catch (error) {
      console.error('❌ Error controlando micrófono:', error);
      this.emit('error', { error: error instanceof Error ? error.message : 'Error controlando micrófono' });
    }
  }

  async setSpeakerphone(enabled: boolean): Promise<void> {
    try {
      console.log(`🔊 ${enabled ? 'Activando' : 'Desactivando'} altavoz`);
      this.callState.isSpeakerOn = enabled;
    } catch (error) {
      console.error('❌ Error controlando altavoz:', error);
      this.emit('error', { error: error instanceof Error ? error.message : 'Error controlando altavoz' });
    }
  }

  getCallState(): SipCallState {
    return { ...this.callState };
  }

  private startCallDuration(): void {
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

// Crear y exportar instancia singleton
const sipService = new SipService();
export { sipService };