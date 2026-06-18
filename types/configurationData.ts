import type { IntercomConfig } from '@/components/IntercomConfigurationModal';
import type { EmergencyConfig } from '@/services/EmergencyService';

export interface DoorConfig {
  enabled: boolean;
  name: string;
  ipExterior: string;
  ipInterior: string;
  intercom: IntercomConfig;
}

export interface ScheduleConfig {
  ini1: string;
  ini2: string;
}

export interface ModeConfig {
  rule_key: string;
  action: 'set_rule' | 'set_output';
  enabled: boolean;
  output_code?: string;
  output_on?: boolean;
}

export interface ModesConfig {
  automatico: ModeConfig;
  esclusa: ModeConfig;
  extendido: ModeConfig;
  autoservicio: ModeConfig;
  oficinaCerrada: ModeConfig;
  cargaCajero: ModeConfig;
  manual: ModeConfig;
}

export interface ConfigurationData {
  doors: DoorConfig[];
  network: {
    consoleIP: string;
    netmask: string;
    gateway: string;
  };
  api: {
    port: number;
    username: string;
    password: string;
    urlToken: string;
    urlGet: string;
    urlPost: string;
    urlModes: string;
  };
  schedules: {
    comercial: ScheduleConfig;
    extendido: ScheduleConfig;
    autoservicio: ScheduleConfig;
    cerrado: ScheduleConfig;
  };
  officeWithATM: boolean;
  emergency: EmergencyConfig;
  modes: ModesConfig;
  /** Configuración de llamadas P1 → tablets (defaults de sucursal en panel). */
  tabletCall?: TabletCallConfig;
}

export interface TabletCallConfig {
  enabled: boolean;
  timeoutSeconds: number;
  modes: string;
  pulsadores: string;
}
