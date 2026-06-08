/** Etiquetas de NET_SDK_ERROR (extracto útil para la app). */
export const SDK_ERROR_LABELS: Record<number, string> = {
  0: 'Sin código de error (handle inválido; suele ser canal ocupado o API incorrecta)',
  1: 'Contraseña incorrecta',
  2: 'Permisos insuficientes',
  3: 'SDK no inicializado',
  4: 'Canal incorrecto',
  5: 'Máximo de conexiones alcanzado',
  8: 'Fallo de red / puerto cerrado',
  20: 'Timeout del comando (la cámara no respondió a tiempo)',
  34: 'Intercom de voz ya ocupado en la cámara',
  37: 'Voz ya abierta en otro cliente',
  75: 'Canal de voz ocupado por otro cliente',
};

export function getSdkErrorLabel(code: number): string {
  return SDK_ERROR_LABELS[code] || 'Error desconocido';
}
