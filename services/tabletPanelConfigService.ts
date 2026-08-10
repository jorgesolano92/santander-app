import AsyncStorage from '@react-native-async-storage/async-storage';

import { cloneDefaultDoorAppConfig } from '@/config/defaultDoorAppConfig';
import type { ConfigurationData } from '@/types/configurationData';
import { configCredentialsService } from '@/services/ConfigCredentialsService';
import { doorControlService } from '@/services/DoorControlService';
import { emergencyService } from '@/services/EmergencyService';
import { fireService } from '@/services/FireService';

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
  const defaults = cloneDefaultDoorAppConfig();
  const effective: ConfigurationData = { ...config };
  if (!effective.fireSignal) {
    effective.fireSignal = { ...defaults.fireSignal };
  }
  if (!effective.modes.incendio) {
    effective.modes.incendio = {
      ...defaults.modes.incendio,
      ...(effective.fireSignal || {}),
      rule_key: effective.fireSignal?.rule_key || defaults.modes.incendio.rule_key,
    };
  }
  effective.fireSignal = {
    ...defaults.fireSignal,
    enabled: effective.modes.incendio.enabled,
    rule_key: effective.modes.incendio.rule_key,
    action: effective.modes.incendio.action,
    output_code: effective.modes.incendio.output_code || '',
    output_on: effective.modes.incendio.output_on !== false,
  };
  if (effective.emergency?.rule_key === 'senal_de_incendio_activada') {
    effective.fireSignal = {
      ...defaults.fireSignal,
      ...effective.fireSignal,
      rule_key: 'senal_de_incendio_activada',
    };
    effective.emergency = {
      ...effective.emergency,
      rule_key: defaults.emergency.rule_key,
    };
  }
  await AsyncStorage.setItem(EFFECTIVE_CONFIG_KEY, JSON.stringify(effective));
  if (effective.emergency) {
    await emergencyService.setEmergencyConfig(effective.emergency);
  }
  if (effective.fireSignal) {
    await fireService.setFireConfig(effective.fireSignal);
  }
}

export async function applyPanelDefaults(record: PanelDefaultsRecord): Promise<ConfigurationData> {
  await AsyncStorage.setItem(PANEL_DEFAULTS_KEY, JSON.stringify(record));
  await saveEffectiveConfig(record.config);
  await clearLocalConfigOverrides();
  try {
    await configCredentialsService.applyPanelSeed(
      (record.config as ConfigurationData & { configLogin?: unknown }).configLogin,
    );
  } catch (error) {
    console.warn('[TabletConfig] No se pudo aplicar configLogin del panel:', error);
  }
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

/** Primera instalación o arranque. Solo descarga defaults del panel si no hay cambios locales. */
export async function initializeTabletConfigOnBoot(): Promise<{
  config: ConfigurationData;
  needsIpSetup: boolean;
  pulledFromPanel: boolean;
}> {
  const savedRaw = await AsyncStorage.getItem(EFFECTIVE_CONFIG_KEY);
  let local: ConfigurationData | null = null;
  if (savedRaw) {
    try {
      local = JSON.parse(savedRaw) as ConfigurationData;
      await saveEffectiveConfig(local);
    } catch {
      local = null;
    }
  }

  const consoleIP = String(local?.network?.consoleIP || '').trim();
  if (!consoleIP) {
    const bootstrap = local || cloneDefaultDoorAppConfig();
    bootstrap.network = { ...bootstrap.network, consoleIP: '' };
    console.warn('[TabletConfig] Sin IP de consola: se requiere configuración inicial');
    return { config: bootstrap, needsIpSetup: true, pulledFromPanel: false };
  }

  // Si el usuario ya personalizó la config en la tablet, no sobrescribir
  if (local && (await hasLocalConfigOverrides())) {
    console.log('[TabletConfig] Conservando configuración local (hay cambios en tablet)');
    return { config: local, needsIpSetup: false, pulledFromPanel: false };
  }

  console.log('[TabletConfig] Descargando configuración del panel…');
  const applied = await pullAndApplyPanelDefaults(local || cloneDefaultDoorAppConfig());
  if (applied) {
    // Conservar IP/credenciales que ya tenía la tablet
    const merged: ConfigurationData = {
      ...applied,
      network: { ...applied.network, ...(local?.network || {}) },
      api: { ...applied.api, ...(local?.api || {}) },
    };
    await saveEffectiveConfig(merged);
    console.log('[TabletConfig] Configuración del panel aplicada');
    return { config: merged, needsIpSetup: false, pulledFromPanel: true };
  }

  if (local) {
    console.warn('[TabletConfig] Panel no disponible; usando configuración local');
    return { config: local, needsIpSetup: false, pulledFromPanel: false };
  }

  const bootstrap = cloneDefaultDoorAppConfig();
  await saveEffectiveConfig(bootstrap);
  return { config: bootstrap, needsIpSetup: false, pulledFromPanel: false };
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
