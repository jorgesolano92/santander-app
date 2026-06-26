import { Alert, InteractionManager, Platform } from 'react-native';

function runAlert(title: string, body: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${body}`);
    return;
  }
  Alert.alert(title, body, [{ text: 'Aceptar', style: 'default' }], {
    cancelable: true,
  });
}

/**
 * Muestra un error al usuario. En Android, `Alert` detrás de un `Modal` a pantalla
 * completa no se ve; por eso se difiere con `InteractionManager` + `setTimeout`.
 */
export function showOperationError(title: string, message?: string | null): void {
  const body = (message != null && String(message).trim()) || 'Sin detalle del servidor.';
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => runAlert(title, body), 150);
  });
}

/** Aviso informativo (p. ej. modo en cola). */
export function showOperationInfo(title: string, message?: string | null): void {
  const body = (message != null && String(message).trim()) || '';
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => runAlert(title, body), 150);
  });
}
