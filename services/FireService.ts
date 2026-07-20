import AsyncStorage from '@react-native-async-storage/async-storage';

import type { EmergencyConfig } from '@/services/EmergencyService';

export const FIRE_SIGNAL_RULE_KEY = 'senal_de_incendio_activada';

const FIRE_STATE_KEY = 'fire_signal_state';
const FIRE_CONFIG_KEY = 'fire_signal_config';

export type FireSignalConfig = EmergencyConfig;

export interface FireSignalState {
  isActive: boolean;
  activatedAt?: string;
}

class FireService {
  async getFireConfig(): Promise<FireSignalConfig | null> {
    try {
      const config = await AsyncStorage.getItem(FIRE_CONFIG_KEY);
      return config ? JSON.parse(config) : null;
    } catch (error) {
      console.error('❌ Error obteniendo configuración de incendio:', error);
      return null;
    }
  }

  async setFireConfig(config: FireSignalConfig): Promise<void> {
    await AsyncStorage.setItem(FIRE_CONFIG_KEY, JSON.stringify(config));
  }

  async getFireState(): Promise<FireSignalState | null> {
    try {
      const state = await AsyncStorage.getItem(FIRE_STATE_KEY);
      if (!state) return null;
      const parsed = JSON.parse(state);
      if (typeof parsed?.isActive === 'boolean') {
        return parsed as FireSignalState;
      }
      return null;
    } catch {
      return null;
    }
  }

  async activateFire(): Promise<void> {
    const st: FireSignalState = {
      isActive: true,
      activatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(FIRE_STATE_KEY, JSON.stringify(st));
    console.log('🔥 SEÑAL DE INCENDIO ACTIVA:', st);
  }

  async deactivateFire(): Promise<void> {
    await AsyncStorage.setItem(FIRE_STATE_KEY, JSON.stringify({ isActive: false }));
    console.log('✅ Señal de incendio desactivada en tablet');
  }
}

export const fireService = new FireService();
