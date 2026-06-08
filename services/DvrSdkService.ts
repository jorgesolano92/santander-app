import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// Solo disponible en Android
const { DvrSdk } = NativeModules;
const eventEmitter = DvrSdk ? new NativeEventEmitter(DvrSdk) : null;

export interface DvrLoginParams {
  server: string;
  port: string;
  username: string;
  password: string;
  loginType?: number; // 0 = TCP, 1 = P2P, 2 = P2P2
  deviceSn?: string; // Número de serie (requerido para P2P)
  isWifi?: boolean; // Si la conexión es WiFi (para P2P)
}

export interface DvrLoginResult {
  userId: number;
  server: string;
}

export interface DvrDeviceInfo {
  videoInputNum: number;
  deviceName: string;
  firmwareVersion: string;
  deviceProduct: string;
  talkAudio?: number;
}

export interface DvrLiveParams {
  channel?: number;
  streamType?: number; // 0 main, 1 sub
}

export interface DvrVoiceParams {
  channel?: number;
}

/**
 * Servicio para interactuar con el SDK DVR nativo
 * 
 * Este servicio actúa como puente entre React Native (TypeScript/JavaScript)
 * y el módulo nativo de Android que envuelve el SDK DVR.
 */
class DvrSdkService {
  private eventEmitter: NativeEventEmitter | null;
  private isInitialized: boolean = false;

  constructor() {
    this.eventEmitter = eventEmitter;
    
    // Verificar si estamos en Android
    if (Platform.OS !== 'android') {
      console.warn('DvrSdkService solo está disponible en Android');
    }
  }

  /**
   * Verifica si el módulo nativo está disponible
   */
  isAvailable(): boolean {
    return Platform.OS === 'android' && DvrSdk != null;
  }

  /**
   * Inicializa el SDK DVR
   * Debe llamarse una vez al inicio de la aplicación
   */
  async initialize(): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('DvrSdk no está disponible en esta plataforma');
    }

    try {
      const result = await DvrSdk.initialize();
      this.isInitialized = result;
      return result;
    } catch (error: any) {
      console.error('Error initializing DVR SDK:', error);
      this.isInitialized = false;
      throw new Error(`Error al inicializar SDK: ${error.message || error}`);
    }
  }

  /**
   * Inicia sesión en un dispositivo DVR
   * 
   * @param params Parámetros de conexión
   * @returns Información de la sesión iniciada
   */
  async login(params: DvrLoginParams): Promise<DvrLoginResult> {
    if (!this.isAvailable()) {
      throw new Error('DvrSdk no está disponible en esta plataforma');
    }

    if (!this.isInitialized) {
      throw new Error('El SDK no está inicializado. Llama a initialize() primero.');
    }

    try {
      const loginType = params.loginType ?? 0; // Default TCP
      const deviceSn = params.deviceSn ?? '';
      const isWifi = params.isWifi ?? false;

      const result = await DvrSdk.login(
        params.server,
        params.port,
        params.username,
        params.password,
        loginType,
        deviceSn,
        isWifi
      );

      return result;
    } catch (error: any) {
      console.error('Error logging in to DVR:', error);
      throw new Error(`Error en login: ${error.message || error}`);
    }
  }

  /**
   * Cierra sesión del dispositivo DVR
   */
  async logout(): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('DvrSdk no está disponible en esta plataforma');
    }

    try {
      return await DvrSdk.logout();
    } catch (error: any) {
      console.error('Error logging out from DVR:', error);
      throw new Error(`Error en logout: ${error.message || error}`);
    }
  }

  /**
   * Obtiene información del dispositivo conectado
   */
  async getDeviceInfo(): Promise<DvrDeviceInfo> {
    if (!this.isAvailable()) {
      throw new Error('DvrSdk no está disponible en esta plataforma');
    }

    try {
      return await DvrSdk.getDeviceInfo();
    } catch (error: any) {
      console.error('Error getting device info:', error);
      throw new Error(`Error al obtener información: ${error.message || error}`);
    }
  }

  /**
   * Verifica si hay una sesión activa
   */
  async isLoggedIn(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return await DvrSdk.isLoggedIn();
    } catch (error: any) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  /**
   * Obtiene el último código de error del SDK
   */
  async getLastError(): Promise<number> {
    if (!this.isAvailable()) {
      return -1;
    }

    try {
      return await DvrSdk.getLastError();
    } catch (error: any) {
      console.error('Error getting last error:', error);
      return -1;
    }
  }

  /**
   * Habilita o deshabilita los logs nativos del SDK
   * Útil para debugging
   */
  setNativeLog(enable: boolean): void {
    if (this.isAvailable() && DvrSdk) {
      DvrSdk.setNativeLog(enable);
    }
  }

  /**
   * Limpia recursos del SDK
   * Debe llamarse cuando la app se cierre o ya no se necesite el SDK
   */
  async cleanup(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await DvrSdk.cleanup();
      this.isInitialized = false;
      return result;
    } catch (error: any) {
      console.error('Error cleaning up DVR SDK:', error);
      this.isInitialized = false;
      return false;
    }
  }

  async startLivePreview(params: DvrLiveParams = {}): Promise<number> {
    if (!this.isAvailable()) {
      throw new Error('DvrSdk no está disponible en esta plataforma');
    }
    const channel = params.channel ?? 0;
    const streamType = params.streamType ?? 1;
    return await DvrSdk.startLivePreview(channel, streamType);
  }

  async stopLivePreview(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    return await DvrSdk.stopLivePreview();
  }

  async startVoiceIntercom(params: DvrVoiceParams = {}): Promise<number> {
    if (!this.isAvailable()) {
      throw new Error('DvrSdk no está disponible en esta plataforma');
    }
    const channel = params.channel ?? -1;
    return await DvrSdk.startVoiceIntercom(channel);
  }

  async sendVoiceData(base64Pcm: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    return await DvrSdk.sendVoiceData(base64Pcm);
  }

  async stopVoiceIntercom(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    return await DvrSdk.stopVoiceIntercom();
  }

  async startMicStreaming(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    return await DvrSdk.startMicStreaming();
  }

  async stopMicStreaming(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    return await DvrSdk.stopMicStreaming();
  }

  /**
   * Suscribirse a eventos del SDK
   * 
   * @param eventName Nombre del evento
   * @param callback Función a ejecutar cuando ocurra el evento
   * @returns Subscription que puede usarse para remover el listener
   */
  addEventListener(eventName: string, callback: (data: any) => void) {
    if (!this.eventEmitter) {
      console.warn('EventEmitter no está disponible');
      return { remove: () => {} };
    }
    return this.eventEmitter.addListener(eventName, callback);
  }

  /**
   * Remover listener de eventos
   */
  removeEventListener(eventName: string, listener: any) {
    if (listener?.remove) {
      listener.remove();
    }
  }
}

export default new DvrSdkService();

