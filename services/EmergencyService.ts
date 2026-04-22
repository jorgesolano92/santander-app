import AsyncStorage from '@react-native-async-storage/async-storage';

const EMERGENCY_STATE_KEY = 'emergency_state';
const EMERGENCY_CONFIG_KEY = 'emergency_config';
/** `rule_key` del panel (`get_mode`) activo antes de entrar en emergencia, para restaurar al salir. */
const PREVIOUS_PANEL_MODE_RULE_KEY = 'previous_panel_mode_rule_key';

export interface EmergencyConfig {
  enabled: boolean;
  /** Clave de regla del panel; debe coincidir con `current_mode` en get_mode para el titilado cuando aplica. */
  rule_key?: string;
  action?: 'set_rule' | 'set_output';
  output_code?: string;
  output_on?: boolean;
}

export interface EmergencyState {
  isActive: boolean;
  activatedAt?: string;
}

class EmergencyService {
  async getEmergencyConfig(): Promise<EmergencyConfig | null> {
    try {
      const config = await AsyncStorage.getItem(EMERGENCY_CONFIG_KEY);
      return config ? JSON.parse(config) : null;
    } catch (error) {
      console.error('❌ Error obteniendo configuración de emergencia:', error);
      return null;
    }
  }

  async setEmergencyConfig(config: EmergencyConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(EMERGENCY_CONFIG_KEY, JSON.stringify(config));
      console.log('✅ Configuración de emergencia guardada:', config);
    } catch (error) {
      console.error('❌ Error guardando configuración de emergencia:', error);
      throw error;
    }
  }

  async getEmergencyState(): Promise<EmergencyState | null> {
    try {
      const state = await AsyncStorage.getItem(EMERGENCY_STATE_KEY);
      if (!state) return null;
      const parsed = JSON.parse(state);
      if (typeof parsed?.isActive === 'boolean') {
        return parsed as EmergencyState;
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo estado de emergencia:', error);
      return null;
    }
  }

  async activateEmergency(): Promise<void> {
    try {
      const config = await this.getEmergencyConfig();
      if (!config || !config.enabled) {
        throw new Error('Configuración de emergencia no habilitada');
      }

      const st: EmergencyState = {
        isActive: true,
        activatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(EMERGENCY_STATE_KEY, JSON.stringify(st));
      console.log('🚨 EMERGENCIA ACTIVADA:', st);
    } catch (error) {
      console.error('❌ Error activando emergencia:', error);
      throw error;
    }
  }

  async deactivateEmergency(): Promise<void> {
    try {
      const st: EmergencyState = { isActive: false };
      await AsyncStorage.setItem(EMERGENCY_STATE_KEY, JSON.stringify(st));
      console.log('✅ EMERGENCIA DESACTIVADA:', st);
    } catch (error) {
      console.error('❌ Error desactivando emergencia:', error);
      throw error;
    }
  }

  async isEmergencyActive(): Promise<boolean> {
    try {
      const state = await this.getEmergencyState();
      return state?.isActive || false;
    } catch (error) {
      console.error('❌ Error verificando estado de emergencia:', error);
      return false;
    }
  }

  async clearEmergencyState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(EMERGENCY_STATE_KEY);
      console.log('🧹 Estado de emergencia limpiado');
    } catch (error) {
      console.error('❌ Error limpiando estado de emergencia:', error);
      throw error;
    }
  }

  async setPreviousPanelModeRuleKey(ruleKey: string): Promise<void> {
    const k = String(ruleKey || '').trim();
    if (!k) {
      await this.clearPreviousPanelModeRuleKey();
      return;
    }
    await AsyncStorage.setItem(PREVIOUS_PANEL_MODE_RULE_KEY, k);
    console.log('💾 Modo panel guardado para restaurar tras emergencia:', k);
  }

  async getPreviousPanelModeRuleKey(): Promise<string | null> {
    try {
      const v = await AsyncStorage.getItem(PREVIOUS_PANEL_MODE_RULE_KEY);
      const t = v?.trim();
      return t || null;
    } catch {
      return null;
    }
  }

  async clearPreviousPanelModeRuleKey(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREVIOUS_PANEL_MODE_RULE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export const emergencyService = new EmergencyService();
