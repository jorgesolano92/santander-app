// Configuración específica para cámaras Safire
export interface SafireAudioConfig {
  // Configuración RTSP para audio
  rtspAudioPort: number;
  rtspAudioPath: string;
  
  // Configuración de audio
  audioCodec: 'PCMU' | 'PCMA' | 'G722' | 'AAC' | 'G711';
  sampleRate: 8000 | 16000 | 44100 | 48000;
  channels: 1 | 2;
  bitRate: number;
  
  // Configuración de red
  enableAudioStream: boolean;
  audioQuality: 'low' | 'medium' | 'high';
  
  // URLs de configuración
  audioConfigUrl: string;
  audioTestUrl: string;
}

// Configuraciones predefinidas para diferentes modelos de Safire
export const SAFIRE_AUDIO_CONFIGS: { [model: string]: SafireAudioConfig } = {
  'Safire-IP': {
    rtspAudioPort: 555,
    rtspAudioPath: '/audio',
    audioCodec: 'PCMU',
    sampleRate: 8000,
    channels: 1,
    bitRate: 64000,
    enableAudioStream: true,
    audioQuality: 'medium',
    audioConfigUrl: '/cgi-bin/audio_config.cgi',
    audioTestUrl: '/cgi-bin/audio_test.cgi',
  },
  'Safire-HD': {
    rtspAudioPort: 555,
    rtspAudioPath: '/audio',
    audioCodec: 'AAC',
    sampleRate: 44100,
    channels: 2,
    bitRate: 128000,
    enableAudioStream: true,
    audioQuality: 'high',
    audioConfigUrl: '/cgi-bin/audio_config.cgi',
    audioTestUrl: '/cgi-bin/audio_test.cgi',
  },
  'Safire-4K': {
    rtspAudioPort: 555,
    rtspAudioPath: '/audio',
    audioCodec: 'AAC',
    sampleRate: 48000,
    channels: 2,
    bitRate: 256000,
    enableAudioStream: true,
    audioQuality: 'high',
    audioConfigUrl: '/cgi-bin/audio_config.cgi',
    audioTestUrl: '/cgi-bin/audio_test.cgi',
  },
};

// Función para obtener configuración de audio basada en el modelo
export function getSafireAudioConfig(model: string = 'Safire-IP'): SafireAudioConfig {
  return SAFIRE_AUDIO_CONFIGS[model] || SAFIRE_AUDIO_CONFIGS['Safire-IP'];
}

// Función para construir URL RTSP de audio para Safire
export function buildSafireAudioRTSPUrl(
  cameraIP: string, 
  username: string, 
  password: string, 
  config: SafireAudioConfig
): string {
  const user = encodeURIComponent(username);
  const pass = encodeURIComponent(password);
  const auth = user && pass ? `${user}:${pass}@` : '';
  
  return `rtsp://${auth}${cameraIP}:${config.rtspAudioPort}${config.rtspAudioPath}`;
}

// Función para verificar soporte de audio en cámara Safire
export async function checkSafireAudioSupport(
  cameraIP: string,
  username: string,
  password: string
): Promise<{ supported: boolean; model?: string; config?: SafireAudioConfig }> {
  try {
    // Intentar detectar modelo de cámara
    const modelResponse = await fetch(`http://${cameraIP}/cgi-bin/device_info.cgi`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
      },
      timeout: 5000,
    });

    if (modelResponse.ok) {
      const deviceInfo = await modelResponse.json();
      const model = deviceInfo.model || 'Safire-IP';
      const config = getSafireAudioConfig(model);
      
      // Verificar soporte de audio
      const audioResponse = await fetch(`http://${cameraIP}${config.audioConfigUrl}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
        },
        timeout: 3000,
      });

      return {
        supported: audioResponse.ok,
        model,
        config: audioResponse.ok ? config : undefined,
      };
    }

    return { supported: false };
  } catch (error) {
    console.error('❌ Error verificando soporte de audio Safire:', error);
    return { supported: false };
  }
}

// Función para configurar audio en cámara Safire
export async function configureSafireAudio(
  cameraIP: string,
  username: string,
  password: string,
  config: SafireAudioConfig
): Promise<boolean> {
  try {
    const audioConfig = {
      enable_audio_stream: config.enableAudioStream,
      audio_codec: config.audioCodec,
      sample_rate: config.sampleRate,
      channels: config.channels,
      bit_rate: config.bitRate,
      audio_quality: config.audioQuality,
    };

    const response = await fetch(`http://${cameraIP}${config.audioConfigUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
      },
      body: JSON.stringify(audioConfig),
      timeout: 10000,
    });

    if (response.ok) {
      console.log('✅ Configuración de audio Safire aplicada correctamente');
      return true;
    } else {
      console.error('❌ Error aplicando configuración de audio:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error configurando audio Safire:', error);
    return false;
  }
}

// Función para probar envío de audio a cámara Safire
export async function testSafireAudioStream(
  cameraIP: string,
  username: string,
  password: string,
  config: SafireAudioConfig
): Promise<boolean> {
  try {
    const testData = {
      test_audio: true,
      codec: config.audioCodec,
      sample_rate: config.sampleRate,
    };

    const response = await fetch(`http://${cameraIP}${config.audioTestUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
      },
      body: JSON.stringify(testData),
      timeout: 5000,
    });

    return response.ok;
  } catch (error) {
    console.error('❌ Error probando stream de audio:', error);
    return false;
  }
}
