export type ModeCategory = 'COMERCIAL' | 'EXTENDIDO' | 'MANIOBRAS' | 'INDIVIDUAL';

export interface ModeDefinition {
  id: string;
  category: ModeCategory;
  name: string;
  /** Texto al previsualizar / seleccionar en el modal. */
  previewDescription: string;
  /** Texto en la pantalla principal cuando el modo está activo. */
  activeDescription: string;
  /** Solo visible si la oficina tiene cajero en zaguán. */
  requiresAtmInVestibule?: boolean;
}

export const MODE_DEFINITIONS: ModeDefinition[] = [
  {
    id: 'comercial_automatico',
    category: 'COMERCIAL',
    name: 'AUTOMÁTICO',
    previewDescription:
      'Las puertas Calle y Oficina se abren al detectar presencia o al pulsar cualquiera de los pulsadores. Ambas puertas funcionan de forma independiente entre sí: cada una abre sin esperar a la otra.',
    activeDescription:
      'Las puertas se abren al acercarse una persona o al pulsar los botones. Ambas puertas funcionan por separado.',
  },
  {
    id: 'comercial_esclusa',
    category: 'COMERCIAL',
    name: 'ESCLUSA',
    previewDescription:
      'Las puertas Calle y Oficina se abren al detectar presencia o al pulsar cualquiera de los pulsadores. Funcionan en modo esclusa: una puerta no se abre hasta que la otra está completamente cerrada.',
    activeDescription:
      'Las puertas se abren al acercarse una persona o al pulsar los botones. Una puerta no se abre hasta que la otra está cerrada, por lo que nunca quedan las dos abiertas a la vez.',
  },
  {
    id: 'horario_extendido',
    category: 'EXTENDIDO',
    name: 'EXTENDIDO',
    previewDescription:
      'Modo para horario de empleados, sin atención al público o con atención parcial.\n\nPuerta Calle: apertura mediante el botón del videoportero exterior. Abre si el zaguán está libre y la puerta Oficina está cerrada.\n\nPuerta Oficina: apertura manual a través de la consola de control, previa autorización expresa. Abre si la puerta Calle está cerrada.\n\nSalida: mediante los pulsadores interiores. Abre si la puerta contraria está cerrada.',
    activeDescription:
      'Modo para horario de empleados, con la oficina cerrada al público o con atención parcial. Para entrar, el visitante llama desde el videoportero de la calle. La puerta exterior se abre si el zaguán está vacío. La puerta de oficina solo se abre cuando ustedes autorizan desde la consola. Para salir, use los pulsadores interiores.',
  },
  {
    id: 'horario_autoservicio',
    category: 'EXTENDIDO',
    name: 'AUTOSERVICIO',
    previewDescription:
      'Modo para acceso al cajero fuera del horario comercial.\n\nPuerta Calle: apertura mediante el botón del videoportero exterior. Abre si el zaguán está libre y la puerta Oficina está cerrada.\n\nPuerta Oficina: requiere una maniobra de cierre y apertura con la llave. Durante los 15 segundos siguientes, la puerta abre desde el pulsador exterior, siempre que la puerta Calle esté cerrada. No se genera llamada a la consola de control.\n\nSalida: mediante los pulsadores interiores. Abre si la puerta contraria está cerrada.',
    activeDescription:
      'Modo para acceso al cajero fuera del horario comercial. Los clientes entran al zaguán pulsando el videoportero de la calle. Para entrar a la oficina, haga la maniobra con la llave y pulse en los 15 segundos siguientes. Para salir, use los pulsadores interiores.',
  },
  {
    id: 'oficina_cerrada',
    category: 'EXTENDIDO',
    name: 'OFICINA CERRADA',
    previewDescription:
      'Modo para horarios sin empleados.\n\nEntrada por ambas puertas: requiere una maniobra de cierre y apertura con la llave. Durante los 15 segundos siguientes, la puerta abre desde el pulsador exterior, siempre que la puerta contraria esté cerrada. No se genera llamada a la consola de control.\n\nSalida: mediante los pulsadores interiores. Abre si la puerta contraria está cerrada.',
    activeDescription:
      'Modo para horarios sin empleados. Para entrar por cualquiera de las dos puertas, haga la maniobra con la llave y pulse el botón exterior en los 15 segundos siguientes. Para salir, use los pulsadores interiores.',
  },
  {
    id: 'carga_cajero',
    category: 'MANIOBRAS',
    name: 'CARGA DE CAJERO',
    requiresAtmInVestibule: true,
    previewDescription:
      'Modo para la carga del cajero situado en el zaguán.\n\nPuerta Oficina: permanece abierta mientras la puerta Calle esté cerrada.\n\nPuerta Calle: se abre pulsando el botón de llamada, interior o exterior. En ambos casos se genera una llamada a la consola de control, desde la que debe autorizarse la apertura.\n\nSalida: mediante los pulsadores interiores.',
    activeDescription:
      'Modo para la carga del cajero del zaguán. La puerta de oficina queda abierta mientras la de la calle esté cerrada. La puerta de la calle solo se abre cuando ustedes autorizan desde la consola.',
  },
  {
    id: 'manual',
    category: 'INDIVIDUAL',
    name: 'BLOQUEO DE PUERTAS',
    previewDescription:
      'Toda apertura requiere autorización desde la consola de control.\n\nEntrada y salida por ambas puertas: al pulsar el botón de llamada, exterior o interior, se genera una llamada a la consola. La puerta se abre solo cuando se autoriza desde ella. La apertura únicamente se permite cuando la puerta contraria está completamente cerrada.',
    activeDescription:
      'Toda apertura requiere su autorización. Cada vez que alguien pulsa un botón, dentro o fuera, recibirán una llamada en la consola y deberán autorizar la apertura.',
  },
];

