import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, PermissionsAndroid } from 'react-native';
import { Camera, Video, VideoOff, Wifi, WifiOff, Mic, MicOff } from 'lucide-react-native';
import { IntercomConfig } from './IntercomConfigurationModal';
import dvrSdkService from '@/services/DvrSdkService';
import Hls from 'hls.js';

interface DoorVideoStreamProps {
  intercomConfig: IntercomConfig;
  doorName: string;
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

/**
 * Vista de cámara basada SOLO en SDK nativo.
 * Nota: en esta fase inicial se valida disponibilidad del SDK + login.
 * El render de video nativo se conectará en el siguiente paso (SurfaceView/TextureView del módulo nativo).
 */
export default function DoorVideoStream({ intercomConfig, doorName }: DoorVideoStreamProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<string | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [liveHandle, setLiveHandle] = useState<number | null>(null);
  const [voiceHandle, setVoiceHandle] = useState<number | null>(null);
  const [proxyStreamUrl, setProxyStreamUrl] = useState<string | null>(null);
  const [proxyActive, setProxyActive] = useState(false);
  const videoElementRef = useRef<any>(null);
  const hlsInstanceRef = useRef<any>(null);

  const cameraId = useMemo(
    () => `${doorName.replace(/\s+/g, '_').toLowerCase()}_${intercomConfig.cameraIP || 'camera'}`,
    [doorName, intercomConfig.cameraIP]
  );
  const proxyBaseUrl = (intercomConfig.proxyUrl || 'http://localhost:3001').replace(/\/+$/, '');
  const webConfiguredMode = intercomConfig.videoConnectionMode || 'proxy';
  const effectiveMode: 'sdk' | 'proxy' = Platform.OS === 'android' ? 'sdk' : webConfiguredMode;

  useEffect(() => {
    return () => {
      // Evitar sesiones abiertas al cerrar el componente/modal.
      dvrSdkService.stopMicStreaming().catch(() => {});
      dvrSdkService.stopVoiceIntercom().catch(() => {});
      dvrSdkService.stopLivePreview().catch(() => {});
      dvrSdkService.logout().catch(() => {});
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !proxyStreamUrl) {
      return;
    }
    let isCancelled = false;

    const setupWebHls = async () => {
      const video = videoElementRef.current;
      if (!video) return;

      // Chrome/Edge requieren hls.js para m3u8; Safari puede reproducir nativo.
      if (Hls.isSupported()) {
        if (hlsInstanceRef.current) {
          hlsInstanceRef.current.destroy();
        }
        const hls = new Hls({
          lowLatencyMode: false,
          liveSyncDurationCount: 5,
          maxBufferLength: 20,
          backBufferLength: 30,
          maxLiveSyncPlaybackRate: 1.0,
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data?.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
              setError('HLS red inestable, reintentando...');
              return;
            }
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
              setError('HLS media error, recuperando...');
              return;
            }
            setError(`HLS fatal: ${data.type || 'unknown'} (${data.details || 'sin detalle'})`);
          }
        });
        hls.on(Hls.Events.BUFFER_STALLED, () => {
          setError('Buffer detenido, reanudando stream...');
          hls.startLoad();
        });
        hlsInstanceRef.current = hls;
        hls.loadSource(proxyStreamUrl);
        hls.attachMedia(video);
      } else if (typeof video.canPlayType === 'function' && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = proxyStreamUrl;
      } else {
        setError('Este navegador no soporta HLS.');
      }
    };

    setupWebHls();

    return () => {
      isCancelled = true;
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [proxyStreamUrl]);

