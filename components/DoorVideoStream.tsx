import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import {
  Camera,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Maximize2,
} from 'lucide-react-native';
import { IntercomConfig } from './IntercomConfigurationModal';
import Hls from 'hls.js';

const PROXY_FETCH_TIMEOUT_MS = 12_000;
const RTSP_MAX_RETRIES = 8;
const RTSP_RETRY_DELAY_MS = 1200;
/** Altura reservada en ManualModeModal para el botón de puerta en pantalla completa */
export const VIDEO_FULLSCREEN_FOOTER_HEIGHT = 88;

interface DoorVideoStreamProps {
  intercomConfig: IntercomConfig;
  doorName: string;
  voiceOutboundOnly?: boolean;
  /** Pausa RTSP mientras el intercom SDK usa la cámara (evita timeout código 20). */
  suspendStream?: boolean;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Alto del área de vídeo en pantalla completa (px). */
  expandedVideoHeight?: number;
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

const RTSP_LIVE_BUFFER = {
  minBufferMs: 400,
  maxBufferMs: 2000,
  bufferForPlaybackMs: 200,
  bufferForPlaybackAfterRebufferMs: 400,
  backBufferDurationMs: 0,
};

function isStandardRtspPath(path?: string): boolean {
  const p = (path || '').trim().replace(/^\//, '').toLowerCase();
  return !p || p === 'profile1' || p === 'profile2';
}

/** Siempre substream (profile2) cuando la ruta es estándar — más fluido en tablet. */
function buildRtspUrl(config: IntercomConfig): string {
  const user = config.onvifUsername || 'admin';
  const pass = config.onvifPassword || '';
  const ip = (config.cameraIP || '').trim();
  const port = config.rtspPort || 554;
  const path = (config.rtspPath || '').trim().replace(/^\//, '');

  if (path && !isStandardRtspPath(config.rtspPath)) {
    return `rtsp://${user}:${pass}@${ip}:${port}/${path}`;
  }

  return `rtsp://${user}:${pass}@${ip}:${port}/profile2`;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

let NativeVideo: React.ComponentType<any> | null = null;
let BufferingStrategyType: { DISABLE_BUFFERING: string } | null = null;
if (Platform.OS === 'android') {
  try {
    const mod = require('react-native-video');
    NativeVideo = mod.default;
    BufferingStrategyType = mod.BufferingStrategyType;
  } catch {
    NativeVideo = null;
  }
}

export default function DoorVideoStream({
  intercomConfig,
  doorName,
  suspendStream = false,
  isExpanded = false,
  onExpandedChange,
  expandedVideoHeight,
}: DoorVideoStreamProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [ambientAudioOn, setAmbientAudioOn] = useState(intercomConfig.hasAudio !== false);
  const [playerSession, setPlayerSession] = useState(0);
  const [proxyStreamUrl, setProxyStreamUrl] = useState<string | null>(null);
  const [proxyActive, setProxyActive] = useState(false);
  const videoElementRef = useRef<any>(null);
  const hlsInstanceRef = useRef<any>(null);
  const connectedRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rtspUrl = useMemo(() => buildRtspUrl(intercomConfig), [intercomConfig]);
  const useAndroidRtsp = Platform.OS === 'android';
  const useWebProxy = Platform.OS === 'web';
  const proxyBaseUrl = (intercomConfig.proxyUrl || 'http://localhost:3001').replace(/\/+$/, '');

  const inlineVideoHeight = 200;
  const window = Dimensions.get('window');
  const fullscreenVideoHeight = expandedVideoHeight ?? window.height;

  const cameraId = useMemo(
    () => `${doorName.replace(/\s+/g, '_').toLowerCase()}_${intercomConfig.cameraIP || 'camera'}`,
    [doorName, intercomConfig.cameraIP]
  );

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const markConnected = useCallback(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;
    retryCountRef.current = 0;
    setConnectionState('connected');
    setError(null);
  }, []);

  const scheduleRtspRetry = useCallback(
    (reason: string) => {
      if (!streamActive) return;
      connectedRef.current = false;
      if (retryCountRef.current >= RTSP_MAX_RETRIES) {
        setError(reason);
        setConnectionState('error');
        setStreamActive(false);
        return;
      }
      retryCountRef.current += 1;
      setConnectionState('connecting');
      setError(`Reconectando… (${retryCountRef.current}/${RTSP_MAX_RETRIES})`);
      clearRetryTimer();
      retryTimerRef.current = setTimeout(() => {
        if (streamActive) {
          setPlayerSession((n) => n + 1);
        }
      }, RTSP_RETRY_DELAY_MS);
    },
    [streamActive, clearRetryTimer]
  );

  useEffect(() => {
    return () => {
      clearRetryTimer();
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [clearRetryTimer]);

  useEffect(() => {
    if (!useWebProxy || !proxyStreamUrl) {
      return;
    }

    const setupWebHls = async () => {
      const video = videoElementRef.current;
      if (!video) return;

      if (Hls.isSupported()) {
        if (hlsInstanceRef.current) {
          hlsInstanceRef.current.destroy();
        }
        const hls = new Hls({
          lowLatencyMode: false,
          liveSyncDurationCount: 5,
          maxBufferLength: 20,
          backBufferLength: 30,
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
              return;
            }
            setError(`Error HLS: ${data.details || data.type}`);
          }
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
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [proxyStreamUrl, useWebProxy]);

  const startAndroidRtsp = () => {
    if (!intercomConfig.cameraIP) {
      setError('No hay IP de cámara configurada');
      setConnectionState('error');
      return;
    }
    if (!NativeVideo) {
      setError('Reproductor no disponible. Recompila la app Android.');
      setConnectionState('error');
      return;
    }
    clearRetryTimer();
    connectedRef.current = false;
    retryCountRef.current = 0;
    setPlayerSession((n) => n + 1);
    setConnectionState('connecting');
    setError(null);
    setStreamActive(true);
  };

  const stopAndroidRtsp = () => {
    clearRetryTimer();
    connectedRef.current = false;
    retryCountRef.current = 0;
    onExpandedChange?.(false);
    setStreamActive(false);
    setConnectionState('idle');
    setError(null);
  };

  useEffect(() => {
    if (suspendStream && streamActive) {
      stopAndroidRtsp();
    }
  }, [suspendStream, streamActive]);

  const enterExpanded = () => {
    if (!isConnected || !streamActive) return;
    onExpandedChange?.(true);
  };

  const exitExpanded = () => {
    onExpandedChange?.(false);
  };

  const onNativeVideoLoad = () => {
    markConnected();
  };

  const onNativeVideoProgress = (e?: { currentTime?: number }) => {
    if ((e?.currentTime ?? 0) > 0) {
      markConnected();
    }
  };

  const onNativeVideoBuffer = (e?: { isBuffering?: boolean }) => {
    if (e?.isBuffering === false) {
      markConnected();
    }
  };

  const onNativeVideoError = (ev?: any) => {
    const code = ev?.error?.errorCode ?? ev?.error?.code;
    const detail = ev?.error?.errorString || ev?.error?.localizedDescription || '';
    const msg = `RTSP interrumpido${code != null ? ` (${code})` : ''}${detail ? `: ${detail}` : ''}`;
    scheduleRtspRetry(msg);
  };

  const onNativePlaybackStateChanged = (e?: { isPlaying?: boolean; isSeeking?: boolean }) => {
    if (e?.isPlaying) {
      markConnected();
    }
  };

  const startProxyStream = async () => {
    try {
      setConnectionState('connecting');
      setError(null);
      const configureResp = await fetchWithTimeout(
        `${proxyBaseUrl}/configure-camera/${encodeURIComponent(cameraId)}`,
        {
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
        }
      );
      if (!configureResp.ok) {
        throw new Error(`Proxy config falló (${configureResp.status})`);
      }

      const startResp = await fetchWithTimeout(
        `${proxyBaseUrl}/start-stream/${encodeURIComponent(cameraId)}`
      );
      if (!startResp.ok) {
        throw new Error(`No se pudo iniciar stream proxy (${startResp.status})`);
      }
      const startData = await startResp.json();
      const hlsPath = startData?.hlsUrl || `/hls/${cameraId}/stream.m3u8`;
      const resolvedHlsUrl = `${proxyBaseUrl}${hlsPath}`;

      let isReady = false;
      for (let i = 0; i < 8; i += 1) {
        try {
          const probeResp = await fetchWithTimeout(resolvedHlsUrl, { method: 'GET' });
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
        throw new Error('El playlist HLS aún no está disponible');
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
      await fetchWithTimeout(`${proxyBaseUrl}/stop-stream/${encodeURIComponent(cameraId)}`);
    } catch {
      // ignore
    }
    setProxyActive(false);
    setProxyStreamUrl(null);
    setConnectionState('idle');
  };

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';
  const showAndroidPlayer = useAndroidRtsp && streamActive && !!NativeVideo;
  const showAmbientAudioToggle =
    showAndroidPlayer && isConnected && intercomConfig.hasAudio !== false && !isExpanded;

  const androidAudioTrack = ambientAudioOn
    ? undefined
    : { type: 'disabled' as const };

  const activeVideoHeight = isExpanded ? fullscreenVideoHeight : inlineVideoHeight;

  const videoHostStyle: StyleProp<ViewStyle> = isExpanded
    ? [styles.previewBoxExpanded, { height: activeVideoHeight, width: '100%' }]
    : [styles.previewBox, showAndroidPlayer && styles.previewBoxActive];

  const nativeVideoStyle: StyleProp<ViewStyle> = isExpanded
    ? { width: '100%', height: activeVideoHeight, backgroundColor: '#000', alignSelf: 'stretch' }
    : { width: '100%', height: activeVideoHeight, backgroundColor: '#000' };

  return (
    <View style={[styles.container, isExpanded && styles.containerExpanded]}>
      <View style={videoHostStyle} collapsable={false}>
        {showAndroidPlayer ? (
          <>
            {NativeVideo && (
              <NativeVideo
                key={`${rtspUrl}-${playerSession}`}
                source={{
                  uri: rtspUrl,
                  type: 'rtsp',
                  bufferConfig: RTSP_LIVE_BUFFER,
                }}
                style={nativeVideoStyle}
                resizeMode="contain"
                paused={suspendStream}
                muted={suspendStream || !ambientAudioOn}
                volume={suspendStream || !ambientAudioOn ? 0 : 1.0}
                selectedAudioTrack={suspendStream ? { type: 'disabled' as const } : androidAudioTrack}
                ignoreSilentSwitch="ignore"
                playInBackground={false}
                controls={false}
                useTextureView={false}
                bufferingStrategy={BufferingStrategyType?.DISABLE_BUFFERING}
                progressUpdateInterval={250}
                onLoad={onNativeVideoLoad}
                onReadyForDisplay={onNativeVideoLoad}
                onProgress={onNativeVideoProgress}
                onBuffer={onNativeVideoBuffer}
                onPlaybackStateChanged={onNativePlaybackStateChanged}
                onError={onNativeVideoError}
              />
            )}
            {isConnected && !isExpanded && (
              <TouchableOpacity
                style={styles.expandOverlay}
                onPress={enterExpanded}
                accessibilityLabel="Pantalla completa"
              >
                <Maximize2 size={22} color="#FFF" />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Camera size={30} color="#6C757D" />
            <Text style={styles.title}>Cámara {doorName}</Text>
            <Text style={styles.subtitle}>{intercomConfig.cameraIP || 'Sin IP'}</Text>
            <Text style={styles.infoText}>
              {useAndroidRtsp
                ? 'RTSP directo (TCP) · vídeo y audio ambiente'
                : 'Proxy HLS para pruebas en navegador'}
            </Text>
          </>
        )}
      </View>

      {!isExpanded && useWebProxy && (
        <View style={styles.webVideoContainer}>
          {proxyStreamUrl ? (
            React.createElement('video', {
              ref: videoElementRef,
              controls: true,
              autoPlay: true,
              muted: !ambientAudioOn,
              playsInline: true,
              preload: 'auto',
              onLoadedMetadata: (ev: any) => {
                ev?.currentTarget?.play?.().catch(() => {});
              },
              onError: () => setError('El navegador no pudo reproducir HLS'),
              style: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#000' },
            })
          ) : (
            <Text style={styles.infoText}>Pulsa Iniciar vídeo para cargar el stream.</Text>
          )}
        </View>
      )}

      {!isExpanded && (
        <>
          <View style={styles.statusRow}>
            {isConnected ? <Wifi size={14} color="#28A745" /> : <WifiOff size={14} color="#DC3545" />}
            <Text style={[styles.statusText, { color: isConnected ? '#28A745' : '#DC3545' }]}>
              {isConnected ? 'EN VIVO' : isConnecting ? 'CONECTANDO...' : 'DETENIDO'}
            </Text>
          </View>

          {!!error && <Text style={styles.errorText}>• {error}</Text>}

          {useAndroidRtsp && (
            <>
              <View style={styles.controls}>
                <TouchableOpacity
                  style={[styles.button, styles.liveButton, (isConnecting || streamActive) && styles.disabled]}
                  onPress={startAndroidRtsp}
                  disabled={isConnecting || streamActive}
                >
                  {isConnecting && !isConnected ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Video size={16} color="#FFF" />
                  )}
                  <Text style={styles.buttonText}>INICIAR VÍDEO</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.stopButton, !streamActive && styles.disabled]}
                  onPress={stopAndroidRtsp}
                  disabled={!streamActive}
                >
                  <VideoOff size={16} color="#FFF" />
                  <Text style={styles.buttonText}>DETENER</Text>
                </TouchableOpacity>
              </View>

              {showAmbientAudioToggle && (
                <View style={styles.controls}>
                  <TouchableOpacity
                    style={[styles.button, ambientAudioOn ? styles.audioOnButton : styles.audioOffButton]}
                    onPress={() => setAmbientAudioOn((v) => !v)}
                  >
                    {ambientAudioOn ? <Volume2 size={16} color="#FFF" /> : <VolumeX size={16} color="#FFF" />}
                    <Text style={styles.buttonText}>
                      {ambientAudioOn ? 'AUDIO AMBIENTE ON' : 'AUDIO AMBIENTE OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {useWebProxy && (
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.button, styles.liveButton, (isConnecting || proxyActive) && styles.disabled]}
                onPress={startProxyStream}
                disabled={isConnecting || proxyActive}
              >
                {isConnecting ? <ActivityIndicator color="#FFF" /> : <Video size={16} color="#FFF" />}
                <Text style={styles.buttonText}>INICIAR VÍDEO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.stopButton, !proxyActive && styles.disabled]}
                onPress={stopProxyStream}
                disabled={!proxyActive}
              >
                <VideoOff size={16} color="#FFF" />
                <Text style={styles.buttonText}>DETENER</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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
  containerExpanded: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  previewBox: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
    padding: 12,
    overflow: 'hidden',
  },
  previewBoxActive: {
    minHeight: 200,
    padding: 0,
    backgroundColor: '#000',
  },
  previewBoxExpanded: {
    alignSelf: 'stretch',
    width: '100%',
    flex: 1,
    padding: 0,
    backgroundColor: '#000',
    borderRadius: 0,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandOverlay: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    padding: 10,
    zIndex: 20,
    elevation: 20,
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
    paddingHorizontal: 8,
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
  liveButton: {
    backgroundColor: '#007BFF',
  },
  stopButton: {
    backgroundColor: '#495057',
  },
  audioOnButton: {
    backgroundColor: '#17A2B8',
  },
  audioOffButton: {
    backgroundColor: '#6C757D',
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
