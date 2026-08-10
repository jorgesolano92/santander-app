import type { IntercomConfig } from '@/components/IntercomConfigurationModal';
import type { EmergencyConfig } from '@/services/EmergencyService';
import type { FireSignalConfig } from '@/services/FireService';

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
  /** Señal de incendio global (rule_key sin prefijo horario_). */
  incendio: ModeConfig;
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
  fireSignal: FireSignalConfig;
  modes: ModesConfig;
  /** Configuración de llamadas P1 → tablets (defaults de sucursal en panel). */
  tabletCall?: TabletCallConfig;
  visualization?: VisualizationConfig;
  cargaCajero?: CargaCajeroConfig;
  /** Seed/reset de acceso a configuración desde el PC industrial. */
  configLogin?: {
    ordinal: string;
    password: string;
    revision: string;
  };
}

export interface TabletCallConfig {
  enabled: boolean;
  timeoutSeconds: number;
  modes: string;
  pulsadores: string;
}

export interface VisualizationConfig {
  /** Arrancar cámaras RTSP al abrir Visualización (sin audio). */
  autoStartCameras: boolean;
}

export interface CargaCajeroConfig {
  /** Puerta cuyo videoportero se muestra en modo Carga Cajero (P1, P2, …). */
  videoporteroDoorId: string;
}