export const MODE_CATEGORY_LABELS: Record<ModeCategory, string> = {
  COMERCIAL: 'COMERCIAL',
  EXTENDIDO: 'HORARIO',
  MANIOBRAS: 'MANIOBRAS',
  INDIVIDUAL: '',
};

export const MODE_CATEGORY_ORDER: ModeCategory[] = [
  'COMERCIAL',
  'EXTENDIDO',
  'MANIOBRAS',
  'INDIVIDUAL',
];

const ruleKeyToId: Record<string, string> = {
  horario_automatico: 'comercial_automatico',
  horario_esclusa: 'comercial_esclusa',
  horario_extendido: 'horario_extendido',
  horario_autoservicio: 'horario_autoservicio',
  horario_cerrado: 'oficina_cerrada',
  horario_carga_cajero: 'carga_cajero',
  horario_manual: 'manual',
};

const labelToIdMap: Record<string, string> = {
  'comercial automático': 'comercial_automatico',
  'comercial automatico': 'comercial_automatico',
  'comercial esclusa': 'comercial_esclusa',
  'horario extendido': 'horario_extendido',
  'horario autoservicio': 'horario_autoservicio',
  'oficina cerrada': 'oficina_cerrada',
  'carga de cajero': 'carga_cajero',
  'carga cajero': 'carga_cajero',
  manual: 'manual',
  'horario manual': 'manual',
  'bloqueo oficina': 'manual',
  'bloqueo de oficina': 'manual',
  'bloqueo de puertas': 'manual',
  'bloqueo puertas': 'manual',
};

const modeIdToApiName: Record<string, string> = {
  comercial_automatico: 'COMERCIAL AUTOMÁTICO',
  comercial_esclusa: 'COMERCIAL ESCLUSA',
  horario_extendido: 'HORARIO EXTENDIDO',
  horario_autoservicio: 'HORARIO AUTOSERVICIO',
  oficina_cerrada: 'OFICINA CERRADA',
  carga_cajero: 'CARGA DE CAJERO',
  manual: 'MANUAL',
};

const apiNameToModeId: Record<string, string> = {
  ...Object.fromEntries(Object.entries(modeIdToApiName).map(([id, name]) => [name, id])),
  'COMERCIAL AUTOMATICO': 'comercial_automatico',
  'HORARIO MANUAL': 'manual',
  MANUAL: 'manual',
  'BLOQUEO OFICINA': 'manual',
  'BLOQUEO DE OFICINA': 'manual',
  'BLOQUEO DE PUERTAS': 'manual',
  'BLOQUEO PUERTAS': 'manual',
  EMERGENCIA: 'emergencia',
};

export function normalizeModeToId(mode: string | null | undefined): string | null {
  if (!mode) return null;
  const lower = String(mode).trim().toLowerCase();

  const directIds = new Set([
    'comercial_automatico',
    'comercial_esclusa',
    'horario_extendido',
    'horario_autoservicio',
    'horario_automatico',
    'horario_esclusa',
    'horario_manual',
    'horario_carga_cajero',
    'horario_cerrado',
    'oficina_cerrada',
    'carga_cajero',
    'manual',
  ]);

  if (directIds.has(lower)) {
    return ruleKeyToId[lower] || (lower === 'horario_cerrado' ? 'oficina_cerrada' : lower);
  }

  const mapped = labelToIdMap[lower];
  if (mapped) return mapped;

  const trimmed = String(mode).trim();
  if (apiNameToModeId[trimmed]) return apiNameToModeId[trimmed];
  const upper = trimmed.toUpperCase();
  if (apiNameToModeId[upper]) return apiNameToModeId[upper];

  return null;
}

export function getModeDefinition(mode: string | null | undefined): ModeDefinition | undefined {
  const id = normalizeModeToId(mode);
  if (!id) return undefined;
  return MODE_DEFINITIONS.find((entry) => entry.id === id);
}

export function getModeActiveDescription(mode: string | null | undefined): string {
  return (
    getModeDefinition(mode)?.activeDescription ||
    'Modo de operación activo en la instalación.'
  );
}

export function formatModeApiName(mode: string): string {
  const id = normalizeModeToId(mode);
  if (id && modeIdToApiName[id]) return modeIdToApiName[id];
  return mode;
}

/** Ej.: "COMERCIAL AUTOMÁTICO" → "Comercial Automático" */
export function formatModeDisplayName(mode: string): string {
  const def = getModeDefinition(mode);
  const label = def?.name || formatModeApiName(mode);
  return label
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function modeIdToBackendName(modeId: string): string {
  return modeIdToApiName[modeId] || modeId;
}
