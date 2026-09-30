import { NativeModules, Platform } from 'react-native';

type TabletWakeNative = {
  wakeForIncomingCall?: () => void;
  startCommunicationAudio?: (speakerOn: boolean) => void;
  setSpeakerphoneOn?: (enabled: boolean) => void;
  stopCommunicationAudio?: () => void;
};

function nativeModule(): TabletWakeNative | undefined {
  if (Platform.OS !== 'android') return undefined;
  return NativeModules.TabletWake as TabletWakeNative | undefined;
}

/** Enciende pantalla y muestra la app sobre salvapantallas/bloqueo (Android). */
export function wakeTablet(): void {
  try {
    nativeModule()?.wakeForIncomingCall?.();
  } catch (error) {
    console.warn('[TabletWake] No se pudo despertar pantalla:', error);
  }
}

/** AudioManager MODE_IN_COMMUNICATION + altavoz (SIP/WebRTC). */
export function startCommunicationAudio(speakerOn = true): void {
  try {
    nativeModule()?.startCommunicationAudio?.(speakerOn);
  } catch (error) {
    console.warn('[TabletWake] startCommunicationAudio:', error);
  }
}

export function setSpeakerphoneOn(enabled: boolean): void {
  try {
    nativeModule()?.setSpeakerphoneOn?.(enabled);
  } catch (error) {
    console.warn('[TabletWake] setSpeakerphoneOn:', error);
  }
}

export function stopCommunicationAudio(): void {
  try {
    nativeModule()?.stopCommunicationAudio?.();
  } catch (error) {
    console.warn('[TabletWake] stopCommunicationAudio:', error);
  }
}

/** @deprecated Prefer wakeTablet() */
export function wakeTabletForIncomingCall(): void {
  wakeTablet();
}
