import { Audio } from 'expo-av';

/** Tono de timbre en bucle (requiere red la primera vez si no hay asset local). */
const RINGTONE_URI =
  'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';

let ringSound: Audio.Sound | null = null;

export async function startCallRingtone(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    if (ringSound) {
      await ringSound.stopAsync();
      await ringSound.unloadAsync();
      ringSound = null;
    }
    const { sound } = await Audio.Sound.createAsync(
      { uri: RINGTONE_URI },
      { isLooping: true, volume: 1.0, shouldPlay: true },
    );
    ringSound = sound;
  } catch (error) {
    console.warn('[CallRingtone] No se pudo reproducir timbre:', error);
  }
}

export async function stopCallRingtone(): Promise<void> {
  if (!ringSound) return;
  try {
    await ringSound.stopAsync();
    await ringSound.unloadAsync();
  } catch {
    // ignore
  }
  ringSound = null;
}
