import { Alert, PermissionsAndroid, Platform } from 'react-native';

import type { IntercomConfig } from '@/components/IntercomConfigurationModal';

import DvrSdkService from '@/services/DvrSdkService';

import { getSdkCredentials } from '@/services/dvrSdkCredentials';

import { getSdkErrorLabel } from '@/services/sdkErrorLabels';



let activeDoorId: string | null = null;



export function isSdkIntercomActive(doorId?: string): boolean {

  if (!activeDoorId) return false;

  return doorId ? activeDoorId === doorId : true;

}



async function ensureMicPermission(): Promise<boolean> {

  if (Platform.OS !== 'android') return false;



  const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);

  if (already) return true;



  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {

    title: 'Micrófono',

    message: 'La app necesita el micrófono para hablar por el intercomunicador de la cámara.',

    buttonPositive: 'Permitir',

    buttonNegative: 'Cancelar',

  });



  return result === PermissionsAndroid.RESULTS.GRANTED;

}



/** Libera sesión SDK por completo (logout + cleanup). Evita bloquear el canal de voz en la cámara. */

export async function releaseSdkSession(): Promise<void> {

  if (!DvrSdkService.isAvailable()) return;



  try {

    await DvrSdkService.stopMicStreaming();

  } catch {

    // ignore

  }



  try {

    await DvrSdkService.stopVoiceIntercom();

  } catch {

    // ignore

  }



  try {

    await DvrSdkService.stopLivePreview();

  } catch {

    // ignore

  }



  try {

    await DvrSdkService.logout();

  } catch {

    // ignore

  }

  // No llamar cleanup() aquí: Cleanup nativo solo una vez por ciclo de vida; doble llamada crashea la app.

  await new Promise((resolve) => setTimeout(resolve, 800));

}



/** Sesión nueva como test_audio.py: Init → Login → StartVoiceCom. */

async function ensureFreshSdkSession(config: IntercomConfig): Promise<void> {

  const creds = getSdkCredentials(config);

  if (!creds.server) {

    throw new Error('No hay IP de cámara configurada.');

  }

  if (!creds.password) {

    throw new Error('Falta la contraseña SDK en la configuración del intercomunicador.');

  }



  await releaseSdkSession();

  await DvrSdkService.initialize();



  await DvrSdkService.login({

    server: creds.server,

    port: creds.port,

    username: creds.username,

    password: creds.password,

    loginType: 0,

  });



  await new Promise((resolve) => setTimeout(resolve, 400));

}



/** Inicia intercom bidireccional por Net SDK (micrófono tablet → cámara). */

export async function startSdkIntercom(doorId: string, config: IntercomConfig): Promise<boolean> {

  if (!DvrSdkService.isAvailable()) {

    Alert.alert('Intercom SDK', 'Solo disponible en la app Android compilada.');

    return false;

  }



  if (activeDoorId && activeDoorId !== doorId) {

    Alert.alert('Intercom SDK', 'Ya hay un intercom activo en otra puerta. Deténlo primero.');

    return false;

  }



  const micOk = await ensureMicPermission();

  if (!micOk) {

    Alert.alert('Intercom SDK', 'Sin permiso de micrófono no se puede hablar.');

    return false;

  }



  const channel = config.voiceChannel ?? -1;



  try {

    await ensureFreshSdkSession(config);



    const voiceHandle = await DvrSdkService.startVoiceIntercom({ channel });

    console.log(`[SDK intercom] voz iniciada handle=${voiceHandle} canal=${channel}`);



    const txEnabled = await DvrSdkService.isVoiceSendEnabled();

    if (txEnabled) {
      const micStarted = await DvrSdkService.startMicStreaming();
      if (!micStarted) {
        await DvrSdkService.stopVoiceIntercom();
        throw new Error('No se pudo abrir el micrófono de la tablet.');
      }
    } else {
      console.log('[SDK intercom] modo RX-only: escucha activa sin micrófono TX');
    }

    if (!txEnabled) {
      Alert.alert(
        'Intercom — solo escucha',
        'Se recibe audio de la cámara pero no se pudo activar el micrófono (TX).\n\n' +
          'Comprueba: permiso de micrófono, una sola sesión talkback (cerrar SuperCam/NVMS) ' +
          'y canal de voz -1 en la configuración.',
      );
    }

    activeDoorId = doorId;

    return true;

  } catch (e: any) {

    await releaseSdkSession();



    const code = await DvrSdkService.getLastError();

    const label = getSdkErrorLabel(code);

    console.warn('[SDK intercom] fallo al iniciar', { code, label, message: e?.message });

    const timeoutHint =

      code === 20

        ? '\n\nLa cámara no respondió a tiempo.'

        : code === 0

          ? '\n\nSesión liberada. Si Python también falla, espera 30 s o reinicia la cámara.'

          : '';

    Alert.alert(

      'Intercom SDK',

      `No se pudo iniciar la voz.\nCanal: ${channel}\nCódigo ${code}: ${label}\n\n${e?.message || ''}${timeoutHint}`

    );

    return false;

  }

}



/** Detiene intercom SDK y libera la sesión en la cámara. */

export async function stopSdkIntercom(): Promise<void> {

  activeDoorId = null;

  await releaseSdkSession();

}


