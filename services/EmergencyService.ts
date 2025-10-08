import AsyncStorage from '@react-native-async-storage/async-storage';

const EMERGENCY_STATE_KEY = 'emergency_state';
const EMERGENCY_CONFIG_KEY = 'emergency_config';

export interface EmergencyConfig {
  enabled: boolean;
  pcb1: number;
  switch1: number;
  pcb2: number;
  switch2: number;
}

export interface EmergencyState {
  isActive: boolean;
  activatedAt?: string;
  switches: {
    pcb1: { switch: number; status: boolean };
    pcb2: { switch: number; status: boolean };
  };
}

class EmergencyService {
  /**
   * Obtener configuración de emergencia
   */
  async getEmergencyConfig(): Promise<EmergencyConfig | null> {
    try {
      const config = await AsyncStorage.getItem(EMERGENCY_CONFIG_KEY);
      return config ? JSON.parse(config) : null;
    } catch (error) {
      console.error('❌ Error obteniendo configuración de emergencia:', error);
      return null;
    }
  }

  /**
   * Guardar configuración de emergencia
   */
  async setEmergencyConfig(config: EmergencyConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(EMERGENCY_CONFIG_KEY, JSON.stringify(config));
      console.log('✅ Configuración de emergencia guardada:', config);
    } catch (error) {
      console.error('❌ Error guardando configuración de emergencia:', error);
      throw error;
    }
  }

  /**
   * Obtener estado actual de emergencia
   */
  async getEmergencyState(): Promise<EmergencyState | null> {
    try {
      const state = await AsyncStorage.getItem(EMERGENCY_STATE_KEY);
      return state ? JSON.parse(state) : null;
    } catch (error) {
      console.error('❌ Error obteniendo estado de emergencia:', error);
      return null;
    }
  }

  /**
   * Activar emergencia
   */
  async activateEmergency(): Promise<void> {
    try {
      const config = await this.getEmergencyConfig();
      if (!config || !config.enabled) {
        throw new Error('Configuración de emergencia no habilitada');
      }

      const state: EmergencyState = {
        isActive: true,
        activatedAt: new Date().toISOString(),
        switches: {
          pcb1: { switch: config.switch1, status: true },
          pcb2: { switch: config.switch2, status: true },
        },
      };

      await AsyncStorage.setItem(EMERGENCY_STATE_KEY, JSON.stringify(state));
      console.log('🚨 EMERGENCIA ACTIVADA:', state);
    } catch (error) {
      console.error('❌ Error activando emergencia:', error);
      throw error;
    }
  }

  /**
   * Desactivar emergencia
   */
  async deactivateEmergency(): Promise<void> {
    try {
      const state: EmergencyState = {
        isActive: false,
        switches: {
          pcb1: { switch: 0, status: false },
          pcb2: { switch: 0, status: false },
        },
      };

      await AsyncStorage.setItem(EMERGENCY_STATE_KEY, JSON.stringify(state));
      console.log('✅ EMERGENCIA DESACTIVADA:', state);
    } catch (error) {
      console.error('❌ Error desactivando emergencia:', error);
      throw error;
    }
  }

  /**
   * Verificar si la emergencia está activa
   */
  async isEmergencyActive(): Promise<boolean> {
    try {
      const state = await this.getEmergencyState();
      return state?.isActive || false;
    } catch (error) {
      console.error('❌ Error verificando estado de emergencia:', error);
      return false;
    }
  }

  /**
   * Limpiar estado de emergencia (para reset)
   */
  async clearEmergencyState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(EMERGENCY_STATE_KEY);
      console.log('🧹 Estado de emergencia limpiado');
    } catch (error) {
      console.error('❌ Error limpiando estado de emergencia:', error);
      throw error;
    }
  }
}

export const emergencyService = new EmergencyService();
