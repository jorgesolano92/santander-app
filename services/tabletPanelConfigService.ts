import AsyncStorage from '@react-native-async-storage/async-storage';

import { cloneDefaultDoorAppConfig } from '@/config/defaultDoorAppConfig';
import type { ConfigurationData } from '@/types/configurationData';
import { doorControlService } from '@/services/DoorControlService';
import { emergencyService } from '@/services/EmergencyService';

const PANEL_DEFAULTS_KEY = 'tablet_panel_defaults';
const HAS_OVERRIDES_KEY = 'tablet_config_has_overrides';
const EFFECTIVE_CONFIG_KEY = 'new_door_config';

export type PanelDefaultsRecord = {
  revision: string;
  updated_at: string | null;
  config: ConfigurationData;
};

export async function hasLocalConfigOverrides(): Promise<boolean> {
  return (await AsyncStorage.getItem(HAS_OVERRIDES_KEY)) === 'true';
}

export async function markLocalConfigOverrides(): Promise<void> {
  await AsyncStorage.setItem(HAS_OVERRIDES_KEY, 'true');
}

export async function clearLocalConfigOverrides(): Promise<void> {
  await AsyncStorage.removeItem(HAS_OVERRIDES_KEY);
}

export async function getCachedPanelDefaults(): Promise<PanelDefaultsRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(PANEL_DEFAULTS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PanelDefaultsRecord;
  } catch {
    return null;
  }
}

export async function saveEffectiveConfig(config: ConfigurationData): Promise<void> {
  await AsyncStorage.setItem(EFFECTIVE_CONFIG_KEY, JSON.stringify(config));
  if (config.emergency) {
    await emergencyService.setEmergencyConfig(config.emergency);
  }
}

export async function applyPanelDefaults(record: PanelDefaultsRecord): Promise<ConfigurationData> {
  await AsyncStorage.setItem(PANEL_DEFAULTS_KEY, JSON.stringify(record));
  await saveEffectiveConfig(record.config);
  await clearLocalConfigOverrides();
  return record.config;
}

export async function pullAndApplyPanelDefaults(
  bootstrapConfig?: ConfigurationData,
): Promise<ConfigurationData | null> {
  let source = bootstrapConfig;
  if (!source) {
    const raw = await AsyncStorage.getItem(EFFECTIVE_CONFIG_KEY);
    if (raw) {
      try {
        source = JSON.parse(raw) as ConfigurationData;
      } catch {
        source = undefined;
      }
    }
  }
  if (!source) {
    source = cloneDefaultDoorAppConfig();
  }
  const record = await doorControlService.fetchTabletPanelConfig(source);
  if (!record) return null;
  return applyPanelDefaults({
    revision: record.revision,
    updated_at: record.updated_at,
    config: record.config as ConfigurationData,
  });
}

/** Primera instalación o arranque sin config local. */
export async function initializeTabletConfigOnBoot(): Promise<ConfigurationData> {
  const saved = await AsyncStorage.getItem(EFFECTIVE_CONFIG_KEY);
  if (saved) {
    return JSON.parse(saved) as ConfigurationData;
  }

  console.log('[TabletConfig] Primera instalación: importando defaults del panel…');
  const bootstrap = cloneDefaultDoorAppConfig();
  const applied = await pullAndApplyPanelDefaults(bootstrap);
  if (applied) {
    console.log('[TabletConfig] Defaults del panel aplicados');
    return applied;
  }

  console.warn('[TabletConfig] Fallback a defaults locales (sin conexión al panel)');
  await saveEffectiveConfig(bootstrap);
  return bootstrap;
}

/** Botón «Restaurar datos por defecto» en la tablet. */
export async function restorePanelDefaultsOnDevice(): Promise<ConfigurationData | null> {
  const bootstrap = cloneDefaultDoorAppConfig();
  const savedRaw = await AsyncStorage.getItem(EFFECTIVE_CONFIG_KEY);
  if (savedRaw) {
    try {
      const saved = JSON.parse(savedRaw) as ConfigurationData;
      if (saved.network?.consoleIP) {
        bootstrap.network = { ...bootstrap.network, ...saved.network };
      }
      if (saved.api) {
        bootstrap.api = { ...bootstrap.api, ...saved.api };
      }
    } catch {
      /* usar bootstrap */
    }
  }
  return pullAndApplyPanelDefaults(bootstrap);
}
