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

function isP2pSignaling(config: IntercomConfig): boolean {
  return (config.sipSignaling ?? 'pbx') === 'p2p';
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
  if (isP2pSignaling(config)) {
    const peer =
      config.sipP2pPeerIp?.trim() ||
      config.csipCallTarget?.trim() ||
      '';
    return {
      target_type: 'ip',
      target: peer || undefined,
      user: config.csipCallUser?.trim() || undefined,
    };
  }

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
    parts.push('API CSIP: host, puerto y API key/token (cuando estén disponibles).');
  }
  if (isP2pSignaling(config)) {
    const peer = config.sipP2pPeerIp?.trim() || config.csipCallTarget?.trim();
    if (!peer) {
      parts.push('P2P: IP del peer SIP (softphone u otra extensión por IP).');
    }
  } else if (!isSipConfigured(buildSipConfig(config))) {
    parts.push('Cuenta SIP: URI, usuario, contraseña y dominio/servidor.');
  }
  return parts.join('\n\n');
}

/**
 * Modo SIP: PBX (sip.js WS) y/o P2P (CSIP call_start target_type=ip, como Panphone modo IP).
 *
 * PBX con sipCallDestination: solo marca la tablet → extensión Panphone (.80=101 / .70=100).
 * No se llama call_start (evitar segunda pata que deja el audio abierto al colgar).
 */
export async function startSipIntercom(doorId: string, config: IntercomConfig): Promise<boolean> {
  if (activeDoorId && activeDoorId !== doorId) {
    Alert.alert('Intercom SIP', 'Ya hay un intercom activo en otra puerta.');
    return false;
  }

  const p2p = isP2pSignaling(config);
  const hasCsip = isCsipApiConfigured(config);
  const hasSipClient = !p2p && isSipConfigured(buildSipConfig(config));
  const callTarget = resolveCallTarget(config);

  if (p2p) {
    if (!hasCsip) {
      Alert.alert(
        'Intercom P2P',
        'Falta la API CSIP (host + API key) para enviar call_start a Panphone.',
      );
      return false;
    }
    if (!callTarget.target) {
      Alert.alert(
        'Intercom P2P',
        'Indica la IP del peer SIP (softphone Linphone u otra IP que acepte SIP UDP).',
      );
      return false;
    }
  } else if (!hasCsip && !hasSipClient) {
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

  // PBX + tablet marca al Panphone (sipCallDestination): no usar call_start.
  // call_start haría que la placa marque su destino por defecto (p.ej. RG 200 u otra
  // extensión) en paralelo → dos llamadas, acoplamiento .80/.70 y colgado incompleto.
  const tabletDialsPanphone =
    !p2p && hasSipClient && Boolean(config.sipCallDestination?.trim());
  const shouldCsipCallStart = hasCsip && (p2p || !tabletDialsPanphone);

  try {
    if (hasCsip) {
      const apiConfig = buildCsipApiConfig(config);
      if (shouldCsipCallStart) {
        try {
          const csipResult = await csipStartCall(apiConfig, {
            ...callTarget,
            recording: config.csipCallRecording ?? false,
          });
          console.log('[SIP intercom] CSIP call_start:', csipResult, p2p ? '(P2P)' : '(PBX)');
        } catch (csipError) {
          // En PBX el audio va por SIP; un fallo CSIP no debe tumbar toda la llamada.
          if (p2p || !hasSipClient) {
            throw csipError;
          }
          console.warn('[SIP intercom] CSIP call_start falló; continuo con SIP:', csipError);
        }
      } else {
        console.log(
          '[SIP intercom] PBX: omito call_start; la tablet marca',
          config.sipCallDestination?.trim(),
        );
      }

      // El LED no debe retrasar el audio: se envía en paralelo a la llamada SIP.
      void csipControlLed(apiConfig, {
        led: config.csipButtonId ?? doorIdToCsipButton(doorId),
        estado: 'ocupado',
      }).catch((ledError) => {
        console.warn('[SIP intercom] LED ocupado no aplicado:', ledError);
      });
    }

    if (p2p) {
      Alert.alert(
        'Intercom P2P',
        `Marcación enviada a Panphone → SIP UDP ${callTarget.target}` +
          (callTarget.user ? ` (user ${callTarget.user})` : '') +
          '.\n\n' +
          'Esta tablet no termina audio SIP UDP (sip.js usa WebSocket). ' +
          'Contesta en el softphone del peer o usa señalización PBX para audio en la app.',
      );
      activeDoorId = doorId;
      return true;
    }

    if (hasSipClient) {
      const sipConfig = buildSipConfig(config);
      if (!sipService.isServiceInitialized()) {
        try {
          const initialized = await sipService.initialize(sipConfig);
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
      }

      const remoteUri = config.sipCallDestination?.trim() || config.sipUri.trim();
      try {
        const callStarted = await sipService.startCall(remoteUri);
        if (!callStarted) {
          throw new Error('No se pudo iniciar la llamada SIP desde la tablet.');
        }
      } catch (callError: unknown) {
        const detail = callError instanceof Error ? callError.message : String(callError);
        throw new Error(detail);
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
    Alert.alert(p2p ? 'Intercom P2P' : 'Intercom SIP', message);
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
