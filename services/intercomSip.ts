import { Alert, PermissionsAndroid, Platform } from 'react-native';

import type { IntercomConfig } from '@/components/IntercomConfigurationModal';
import { INTERCOM_BRIDGE_ONLY } from '@/config/intercomFeatures';
import {
  buildCsipApiConfig,
  csipControlLed,
  csipStartCall,
  doorIdToCsipButton,
  isCsipApiConfigured,
} from '@/services/csipApiClient';
import { isSipConfigured, sipService, type SipConfig } from '@/services/SipService';
import { withTabletSipAccount } from '@/services/tabletSipAccount';

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

function missingSipSetupMessage(config: IntercomConfig): string {
  const parts: string[] = [];
  if (!isCsipApiConfigured(config)) {
    parts.push('Intercomunicador: host CSIP y API key.');
  }
  if (!isSipConfigured(buildSipConfig(config))) {
    parts.push('Cuenta SIP de la tablet (configuración general): extensión, contraseña y centralita.');
  }
  return parts.join('\n\n');
}

/**
 * La tablet marca por SIP (WebSocket) a la extensión del intercomunicador.
 * Con extensión de destino no se llama call_start (evita una segunda pata que deja el
 * audio abierto al colgar); sin ella, call_start hace que la placa marque su destino.
 */
export async function startSipIntercom(doorId: string, doorConfig: IntercomConfig): Promise<boolean> {
  if (activeDoorId && activeDoorId !== doorId) {
    Alert.alert('Intercom SIP', 'Ya hay un intercom activo en otra puerta.');
    return false;
  }

  const config = withTabletSipAccount(doorConfig);
  const hasCsip = isCsipApiConfigured(config);
  const hasSipClient = isSipConfigured(buildSipConfig(config));

  if (!hasCsip && !hasSipClient) {
    Alert.alert(
      'Intercom SIP — faltan datos',
      'El modo SIP está preparado pero faltan datos:\n\n' + missingSipSetupMessage(config),
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

  const destination = config.sipCallDestination?.trim() || '';
  const shouldCsipCallStart = hasCsip && !(hasSipClient && destination);

  try {
    if (hasCsip) {
      const apiConfig = buildCsipApiConfig(config);
      if (shouldCsipCallStart) {
        try {
          const csipResult = await csipStartCall(apiConfig, { target_type: 'default' });
          console.log('[SIP intercom] CSIP call_start:', csipResult);
        } catch (csipError) {
          if (!hasSipClient) {
            throw csipError;
          }
          console.warn('[SIP intercom] CSIP call_start falló; continuo con SIP:', csipError);
        }
      }

      // El LED no debe retrasar el audio: se envía en paralelo a la llamada SIP.
      void csipControlLed(apiConfig, {
        led: config.csipButtonId ?? doorIdToCsipButton(doorId),
        estado: 'ocupado',
      }).catch((ledError) => {
        console.warn('[SIP intercom] LED ocupado no aplicado:', ledError);
      });
    }

    if (hasSipClient) {
      try {
        const initialized = await sipService.ensureReady(buildSipConfig(config));
        if (!initialized) {
          throw new Error('No se pudo registrar la cuenta SIP en el servidor.');
        }
      } catch (sipError: unknown) {
        const detail = sipError instanceof Error ? sipError.message : String(sipError);
        throw new Error(
          detail.includes('SIP no registrado')
            ? detail
            : `No se pudo registrar la cuenta SIP en el servidor. ${detail}`,
        );
      }

      if (!destination) {
        throw new Error('Falta la extensión del intercomunicador en la configuración de la puerta.');
      }
      const callStarted = await sipService.startCall(destination);
      if (!callStarted) {
        throw new Error('No se pudo iniciar la llamada SIP desde la tablet.');
      }
    } else {
      Alert.alert(
        'Intercom SIP (CSIP)',
        'Marcación remota enviada al intercomunicador.\n\n' +
          'Para hablar desde la tablet falta la cuenta SIP de la tablet en la configuración general.',
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

/**
 * Deja la cuenta SIP conectada y registrada antes de pulsar intercom, para no abrir
 * el WebSocket en el momento de la llamada. Sin avisos: los fallos se reintentan solos.
 */
export function warmUpSipIntercom(doors: { enabled?: boolean; intercom?: IntercomConfig }[]): void {
  if (INTERCOM_BRIDGE_ONLY) return;
  const intercom = doors
    .filter((door) => door.enabled && door.intercom?.intercomMode === 'sip')
    .map((door) => withTabletSipAccount(door.intercom as IntercomConfig))
    .find((ic) => isSipConfigured(buildSipConfig(ic)));
  if (!intercom) return;
  sipService.ensureReady(buildSipConfig(intercom), { silent: true }).catch((error) => {
    console.warn('[SIP intercom] Precarga SIP fallida (se reintentará):', error);
  });
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
