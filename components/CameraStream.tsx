import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Alert } from 'react-native';
import { Play, Pause, Square, Camera } from 'lucide-react-native';
import Video from 'react-native-video';
import { getProxyBaseUrl, getUseServerProxy } from '../services/AppMode';
import { downloadCameraSnapshotDirect } from '../services/SnapshotService';

interface CameraConfig {
  ip: string;
  rtspPort: number;
  videoProfile: string;
  username: string;
  password: string;
}

interface CameraStreamProps {
  style?: any;
  onSnapshot?: () => void;
  cameraConfig?: CameraConfig;
  hideControls?: boolean;
  onError?: (error: string) => void;
  onStart?: () => void;
  onSuccess?: () => void;
}

export interface CameraStreamRef {
  startStream: () => void;
  stopStream: () => void;
  getSnapshot: () => void;
}

const CameraStream = forwardRef<CameraStreamRef, CameraStreamProps>(({ style, onSnapshot, cameraConfig, hideControls = false, onError, onStart, onSuccess }, ref) => {
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);

  // Exponer métodos al componente padre
  useImperativeHandle(ref, () => ({
    startStream,
    stopStream,
    getSnapshot
  }));

  // Cargar hls.js dinámicamente para React Native Web
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      document.head.appendChild(script);
    }
  }, []);

  // Proxy base url and mode
  const [proxyBaseUrl, setProxyBaseUrl] = useState<string>('http://localhost:3001');
  const [useServerProxy, setUseServerProxy] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const [base, useProxy] = await Promise.all([getProxyBaseUrl(), getUseServerProxy()]);
      setProxyBaseUrl(base);
      setUseServerProxy(useProxy);
      checkStreamStatus(base);
    })();
  }, []);

  // Generar URLs dinámicas basadas en la configuración de la cámara
  const getCameraId = () => {
    if (!cameraConfig?.ip) return 'default';
    return cameraConfig.ip.replace(/\./g, '_');
  };

  const getStreamUrls = (base?: string) => {
    const cameraId = getCameraId();
    const b = base || proxyBaseUrl;
    return {
      status: `${b}/stream-status/${cameraId}`,
      start: `${b}/start-stream/${cameraId}`,
      stop: `${b}/stop-stream/${cameraId}`,
      hls: `${b}/hls/${cameraId}/stream.m3u8`,
      snapshot: `${b}/camera/${cameraId}`
    };
  };

  const checkStreamStatus = async (base?: string) => {
    try {
      const urls = getStreamUrls(base);
      const response = await fetch(urls.status);
      const data = await response.json();
      setStreamStatus(data);
      
      if (data.isRunning) {
        setIsStreamActive(true);
        loadHLSStream();
      }
    } catch (error) {
      console.log('No se pudo verificar el estado del stream');
    }
  };

  const configureCameraOnServer = async () => {
    if (!cameraConfig?.ip) return true; // Si no hay configuración, usar default
    
    try {
      const cameraId = getCameraId();
      const response = await fetch(`${proxyBaseUrl}/configure-camera/${cameraId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cameraConfig)
      });
      
      if (response.ok) {
        console.log(`✅ Cámara ${cameraId} configurada en el servidor`);
        return true;
      } else {
        console.error(`❌ Error configurando cámara ${cameraId}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error configurando cámara en el servidor:', error);
      return false;
    }
  };

  const startStream = async () => {
    try {
      setIsLoading(true);
      setError(null);
      onStart?.();
      
      if (!useServerProxy) {
        if (Platform.OS === 'android') {
          const cam = cameraConfig;
          const user = encodeURIComponent(cam?.username || '');
          const pass = encodeURIComponent(cam?.password || '');
          const auth = user && pass ? `${user}:${pass}@` : '';
          const host = cam?.ip || '0.0.0.0';
          const port = cam?.rtspPort || 554;
          const path = cam?.videoProfile || cam?.ip ? (cam as any).rtspPath || 'Streaming/Channels/101' : 'Streaming/Channels/101';
          const rtspUrl = `rtsp://${auth}${host}:${port}/${path}`;
          // En modo directo con video nativo no usamos HLS; señalamos activo
          setIsStreamActive(true);
          setError(null);
          setIsLoading(false);
          onSuccess?.();
          return;
        } else {
          const msg = 'Modo directo soportado solo en Android';
          setError(msg);
          onError?.(msg);
          setIsLoading(false);
          return;
        }
      }

      // Configurar la cámara en el servidor antes de iniciar el stream
      const configured = await configureCameraOnServer();
      if (!configured) {
        const errorMsg = 'Error configurando la cámara en el servidor';
        setError(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
        return;
      }
      
      // Iniciar el proceso de conversión en el servidor
      const urls = getStreamUrls();
      const response = await fetch(urls.start);
      const data = await response.json();
      
      if (data.status === 'ok') {
        // Esperar más tiempo para que FFmpeg genere los archivos
        console.log('⏳ Esperando que FFmpeg genere los segmentos...');
        setTimeout(() => {
          console.log('🎬 Intentando cargar stream después del delay');
          loadHLSStream();
        }, 5000); // Aumentar a 5 segundos
      } else {
        const errorMsg = 'Error al iniciar stream: ' + data.message;
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (error) {
      const errorMsg = 'Error al iniciar stream: ' + (error as Error).message;
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const stopStream = async () => {
    try {
      const urls = getStreamUrls();
      const response = await fetch(urls.stop);
      const data = await response.json();
      
      if (data.status === 'ok') {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        
        if (videoRef.current) {
          videoRef.current.src = '';
        }
        
        setIsStreamActive(false);
        setError(null);
      } else {
        setError('Error al detener stream: ' + data.message);
      }
    } catch (error) {
      setError('Error al detener stream: ' + (error as Error).message);
    }
  };

  const loadHLSStream = () => {
    if (typeof window === 'undefined') return;
    
    const video = videoRef.current;
    if (!video) return;

    const urls = getStreamUrls();
    const videoSrc = urls.hls;
    
    if ((window as any).Hls && (window as any).Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      
      const hls = new (window as any).Hls();
      hlsRef.current = hls;
      
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      
      hls.on((window as any).Hls.Events.MANIFEST_PARSED, function() {
        setIsStreamActive(true);
        setError(null);
        onSuccess?.();
      });
      
      hls.on((window as any).Hls.Events.ERROR, function(event: any, data: any) {
        console.error('❌ Error HLS:', data);
        if (data.fatal) {
          if (data.details === 'manifestLoadError') {
            setTimeout(() => {
              loadHLSStream();
            }, 3000);
          } else {
            setError('Error fatal en el stream: ' + data.details);
            setIsStreamActive(false);
          }
        }
      });
      
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari nativo
      video.src = videoSrc;
      video.addEventListener('loadedmetadata', function() {
        setIsStreamActive(true);
        setError(null);
      });
    } else {
      // setError('Tu navegador no soporta HLS');
    }
  };

  const getSnapshot = async () => {
    try {
      if (useServerProxy) {
        const cameraId = getCameraId();
        const link = `${proxyBaseUrl}/camera/snapshot/${cameraId}`;
        if (typeof window !== 'undefined') {
          window.open(link, '_blank');
        }
      } else {
        if (Platform.OS === 'android') {
          const cam = cameraConfig;
          if (!cam?.ip) throw new Error('No hay IP configurada');
          const uri = await downloadCameraSnapshotDirect({
            ip: cam.ip,
            username: cam.username,
            password: cam.password,
            snapshotPath: (cam as any).snapshotPath,
          });
          if (!uri) throw new Error('No se pudo descargar la captura');
          Alert.alert('Éxito', 'Captura guardada en la galería');
        } else {
          Alert.alert('Info', 'Captura directa solo en Android');
        }
      }
      if (onSnapshot) onSnapshot();
    } catch (error) {
      setError('Error al obtener captura: ' + (error as Error).message);
    }
  };

  const getRTSPUrl = () => {
    const cam = cameraConfig;
    const user = encodeURIComponent(cam?.username || '');
    const pass = encodeURIComponent(cam?.password || '');
    const auth = user && pass ? `${user}:${pass}@` : '';
    const host = cam?.ip || '0.0.0.0';
    const port = cam?.rtspPort || 554;
    const path = cam?.videoProfile || (cam as any).rtspPath || 'Streaming/Channels/101';
    return `rtsp://${auth}${host}:${port}/${path}`;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.videoContainer}>
        {typeof window !== 'undefined' ? (
          <video
            ref={videoRef}
            style={styles.video}
            controls
            autoPlay
            muted
            playsInline
          >
            Tu navegador no soporta la reproducción de video.
          </video>
        ) : isStreamActive && !useServerProxy ? (
          <Video
            source={{ uri: getRTSPUrl() }}
            style={styles.video}
            controls={true}
            resizeMode="contain"
            onError={(error) => {
              console.error('Error en Video:', error);
              setError('Error reproduciendo video: ' + JSON.stringify(error));
              setIsStreamActive(false);
            }}
            onLoad={() => {
              console.log('Video cargado correctamente');
              setError(null);
            }}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {isStreamActive ? 'Cargando stream...' : 'Presiona Iniciar para ver el stream'}
            </Text>
          </View>
        )}
      </View>

      {!hideControls && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, isStreamActive && styles.controlButtonActive]}
            onPress={isStreamActive ? stopStream : startStream}
            disabled={isLoading}
          >
            {isStreamActive ? (
              <Square size={20} color="#FFFFFF" />
            ) : (
              <Play size={20} color="#FFFFFF" />
            )}
            <Text style={styles.controlButtonText}>
              {isLoading ? 'Cargando...' : isStreamActive ? 'Detener' : 'Iniciar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.snapshotButton]}
            onPress={getSnapshot}
          >
            <Camera size={20} color="#FFFFFF" />
            <Text style={styles.controlButtonText}>Captura</Text>
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          📹 Stream en vivo de la cámara SAFIRE
        </Text>
        <Text style={styles.infoSubtext}>
          {isStreamActive ? 'Stream activo' : 'Stream inactivo'}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  videoContainer: {
    width: '100%',
    // height: 240,
    height: 'auto',
    backgroundColor: '#000000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    position: 'relative',
    // top: -10,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E9ECEF',
  },
  placeholderText: {
    color: '#6C757D',
    fontSize: 14,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#495057',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  controlButtonActive: {
    backgroundColor: '#DC3545',
  },
  snapshotButton: {
    backgroundColor: '#17A2B8',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#F8D7DA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
  },
  errorText: {
    color: '#721C24',
    fontSize: 12,
    fontWeight: '500',
  },
  infoContainer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  infoText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoSubtext: {
    color: '#6C757D',
    fontSize: 12,
  },
});

export default CameraStream;
