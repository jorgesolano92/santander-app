import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, PermissionsAndroid } from 'react-native';
import { Camera, Video, VideoOff, Wifi, WifiOff, Mic, MicOff } from 'lucide-react-native';
import { IntercomConfig } from './IntercomConfigurationModal';
import dvrSdkService from '@/services/DvrSdkService';

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

  useEffect(() => {
    return () => {
      // Evitar sesiones abiertas al cerrar el componente/modal.
      dvrSdkService.stopMicStreaming().catch(() => {});
      dvrSdkService.stopVoiceIntercom().catch(() => {});
      dvrSdkService.stopLivePreview().catch(() => {});
      dvrSdkService.logout().catch(() => {});
    };
  }, []);

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
            SDK conectado {isLiveActive ? '· LivePlay activo' : '· listo para LivePlay'}
          </Text>
        ) : (
          <Text style={styles.infoText}>Vista preparada para integrar preview/intercom por SDK nativo</Text>
        )}
      </View>

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
