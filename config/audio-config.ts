// Configuración de envío de audio
export interface AudioModeConfig {
  // Modo de envío
  mode: 'direct' | 'proxy';
  
  // Configuración del proxy
  proxyUrl?: string;
  proxyTimeout?: number;
  
  // Configuración directa
  directTimeout?: number;
  directRetries?: number;
  
  // Configuración de audio
  audioCodec?: 'PCMU' | 'PCMA' | 'G722' | 'AAC';
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
  
  // Configuración de red
  chunkSize?: number;
  bufferSize?: number;
}

// Configuraciones predefinidas por plataforma
export const AUDIO_CONFIGS: { [platform: string]: AudioModeConfig } = {
  'web': {
    mode: 'proxy',
    proxyUrl: 'http://localhost:3001',
    proxyTimeout: 10000,
    audioCodec: 'PCMU',
    sampleRate: 8000,
    channels: 1,
    bitRate: 64000,
    chunkSize: 1024,
    bufferSize: 4096
  },
  'android': {
    mode: 'direct',
    directTimeout: 5000,
    directRetries: 3,
    audioCodec: 'PCMU',
    sampleRate: 8000,
    channels: 1,
    bitRate: 64000,
    chunkSize: 2048,
    bufferSize: 8192
  },
  'ios': {
    mode: 'direct',
    directTimeout: 5000,
    directRetries: 3,
    audioCodec: 'AAC',
    sampleRate: 44100,
    channels: 2,
    bitRate: 128000,
    chunkSize: 2048,
    bufferSize: 8192
  }
};

// Función para obtener configuración según la plataforma
export function getAudioConfig(platform: string): AudioModeConfig {
  return AUDIO_CONFIGS[platform] || AUDIO_CONFIGS['web'];
}

// Función para determinar el modo automáticamente
export function getAutoAudioConfig(): AudioModeConfig {
  if (typeof window !== 'undefined') {
    // Web - usar proxy
    return AUDIO_CONFIGS['web'];
  } else {
    // React Native - usar directo
    return AUDIO_CONFIGS['android'];
  }
}

// Función para configurar URL del proxy
export function setProxyUrl(url: string): void {
  if (AUDIO_CONFIGS['web']) {
    AUDIO_CONFIGS['web'].proxyUrl = url;
  }
}

// Función para configurar timeouts
export function setTimeouts(direct: number, proxy: number): void {
  if (AUDIO_CONFIGS['android']) {
    AUDIO_CONFIGS['android'].directTimeout = direct;
  }
  if (AUDIO_CONFIGS['web']) {
    AUDIO_CONFIGS['web'].proxyTimeout = proxy;
  }
}

// Función para configurar calidad de audio
export function setAudioQuality(quality: 'low' | 'medium' | 'high'): void {
  const configs = {
    low: { codec: 'PCMU', sampleRate: 8000, channels: 1, bitRate: 64000 },
    medium: { codec: 'PCMU', sampleRate: 16000, channels: 1, bitRate: 128000 },
    high: { codec: 'AAC', sampleRate: 44100, channels: 2, bitRate: 256000 }
  };
  
  const config = configs[quality];
  
  Object.values(AUDIO_CONFIGS).forEach(platformConfig => {
    platformConfig.audioCodec = config.codec;
    platformConfig.sampleRate = config.sampleRate;
    platformConfig.channels = config.channels;
    platformConfig.bitRate = config.bitRate;
  });
}

// Función para validar configuración
export function validateAudioConfig(config: AudioModeConfig): boolean {
  if (!config.mode) return false;
  
  if (config.mode === 'proxy' && !config.proxyUrl) {
    console.warn('⚠️ Modo proxy requiere proxyUrl');
    return false;
  }
  
  if (config.mode === 'direct' && !config.directTimeout) {
    console.warn('⚠️ Modo directo requiere directTimeout');
    return false;
  }
  
  return true;
}

// Función para obtener configuración de debug
export function getDebugConfig(): any {
  return {
    platforms: Object.keys(AUDIO_CONFIGS),
    currentConfig: getAutoAudioConfig(),
    proxyUrl: AUDIO_CONFIGS['web']?.proxyUrl,
    timeouts: {
      direct: AUDIO_CONFIGS['android']?.directTimeout,
      proxy: AUDIO_CONFIGS['web']?.proxyTimeout
    }
  };
}
