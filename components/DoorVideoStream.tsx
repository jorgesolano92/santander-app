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
  /** Detiene RTSP solo en intercom SDK nativo (misma sesión cámara). No aplica en modo puente. */
  suspendStream?: boolean;
  /** Silencia audio ambiente RTSP con intercom activo (vídeo sigue; audio va por el intercom). */
  muteAmbientDuringIntercom?: boolean;
  /** Fuerza mute permanente (sin audio ambiente ni toggles). */
  forceMuted?: boolean;
  /** Arranca el stream RTSP inline al montar (sin pulsar iniciar). */
  autoStartInline?: boolean;
  /** Alto del vídeo en modo inline (px). */
  inlineHeight?: number;
  /** Oculta botones de control (iniciar/audio/expandir). */
  hideControls?: boolean;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Alto del área de vídeo en pantalla completa (px). */
  expandedVideoHeight?: number;
  /** Acciones encima del vídeo (p. ej. Abrir puerta), junto a pantalla completa. */
  videoOverlay?: React.ReactNode;
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
  muteAmbientDuringIntercom = false,
  forceMuted = false,
  autoStartInline = false,
  inlineHeight,
  hideControls = false,
  isExpanded = false,
  onExpandedChange,
  expandedVideoHeight,
  videoOverlay,
}: DoorVideoStreamProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [ambientAudioOn, setAmbientAudioOn] = useState(
    forceMuted ? false : intercomConfig.hasAudio !== false,
  );
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

  const inlineVideoHeight = inlineHeight ?? 200;
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

  const startAndroidRtsp = useCallback(() => {
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
  }, [intercomConfig.cameraIP, clearRetryTimer]);

  const stopAndroidRtsp = useCallback(() => {
    clearRetryTimer();
    connectedRef.current = false;
    retryCountRef.current = 0;
    onExpandedChange?.(false);
    setStreamActive(false);
    setConnectionState('idle');
    setError(null);
  }, [clearRetryTimer, onExpandedChange]);

  /** Pantalla completa directa (videoportero): no hay botón INICIAR VÍDEO visible. */
  useEffect(() => {
    if (!isExpanded || !useAndroidRtsp || suspendStream || streamActive) return;
    if (!intercomConfig.cameraIP?.trim()) return;
    startAndroidRtsp();
  }, [
    isExpanded,
    useAndroidRtsp,
    suspendStream,
    streamActive,
    startAndroidRtsp,
    intercomConfig.cameraIP,
  ]);

  useEffect(() => {
    if (forceMuted) setAmbientAudioOn(false);
  }, [forceMuted]);

  useEffect(() => {
    if (suspendStream && streamActive) {
      stopAndroidRtsp();
    }
  }, [suspendStream, streamActive, stopAndroidRtsp]);

  // La cámara TVT suele expulsar RTSP al abrir StartVoiceCom_MR en el PC.
  // Cuando el intercom queda activo, forzamos una reconexión limpia del vídeo.
  const intercomRtspBumpRef = useRef(false);
  useEffect(() => {
    if (muteAmbientDuringIntercom && streamActive) {
      if (!intercomRtspBumpRef.current) {
        intercomRtspBumpRef.current = true;
        clearRetryTimer();
        retryCountRef.current = 0;
        const timer = setTimeout(() => {
          if (streamActive) {
            connectedRef.current = false;
            setConnectionState('connecting');
            setError(null);
            setPlayerSession((n) => n + 1);
          }
        }, 600);
        return () => clearTimeout(timer);
      }
      return;
    }
    intercomRtspBumpRef.current = false;
  }, [muteAmbientDuringIntercom, streamActive, clearRetryTimer]);

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

  /** Arranque automático en modo inline (visualización / carga cajero / overlays). */
  useEffect(() => {
    if (!autoStartInline || isExpanded || suspendStream) return;
    if (!intercomConfig.cameraIP?.trim()) return;
    if (useAndroidRtsp && !streamActive && connectionState === 'idle') {
      startAndroidRtsp();
      return;
    }
    if (useWebProxy && !proxyActive && connectionState === 'idle') {
      void startProxyStream();
    }
  }, [
    autoStartInline,
    isExpanded,
    useAndroidRtsp,
    useWebProxy,
    suspendStream,
    streamActive,
    proxyActive,
    connectionState,
    startAndroidRtsp,
    intercomConfig.cameraIP,
  ]);

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';
  const showAndroidPlayer = useAndroidRtsp && streamActive && !!NativeVideo;
  const showWebPlayer = useWebProxy && !!proxyStreamUrl;
  const showAmbientAudioToggle =
    !hideControls &&
    !forceMuted &&
    showAndroidPlayer &&
    isConnected &&
    intercomConfig.hasAudio !== false &&
    !isExpanded;

  const rtspAudioMuted =
    forceMuted || suspendStream || muteAmbientDuringIntercom || !ambientAudioOn;

  const activeVideoHeight = isExpanded ? fullscreenVideoHeight : inlineVideoHeight;

  const videoHostStyle: StyleProp<ViewStyle> = isExpanded
    ? [styles.previewBoxExpanded, { height: activeVideoHeight, width: '100%' }]
    : [
        styles.previewBox,
        { height: activeVideoHeight },
        (showAndroidPlayer || showWebPlayer) && styles.previewBoxActive,
      ];

  const nativeVideoStyle: StyleProp<ViewStyle> = isExpanded
    ? { width: '100%', height: activeVideoHeight, backgroundColor: '#000', alignSelf: 'stretch' }
    : { width: '100%', height: activeVideoHeight, backgroundColor: '#000' };

  const startInline = () => {
    if (useAndroidRtsp) startAndroidRtsp();
    else if (useWebProxy) void startProxyStream();
  };

  return (
    <View style={[styles.container, isExpanded && styles.containerExpanded, hideControls && styles.containerCompact]}>
      {!isExpanded ? (
        <View style={styles.compactHeader}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {doorName}
          </Text>
          <Text style={styles.compactIp} numberOfLines={1}>
            {intercomConfig.cameraIP || 'Sin IP'}
          </Text>
        </View>
      ) : null}

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
                muted={rtspAudioMuted}
                volume={rtspAudioMuted ? 0 : 1.0}
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
          </>
        ) : showWebPlayer ? (
          React.createElement('video', {
            ref: videoElementRef,
            controls: false,
            autoPlay: true,
            muted: true,
            playsInline: true,
            preload: 'auto',
            onLoadedMetadata: (ev: any) => {
              ev?.currentTarget?.play?.().catch(() => {});
            },
            onError: () => setError('El navegador no pudo reproducir HLS'),
            style: { width: '100%', height: '100%', backgroundColor: '#000' },
          })
        ) : (
          <TouchableOpacity
            style={styles.idleTap}
            onPress={startInline}
            disabled={isConnecting}
            activeOpacity={0.85}
          >
            {isConnecting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Video size={28} color="#ADB5BD" />
            )}
            <Text style={styles.idleTapText}>
              {isConnecting ? 'Conectando…' : 'Toca para iniciar vídeo'}
            </Text>
            {!!error ? <Text style={styles.idleError}>{error}</Text> : null}
          </TouchableOpacity>
        )}

        {!isExpanded && (videoOverlay || (isConnected && !hideControls && onExpandedChange)) ? (
          <View style={styles.videoOverlayBar} pointerEvents="box-none">
            {videoOverlay}
            {isConnected && !hideControls && onExpandedChange ? (
              <TouchableOpacity
                style={styles.expandOverlay}
                onPress={enterExpanded}
                accessibilityLabel="Pantalla completa"
              >
                <Maximize2 size={22} color="#FFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>

      {!isExpanded && !hideControls && (
        <>
          <View style={styles.statusRow}>
            {isConnected || showWebPlayer ? (
              <Wifi size={14} color="#28A745" />
            ) : (
              <WifiOff size={14} color="#DC3545" />
            )}
            <Text
              style={[
                styles.statusText,
                { color: isConnected || showWebPlayer ? '#28A745' : '#DC3545' },
              ]}
            >
              {isConnected || showWebPlayer
                ? 'EN VIVO'
                : isConnecting
                  ? 'CONECTANDO...'
                  : 'DETENIDO'}
            </Text>
          </View>

          {useAndroidRtsp && (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    padding: 6,
    overflow: 'hidden',
  },
  containerCompact: {
    padding: 0,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  containerExpanded: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#212529',
  },
  compactTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  compactIp: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ADB5BD',
  },
  previewBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 0,
    padding: 0,
    overflow: 'hidden',
  },
  previewBoxActive: {
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
  idleTap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  idleTapText: {
    fontSize: 12,
    color: '#ADB5BD',
    textAlign: 'center',
  },
  idleError: {
    marginTop: 4,
    fontSize: 11,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  expandOverlay: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 8,
    padding: 10,
  },
  videoOverlayBar: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
    elevation: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
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