  const startProxyStream = async () => {
    try {
      setConnectionState('connecting');
      setError(null);
      const configureResp = await fetch(`${proxyBaseUrl}/configure-camera/${encodeURIComponent(cameraId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: intercomConfig.cameraIP,
          rtspPort: intercomConfig.rtspPort || 554,
          videoProfile: intercomConfig.videoProfile || 'MainStream',
          username: intercomConfig.onvifUsername || 'admin',
          password: intercomConfig.onvifPassword || '',
          rtspPath: intercomConfig.rtspPath || '',
          snapshotPath: intercomConfig.snapshotPath || '',
        }),
      });
      if (!configureResp.ok) {
        throw new Error(`Proxy config falló (${configureResp.status})`);
      }

      const startResp = await fetch(`${proxyBaseUrl}/start-stream/${encodeURIComponent(cameraId)}`);
      if (!startResp.ok) {
        throw new Error(`No se pudo iniciar stream proxy (${startResp.status})`);
      }
      const startData = await startResp.json();
      const hlsPath = startData?.hlsUrl || `/hls/${cameraId}/stream.m3u8`;

      const resolvedHlsUrl = `${proxyBaseUrl}${hlsPath}`;

      // Evitar ORB/errores de media cuando el playlist aún no existe en disco.
      let isReady = false;
      for (let i = 0; i < 8; i += 1) {
        try {
          const probeResp = await fetch(resolvedHlsUrl, { method: 'GET' });
          if (probeResp.ok) {
            isReady = true;
            break;
          }
        } catch {
          // reintento
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!isReady) {
        throw new Error('El stream se inició pero el playlist HLS aún no está disponible');
      }

      setProxyStreamUrl(resolvedHlsUrl);
      setProxyActive(true);
      setConnectionState('connected');
    } catch (e: any) {
      setError(e?.message || 'No se pudo iniciar stream por proxy');
      setConnectionState('error');
    }
  };

  const stopProxyStream = async () => {
    try {
      await fetch(`${proxyBaseUrl}/stop-stream/${encodeURIComponent(cameraId)}`);
    } catch {
      // No bloquear limpieza visual si el proxy no responde.
    }
    setProxyActive(false);
    setProxyStreamUrl(null);
    setConnectionState('idle');
  };

  const connectSdk = async () => {
    if (!intercomConfig.cameraIP) {
      setError('No hay IP de cámara configurada');
      setConnectionState('error');
      return;
    }

    try {
      setConnectionState('connecting');
      setError(null);
      setDeviceInfo(null);

      if (!dvrSdkService.isAvailable()) {
        throw new Error(
          Platform.OS === 'android'
            ? 'Módulo nativo DVR no disponible. Verifica prebuild/dev-client y registro del package.'
            : 'El SDK DVR solo funciona en Android.'
        );
      }

      await dvrSdkService.initialize();
      await dvrSdkService.login({
        server: intercomConfig.cameraIP,
        port: String(intercomConfig.httpPort || 80),
        username: intercomConfig.onvifUsername || 'admin',
        password: intercomConfig.onvifPassword || '',
      });

      const info = await dvrSdkService.getDeviceInfo();
      setDeviceInfo(`${info.deviceName} · CH:${info.videoInputNum} · FW:${info.firmwareVersion}`);
      setConnectionState('connected');
    } catch (e: any) {
      setError(e?.message || 'No se pudo conectar con el SDK');
      setConnectionState('error');
    }
  };

  const disconnectSdk = async () => {
    try {
      await dvrSdkService.stopVoiceIntercom().catch(() => false);
      await dvrSdkService.stopMicStreaming().catch(() => false);
      await dvrSdkService.stopLivePreview().catch(() => false);
      await dvrSdkService.logout();
      setConnectionState('idle');
      setDeviceInfo(null);
      setError(null);
      setIsLiveActive(false);
      setIsVoiceActive(false);
      setLiveHandle(null);
      setVoiceHandle(null);
      setIsTalking(false);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cerrar sesión');
      setConnectionState('error');
    }
  };

  const startLivePreview = async () => {
    try {
      const handle = await dvrSdkService.startLivePreview({ channel: 0, streamType: 1 });
      setLiveHandle(handle);
      setIsLiveActive(true);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'No se pudo iniciar live preview');
    }
  };

  const stopLivePreview = async () => {
    try {
      await dvrSdkService.stopLivePreview();
      setIsLiveActive(false);
      setLiveHandle(null);
    } catch (e: any) {
      setError(e?.message || 'No se pudo detener live preview');
    }
  };

  const startVoiceIntercom = async () => {
    try {
      const handle = await dvrSdkService.startVoiceIntercom({ channel: 0 });
      setVoiceHandle(handle);
      setIsVoiceActive(true);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'No se pudo iniciar intercom de voz');
    }
  };

  const stopVoiceIntercom = async () => {
    try {
      await dvrSdkService.stopMicStreaming().catch(() => false);
      await dvrSdkService.stopVoiceIntercom();
      setIsVoiceActive(false);
      setVoiceHandle(null);
      setIsTalking(false);
    } catch (e: any) {
      setError(e?.message || 'No se pudo detener intercom de voz');
    }
  };

  const toggleTalk = async () => {
    try {
      if (!isVoiceActive) {
        setError('Primero inicia el intercom');
        return;
      }
      if (isTalking) {
        await dvrSdkService.stopMicStreaming();
        setIsTalking(false);
        return;
      }

      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        setError('Permiso de micrófono denegado');
        return;
      }

      await dvrSdkService.startMicStreaming();
      setIsTalking(true);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'No se pudo activar el envío de micrófono');
    }
  };

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  return (
    <View style={styles.container}>
      <View style={styles.previewBox}>
        <Camera size={30} color="#6C757D" />
        <Text style={styles.title}>Cámara {doorName}</Text>
        <Text style={styles.subtitle}>{intercomConfig.cameraIP || 'Sin IP configurada'}</Text>

        {isConnected ? (
          <Text style={styles.okText}>
            {effectiveMode === 'sdk'
              ? `SDK conectado ${isLiveActive ? '· LivePlay activo' : '· listo para LivePlay'}`
              : 'Proxy conectado · stream HLS activo'}
          </Text>
        ) : (
          <Text style={styles.infoText}>
            {effectiveMode === 'sdk'
              ? 'Vista preparada para integrar preview/intercom por SDK nativo'
              : 'Modo proxy web para pruebas rápidas de video y audio ambiente'}
          </Text>
        )}
      </View>

      {Platform.OS === 'web' && effectiveMode === 'proxy' && (
        <View style={styles.webVideoContainer}>
          {proxyStreamUrl ? (
            React.createElement('video', {
              ref: videoElementRef,
              controls: true,
              autoPlay: true,
              muted: true,
              playsInline: true,
              preload: 'auto',
              onLoadedMetadata: (e: any) => {
                const media = e?.currentTarget;
                if (media?.play) {
                  media.play().catch(() => {});
                }
              },
              onError: () => {
                setError('El navegador no pudo reproducir el stream HLS');
              },
              style: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#000' },
            })
          ) : (
            <Text style={styles.infoText}>Inicia el proxy para visualizar la cámara en el navegador.</Text>
          )}
        </View>
      )}

      <View style={styles.statusRow}>
        {isConnected ? <Wifi size={14} color="#28A745" /> : <WifiOff size={14} color="#DC3545" />}
        <Text style={[styles.statusText, { color: isConnected ? '#28A745' : '#DC3545' }]}>
          {isConnected ? 'CONECTADO' : connectionState === 'connecting' ? 'CONECTANDO...' : 'DESCONECTADO'}
        </Text>
      </View>

      {!!deviceInfo && <Text style={styles.deviceInfo}>{deviceInfo}</Text>}
      {liveHandle ? <Text style={styles.deviceInfo}>Live handle: {liveHandle}</Text> : null}
      {voiceHandle ? <Text style={styles.deviceInfo}>Voice handle: {voiceHandle}</Text> : null}
      {!!error && <Text style={styles.errorText}>• {error}</Text>}

      {effectiveMode === 'sdk' ? (
        <>
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.button, styles.connectButton, isConnecting && styles.disabled]}
              onPress={connectSdk}
              disabled={isConnecting}
            >
              {isConnecting ? <ActivityIndicator color="#FFF" /> : <Video size={16} color="#FFF" />}
              <Text style={styles.buttonText}>CONECTAR SDK</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.disconnectButton, !isConnected && styles.disabled]}
              onPress={disconnectSdk}
              disabled={!isConnected}
            >
              <VideoOff size={16} color="#FFF" />
              <Text style={styles.buttonText}>DESCONECTAR</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.button, styles.liveButton, (!isConnected || isLiveActive) && styles.disabled]}
              onPress={startLivePreview}
              disabled={!isConnected || isLiveActive}
            >
              <Video size={16} color="#FFF" />
              <Text style={styles.buttonText}>INICIAR LIVE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.stopLiveButton, !isLiveActive && styles.disabled]}
              onPress={stopLivePreview}
              disabled={!isLiveActive}
            >
              <VideoOff size={16} color="#FFF" />
              <Text style={styles.buttonText}>DETENER LIVE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.button, styles.voiceButton, (!isConnected || isVoiceActive) && styles.disabled]}
              onPress={startVoiceIntercom}
              disabled={!isConnected || isVoiceActive}
            >
              <Mic size={16} color="#FFF" />
              <Text style={styles.buttonText}>INICIAR INTERCOM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.stopVoiceButton, !isVoiceActive && styles.disabled]}
              onPress={stopVoiceIntercom}
              disabled={!isVoiceActive}
            >
              <MicOff size={16} color="#FFF" />
              <Text style={styles.buttonText}>DETENER INTERCOM</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.button, isTalking ? styles.talkOnButton : styles.talkOffButton, !isVoiceActive && styles.disabled]}
              onPress={toggleTalk}
              disabled={!isVoiceActive}
            >
              {isTalking ? <MicOff size={16} color="#FFF" /> : <Mic size={16} color="#FFF" />}
              <Text style={styles.buttonText}>{isTalking ? 'DEJAR DE HABLAR' : 'HABLAR'}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.button, styles.liveButton, (isConnecting || proxyActive) && styles.disabled]}
            onPress={startProxyStream}
            disabled={isConnecting || proxyActive}
          >
            {isConnecting ? <ActivityIndicator color="#FFF" /> : <Video size={16} color="#FFF" />}
            <Text style={styles.buttonText}>INICIAR PROXY</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.stopLiveButton, !proxyActive && styles.disabled]}
            onPress={stopProxyStream}
            disabled={!proxyActive}
          >
            <VideoOff size={16} color="#FFF" />
            <Text style={styles.buttonText}>DETENER PROXY</Text>
          </TouchableOpacity>
        </View>
      )}
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
    padding: 10,
  },
  previewBox: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
    padding: 12,
  },
  webVideoContainer: {
    marginTop: 10,
    width: '100%',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DEE2E6',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#343A40',
    marginTop: 6,
  },
  subtitle: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#6C757D',
    marginTop: 8,
    textAlign: 'center',
  },
  okText: {
    fontSize: 11,
    color: '#28A745',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deviceInfo: {
    marginTop: 6,
    fontSize: 10,
    color: '#495057',
  },
  errorText: {
    marginTop: 6,
    fontSize: 10,
    color: '#DC3545',
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  connectButton: {
    backgroundColor: '#28A745',
  },
  disconnectButton: {
    backgroundColor: '#6C757D',
  },
  liveButton: {
    backgroundColor: '#007BFF',
  },
  stopLiveButton: {
    backgroundColor: '#495057',
  },
  voiceButton: {
    backgroundColor: '#17A2B8',
  },
  stopVoiceButton: {
    backgroundColor: '#6F42C1',
  },
  talkOnButton: {
    backgroundColor: '#DC3545',
  },
  talkOffButton: {
    backgroundColor: '#20C997',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
