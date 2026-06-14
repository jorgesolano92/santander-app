import { Alert, PermissionsAndroid, Platform } from 'react-native';

import type { IntercomConfig } from '@/components/IntercomConfigurationModal';

import IntercomBridgeService from '@/services/IntercomBridgeService';
import { getSdkCredentials } from '@/services/dvrSdkCredentials';

let activeDoorId: string | null = null;
let stateUnsubscribe: (() => void) | null = null;
let activeResolve: ((ok: boolean) => void) | null = null;

export function isBridgeIntercomActive(doorId?: string): boolean {
  if (!activeDoorId) return false;
  return doorId ? activeDoorId === doorId : true;
}

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (already) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Micrófono',
    message: 'La app necesita el micrófono para hablar por el intercomunicador.',
    buttonPositive: 'Permitir',
    buttonNegative: 'Cancelar',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function normalizeBridgeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
    return trimmed;
  }
  return `ws://${trimmed}`;
}

function waitForBridgeActive(timeoutMs = 15000): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      activeResolve = null;
      resolve(false);
    }, timeoutMs);

    activeResolve = (ok: boolean) => {
      clearTimeout(timer);
      activeResolve = null;
      resolve(ok);
    };
  });
}

export async function startBridgeIntercom(doorId: string, config: IntercomConfig): Promise<boolean> {
  if (!IntercomBridgeService.isAvailable()) {
    Alert.alert('Intercom puente', 'Solo disponible en la app Android compilada.');
    return false;
  }

  const bridgeUrl = normalizeBridgeUrl(config.bridgeUrl ?? '');
  if (!bridgeUrl) {
    Alert.alert('Intercom puente', 'Configura la URL del puente (ej. ws://192.168.1.10:8765).');
    return false;
  }

  if (activeDoorId && activeDoorId !== doorId) {
    Alert.alert('Intercom puente', 'Ya hay un intercom activo en otra puerta.');
    return false;
  }

  const micOk = await ensureMicPermission();
  if (!micOk) {
    Alert.alert('Intercom puente', 'Sin permiso de micrófono no se puede hablar.');
    return false;
  }

  const creds = getSdkCredentials(config);
  if (!creds.server) {
    Alert.alert('Intercom puente', 'No hay IP de cámara configurada.');
    return false;
  }

  const channel = config.voiceChannel ?? -1;

  if (stateUnsubscribe) {
    stateUnsubscribe();
    stateUnsubscribe = null;
  }

  stateUnsubscribe = IntercomBridgeService.addStateListener((event) => {
    console.log('[Bridge intercom]', event.state, event.message ?? '');
    if (event.state === 'active' && activeResolve) {
      activeResolve(true);
    }
    if (event.state === 'error' && activeResolve) {
      activeResolve(false);
    }
  });

  try {
    const waitPromise = waitForBridgeActive();
    const sdkPort = parseInt(String(creds.port), 10) || 9008;
    await IntercomBridgeService.connect({
      bridgeUrl,
      cameraIp: creds.server,
      sdkPort,
      username: creds.username,
      password: creds.password,
      channel,
      micAudioSource: config.bridgeMicSource ?? 'voice_communication',
    });

    const ok = await waitPromise;
    if (!ok) {
      await stopBridgeIntercom();
      Alert.alert(
        'Intercom puente',
        'No se pudo establecer la sesión con la cámara vía el PC industrial.\n\n' +
          'Comprueba que audio_bridge.py está en ejecución y que la tablet alcanza el puente ' +
          '(ZeroTier o LAN).',
      );
      return false;
    }

    activeDoorId = doorId;
    return true;
  } catch (e: any) {
    await stopBridgeIntercom();
    Alert.alert('Intercom puente', e?.message ?? 'Error al conectar con el puente.');
    return false;
  }
}

export async function stopBridgeIntercom(): Promise<void> {
  activeDoorId = null;
  if (activeResolve) {
    activeResolve(false);
    activeResolve = null;
  }
  if (stateUnsubscribe) {
    stateUnsubscribe();
    stateUnsubscribe = null;
  }
  try {
    await IntercomBridgeService.disconnect();
  } catch {
    // ignore
  }
}
