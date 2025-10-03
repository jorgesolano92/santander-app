import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Play, Square, Camera, Wifi, WifiOff } from 'lucide-react-native';
import { IntercomConfig } from './IntercomConfigurationModal';

interface DoorVideoStreamProps {
  intercomConfig: IntercomConfig;
  doorName: string;
}

export default function DoorVideoStream({ intercomConfig, doorName }: DoorVideoStreamProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const [hlsUrl, setHlsUrl] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);

  // Verificar estado de la cámara al montar
  useEffect(() => {
    if (intercomConfig.cameraIP) {
      setCameraStatus('online');
      setStreamError(null);
    } else {
      setCameraStatus('offline');
      setStreamError('No hay IP de cámara configurada');
    }
  }, [intercomConfig.cameraIP]);

  // Verificar periódicamente si el archivo HLS está disponible
  useEffect(() => {
    if (!isStreaming || !hlsUrl) return;

    const checkHLSFile = async () => {
      try {
        const response = await fetch(hlsUrl, { method: 'HEAD' });
        if (response.ok) {
          setStreamError(null);
        } else {
          console.log(`⏳ Esperando archivo HLS: ${hlsUrl}`);
          setStreamError('Generando stream...');
        }
      } catch (error) {
        console.log(`⏳ Archivo HLS no disponible aún: ${hlsUrl}`);
        setStreamError('Generando stream...');
      }
    };

    // Verificar inmediatamente
    checkHLSFile();

    // Verificar cada 2 segundos
    const interval = setInterval(checkHLSFile, 2000);

    return () => clearInterval(interval);
  }, [isStreaming, hlsUrl]);

  // Cargar hls.js en web (CDN) una sola vez
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).Hls) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // Inicializar reproducción HLS cuando esté listo el stream
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isStreaming || !hlsUrl) return;
    if (streamError === 'Generando stream...') return;

    const video = videoRef.current;
    if (!video) return;

    const setupPlayback = () => {
      if ((window as any).Hls && (window as any).Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        const hls = new (window as any).Hls();
        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
          setStreamError(null);
          try { video.play().catch(() => {}); } catch {}
        });
        hls.on((window as any).Hls.Events.ERROR, (_evt: any, data: any) => {
          if (data?.fatal) {
            setStreamError('Error en el stream HLS');
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Soporte nativo (Safari)
        video.src = hlsUrl;
        video.addEventListener('loadedmetadata', () => {
          try { video.play().catch(() => {}); } catch {}
        }, { once: true });
      } else {
        // Si hls.js aún no cargó, reintentar cuando cargue el script
        const retry = () => {
          if ((window as any).Hls) {
            setupPlayback();
            document.removeEventListener('hlsjs-loaded', retry as any);
          }
        };
        document.addEventListener('hlsjs-loaded', retry as any, { once: true });
      }
    };

    // Si el script ya está, configurar de inmediato; si no, esperar a onload
    if ((window as any).Hls) {
      setupPlayback();
    } else {
      // Marcar evento personalizado cuando cargue el script
      const scripts = Array.from(document.getElementsByTagName('script'));
      const hlsScript = scripts.find(s => (s.src || '').includes('hls.js')) as HTMLScriptElement | undefined;
      if (hlsScript) {
        hlsScript.addEventListener('load', () => {
          const evt = new Event('hlsjs-loaded');
          document.dispatchEvent(evt);
        }, { once: true });
      }
    }

    return () => {
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }
      if (videoRef.current) {
        try { videoRef.current.src = ''; } catch {}
      }
    };
  }, [isStreaming, hlsUrl, streamError]);

  const checkCameraStatus = async () => {
    if (!intercomConfig.cameraIP) {
      setCameraStatus('offline');
      setStreamError('No hay IP de cámara configurada');
      return;
    }

    // Si hay IP configurada, asumir que está disponible
    setCameraStatus('online');
    setStreamError(null);
  };

  const startStream = async () => {
    if (!intercomConfig.cameraIP) {
      Alert.alert('Error', 'No hay IP de cámara configurada');
      return;
    }

    setIsLoading(true);
    setStreamError(null);

    try {
      console.log(`🚀 Iniciando stream para ${doorName}...`);
      console.log(`📹 Configuración:`, {
        ip: intercomConfig.cameraIP,
        rtspPort: intercomConfig.rtspPort,
        videoProfile: intercomConfig.rtspPath || intercomConfig.videoProfile,
        username: intercomConfig.onvifUsername,
      });

      // Primero configurar la cámara en el backend
      const configResponse = await fetch(`http://localhost:3001/configure-camera/${doorName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ip: intercomConfig.cameraIP,
          rtspPort: intercomConfig.rtspPort,
          videoProfile: intercomConfig.rtspPath || intercomConfig.videoProfile,
          username: intercomConfig.onvifUsername,
          password: intercomConfig.onvifPassword,
        }),
      });

      if (!configResponse.ok) {
        const errorText = await configResponse.text();
        console.error('❌ Error configurando cámara:', errorText);
        throw new Error(`Error configurando cámara: ${errorText}`);
      }

      console.log(`✅ Cámara ${doorName} configurada correctamente`);

      // Esperar un momento para que la configuración se procese
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Luego iniciar el stream RTSP a HLS
      const streamResponse = await fetch(`http://localhost:3001/start-stream/${doorName}`, {
        method: 'GET',
      });

      if (streamResponse.ok) {
        const streamData = await streamResponse.json();
        console.log(`✅ Stream iniciado para ${doorName}:`, streamData);
        
        // Usar la URL HLS que viene del backend
        const fullHlsUrl = `http://localhost:3001${streamData.hlsUrl}`;
        console.log(`🎬 URL HLS del backend: ${fullHlsUrl}`);
        console.log(`📁 Carpeta IP: ${streamData.ipFolder}`);
        
        setHlsUrl(fullHlsUrl);
        setIsStreaming(true);
        setCameraStatus('online');
        setStreamError(null);
        
        console.log(`⏳ FFmpeg está iniciando, esperando generación de archivos HLS...`);
        console.log(`📁 Los archivos se crearán en: proxy/hls/${streamData.ipFolder}/`);
      } else {
        const errorText = await streamResponse.text();
        console.error('❌ Error iniciando stream:', errorText);
        throw new Error(`Error iniciando stream: ${errorText}`);
      }
    } catch (error: any) {
      console.error('❌ Error iniciando stream:', error);
      setStreamError(`Error: ${error.message || error}`);
      setCameraStatus('offline');
      Alert.alert('Error', `No se pudo iniciar el stream de video: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const stopStream = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:3001/stop-stream/${doorName}`, {
        method: 'GET',
      });

      if (response.ok) {
        setIsStreaming(false);
        console.log(`✅ Stream detenido para ${doorName}`);
        // Limpieza del reproductor
        if (hlsRef.current) {
          try { hlsRef.current.destroy(); } catch {}
          hlsRef.current = null;
        }
        if (videoRef.current) {
          try { videoRef.current.src = ''; } catch {}
        }
      }
    } catch (error) {
      console.error('❌ Error deteniendo stream:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const takeSnapshot = async () => {
    if (!intercomConfig.cameraIP) {
      Alert.alert('Error', 'No hay IP de cámara configurada');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/camera/${doorName}`, {
        method: 'GET',
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Captura tomada correctamente');
        console.log(`✅ Captura tomada para ${doorName}`);
      } else {
        throw new Error('Error tomando captura');
      }
    } catch (error) {
      console.error('❌ Error tomando captura:', error);
      Alert.alert('Error', 'No se pudo tomar la captura');
    }
  };

  const getStatusColor = () => {
    switch (cameraStatus) {
      case 'online': return '#28A745';
      case 'offline': return '#DC3545';
      default: return '#6C757D';
    }
  };

  const getStatusIcon = () => {
    switch (cameraStatus) {
      case 'online': return <Wifi size={16} color="#28A745" />;
      case 'offline': return <WifiOff size={16} color="#DC3545" />;
      default: return <Wifi size={16} color="#6C757D" />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Video Stream Area */}
      <View style={styles.videoContainer}>
        {isStreaming ? (
          <View style={styles.videoPlayer}>
            {streamError === 'Generando stream...' ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>⏳ Generando stream...</Text>
                <Text style={styles.loadingSubtext}>Esperando archivos HLS</Text>
              </View>
            ) : (
              <>
                {typeof window !== 'undefined' ? (
                  <video
                    ref={videoRef}
                    style={styles.videoElement as any}
                    controls
                    autoPlay
                    muted
                    playsInline
                  >
                    Tu navegador no soporta la reproducción de video.
                  </video>
                ) : (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Reproductor no disponible</Text>
                  </View>
                )}
              </>
            )}
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Camera size={32} color="#6C757D" />
            <Text style={styles.placeholderText}>Cámara {doorName}</Text>
            <Text style={styles.placeholderSubtext}>
              {intercomConfig.cameraIP || 'Sin configuración'}
            </Text>
          </View>
        )}
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        {getStatusIcon()}
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {cameraStatus.toUpperCase()}
        </Text>
        {streamError && (
          <Text style={styles.errorText}>• {streamError}</Text>
        )}
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        {!isStreaming ? (
          <TouchableOpacity
            style={[styles.controlButton, styles.startButton]}
            onPress={startStream}
            disabled={isLoading || cameraStatus === 'offline'}
          >
            <Play size={16} color="#FFFFFF" />
            <Text style={styles.controlButtonText}>
              {isLoading ? 'INICIANDO...' : 'INICIAR STREAM'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton]}
            onPress={stopStream}
            disabled={isLoading}
          >
            <Square size={16} color="#FFFFFF" />
            <Text style={styles.controlButtonText}>
              {isLoading ? 'DETENIENDO...' : 'DETENER STREAM'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.controlButton, styles.snapshotButton]}
          onPress={takeSnapshot}
          disabled={cameraStatus === 'offline'}
        >
          <Camera size={16} color="#FFFFFF" />
          <Text style={styles.controlButtonText}>CAPTURA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  videoContainer: {
    height: 200,
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  videoPlayer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  videoElement: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
  },
  streamingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#28A745',
    padding: 16,
  },
  streamingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  streamingUrl: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  streamingInfo: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 4,
    textAlign: 'center',
  },
  openBrowserButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  openBrowserButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C757D',
    marginTop: 8,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#ADB5BD',
    marginTop: 4,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  errorText: {
    fontSize: 10,
    color: '#DC3545',
    marginLeft: 8,
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  startButton: {
    backgroundColor: '#28A745',
  },
  stopButton: {
    backgroundColor: '#DC3545',
  },
  snapshotButton: {
    backgroundColor: '#007BFF',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});