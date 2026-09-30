import { Audio } from 'expo-av';
import { AppState, type AppStateStatus } from 'react-native';

/** Timbre embebido: no depende de internet. */
const RINGTONE_ASSET = require('@/assets/sounds/incoming_call.wav');

let ringSound: Audio.Sound | null = null;
let preloadPromise: Promise<void> | null = null;
/** Monotónico: cada start incrementa; stop invalida plays en vuelo. */
let ringGeneration = 0;
let ringing = false;
let appStateSub: { remove: () => void } | null = null;

async function applyRingAudioMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
    staysActiveInBackground: false,
  });
}

async function restoreDefaultAudioMode(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
  } catch {
    // ignore
  }
}

async function unloadSound(): Promise<void> {
  const sound = ringSound;
  ringSound = null;
  if (!sound) return;
  try {
    await sound.stopAsync();
  } catch {
    // ignore
  }
  try {
    await sound.setIsLoopingAsync(false);
  } catch {
    // ignore
  }
  try {
    await sound.unloadAsync();
  } catch {
    // ignore
  }
}

function ensureAppStateGuard(): void {
  if (appStateSub) return;
  appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
    // Si no hay llamada activa, nunca debe sonar al volver de background / cambio de modo.
    if (!ringing) {
      void stopCallRingtone();
    }
    if (state !== 'active' && ringing) {
      // Mantener ringing flag; el overlay sigue responsable. No auto-play al resume.
    }
  });
}

/** Precarga opcional (sin loop activo). */
export async function preloadCallRingtone(): Promise<void> {
  ensureAppStateGuard();
  if (ringSound || preloadPromise) {
    return preloadPromise ?? Promise.resolve();
  }
  preloadPromise = (async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(RINGTONE_ASSET, {
        isLooping: false,
        volume: 1.0,
        shouldPlay: false,
      });
      // Si mientras precargábamos ya hubo un stop/start, no pisar el sound activo.
      if (ringSound) {
        try {
          await sound.unloadAsync();
        } catch {
          // ignore
        }
        return;
      }
      ringSound = sound;
    } catch (error) {
      console.warn('[CallRingtone] Precarga fallida:', error);
      ringSound = null;
    } finally {
      preloadPromise = null;
    }
  })();
  return preloadPromise;
}

export async function startCallRingtone(): Promise<void> {
  ensureAppStateGuard();
  const gen = ++ringGeneration;
  ringing = true;
  try {
    await applyRingAudioMode();
    if (gen !== ringGeneration || !ringing) return;

    if (!ringSound) {
      await preloadCallRingtone();
    }
    if (gen !== ringGeneration || !ringing) return;

    if (!ringSound) {
      const { sound } = await Audio.Sound.createAsync(RINGTONE_ASSET, {
        isLooping: true,
        volume: 1.0,
        shouldPlay: false,
      });
      if (gen !== ringGeneration || !ringing) {
        try {
          await sound.unloadAsync();
        } catch {
          // ignore
        }
        return;
      }
      ringSound = sound;
    }

    await ringSound.setIsLoopingAsync(true);
    await ringSound.setVolumeAsync(1.0);
    await ringSound.setPositionAsync(0);
    if (gen !== ringGeneration || !ringing) return;
    await ringSound.playAsync();
    if (gen !== ringGeneration || !ringing) {
      // Play llegó tarde tras stop: cortar de inmediato.
      await unloadSound();
    }
  } catch (error) {
    console.warn('[CallRingtone] No se pudo reproducir timbre:', error);
    if (gen === ringGeneration) {
      ringing = false;
    }
  }
}

export async function stopCallRingtone(): Promise<void> {
  ensureAppStateGuard();
  // Invalida cualquier start/play en vuelo.
  ringGeneration += 1;
  ringing = false;
  try {
    await unloadSound();
  } catch {
    // ignore
  }
  await restoreDefaultAudioMode();
}

export function isCallRingtoneActive(): boolean {
  return ringing;
}
