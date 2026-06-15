import { Alert, PermissionsAndroid, Platform } from 'react-native';

import type { IntercomConfig } from '@/components/IntercomConfigurationModal';
import {
  buildCsipApiConfig,
  csipControlLed,
  csipStartCall,
  doorIdToCsipButton,
  isCsipApiConfigured,
  type CsipCallTargetType,
} from '@/services/csipApiClient';
import { isSipConfigured, sipService, type SipConfig } from '@/services/SipService';

let activeDoorId: string | null = null;

export function isSipIntercomActive(doorId?: string): boolean {
  if (!activeDoorId) return false;
  return doorId ? activeDoorId === doorId : true;
}

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (already) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Micrófono',
    message: 'La app necesita el micrófono para hablar por el intercomunicador SIP.',
    buttonPositive: 'Permitir',
    buttonNegative: 'Cancelar',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function buildSipConfig(config: IntercomConfig): SipConfig {
  return {
    sipUri: config.sipUri,
    sipUsername: config.sipUsername,
    sipPassword: config.sipPassword,
    sipDomain: config.sipDomain || '',
    enableTLS: config.enableTLS ?? false,
    sipServer: config.sipServer,
  };
}

function resolveCallTarget(config: IntercomConfig): {
  target_type: CsipCallTargetType;
  target?: string;
  user?: string;
} {
  const targetType = config.csipCallTargetType ?? 'default';
  if (targetType === 'default') {
    return { target_type: 'default' };
  }
  return {
    target_type: targetType,
    target: config.csipCallTarget?.trim() || undefined,
    user: config.csipCallUser?.trim() || config.sipUsername?.trim() || undefined,
  };
}

function missingSipSetupMessage(config: IntercomConfig): string {
  const parts: string[] = [];
  if (!isCsipApiConfigured(config)) {
    parts.push(
      'API CSIP: host, puerto y API key/token (cuando estén disponibles).',
    );
  }
  if (!isSipConfigured(buildSipConfig(config))) {
    parts.push('Cuenta SIP: URI, usuario, contraseña y dominio/servidor.');
  }
  return parts.join('\n\n');
}

/**
 * Modo SIP: dispara marcación en tarjeta CSIP (REST) y/o audio SIP en tablet (sip.js).
 * Listo para activar cuando tengáis credenciales; sin ellas muestra aviso claro.
 */
export async function startSipIntercom(doorId: string, config: IntercomConfig): Promise<boolean> {
  if (activeDoorId && activeDoorId !== doorId) {
    Alert.alert('Intercom SIP', 'Ya hay un intercom activo en otra puerta.');
    return false;
  }

  const hasCsip = isCsipApiConfigured(config);
  const hasSipClient = isSipConfigured(buildSipConfig(config));

  if (!hasCsip && !hasSipClient) {
    Alert.alert(
      'Intercom SIP — pendiente de accesos',
      'El modo SIP está preparado pero faltan credenciales:\n\n' +
        missingSipSetupMessage(config) +
        '\n\nMientras tanto puedes usar el modo Puente PC (audio_bridge.py).',
    );
    return false;
  }

  if (hasSipClient) {
    const micOk = await ensureMicPermission();
    if (!micOk) {
      Alert.alert('Intercom SIP', 'Sin permiso de micrófono no se puede hablar.');
      return false;
    }
  }

  try {
    if (hasCsip) {
      const apiConfig = buildCsipApiConfig(config);
      const callTarget = resolveCallTarget(config);
      const csipResult = await csipStartCall(apiConfig, {
        ...callTarget,
        recording: config.csipCallRecording ?? false,
      });
      console.log('[SIP intercom] CSIP call_start:', csipResult);

      try {
        await csipControlLed(apiConfig, {
          led: config.csipButtonId ?? doorIdToCsipButton(doorId),
          estado: 'ocupado',
        });
      } catch (ledError) {
        console.warn('[SIP intercom] LED ocupado no aplicado:', ledError);
      }
    }

    if (hasSipClient) {
      const sipConfig = buildSipConfig(config);
      if (!sipService.isServiceInitialized()) {
        const initialized = await sipService.initialize(sipConfig);
        if (!initialized) {
          throw new Error('No se pudo registrar la cuenta SIP en el servidor.');
        }
      }

      const remoteUri = config.sipCallDestination?.trim() || config.sipUri.trim();
      const callStarted = await sipService.startCall(remoteUri);
      if (!callStarted) {
        throw new Error('No se pudo iniciar la llamada SIP desde la tablet.');
      }
    } else if (hasCsip) {
      Alert.alert(
        'Intercom SIP (CSIP)',
        'Marcación remota enviada a la tarjeta CSIP.\n\n' +
          'El audio bidireccional en la tablet requiere además la cuenta SIP ' +
          '(URI, usuario, contraseña y servidor).',
      );
    }

    activeDoorId = doorId;
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    Alert.alert('Intercom SIP', message);
    return false;
  }
}

export async function stopSipIntercom(config?: IntercomConfig): Promise<void> {
  const doorId = activeDoorId;
  activeDoorId = null;

  try {
    await sipService.endCall();
  } catch {
    // ignore
  }

  if (config && isCsipApiConfigured(config) && doorId) {
    try {
      const apiConfig = buildCsipApiConfig(config);
      await csipControlLed(apiConfig, {
        led: config.csipButtonId ?? doorIdToCsipButton(doorId),
        estado: 'libre',
      });
    } catch (ledError) {
      console.warn('[SIP intercom] LED libre no aplicado:', ledError);
    }
  }
}
