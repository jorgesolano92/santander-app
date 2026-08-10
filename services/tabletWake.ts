import { NativeModules, Platform } from 'react-native';

type TabletWakeNative = {
  wakeForIncomingCall?: () => void;
};

/** Enciende pantalla y muestra la app sobre salvapantallas/bloqueo (Android). */
export function wakeTablet(): void {
  if (Platform.OS !== 'android') return;
  try {
    const mod = NativeModules.TabletWake as TabletWakeNative | undefined;
    mod?.wakeForIncomingCall?.();
  } catch (error) {
    console.warn('[TabletWake] No se pudo despertar pantalla:', error);
  }
}

/** @deprecated Prefer wakeTablet() */
export function wakeTabletForIncomingCall(): void {
  wakeTablet();
}
