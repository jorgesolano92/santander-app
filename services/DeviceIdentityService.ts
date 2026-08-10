/**
 * Identificador estable de la tablet (Android ID).
 * En Android moderno la MAC no es usable; usamos Application.getAndroidId().
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';

const FALLBACK_ID_KEY = 'tablet_device_android_id_fallback';

let cachedId: string | null = null;

function randomHex(len: number): string {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function getOrCreateFallbackId(prefix: string): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(FALLBACK_ID_KEY);
    if (existing && existing.trim()) {
      return existing.trim().toLowerCase();
    }
  } catch {
    // ignore
  }
  const generated = `${prefix}-${randomHex(16)}`;
  try {
    await AsyncStorage.setItem(FALLBACK_ID_KEY, generated);
  } catch {
    // ignore
  }
  return generated;
}

/**
 * Devuelve el Android ID (minúsculas) o un ID local persistente en web/dev.
 */
export async function getTabletAndroidId(): Promise<string> {
  if (cachedId) return cachedId;

  if (Platform.OS === 'android') {
    try {
      const id = Application.getAndroidId();
      if (id && String(id).trim()) {
        cachedId = String(id).trim().toLowerCase();
        return cachedId;
      }
    } catch (e) {
      console.warn('No se pudo leer Android ID:', e);
    }
    cachedId = await getOrCreateFallbackId('android-fallback');
    return cachedId;
  }

  // Web / iOS (desarrollo): ID local persistente para poder probar la allowlist
  const prefix = Platform.OS === 'web' ? 'web' : Platform.OS;
  cachedId = await getOrCreateFallbackId(prefix);
  return cachedId;
}

export function clearTabletAndroidIdCache(): void {
  cachedId = null;
}
