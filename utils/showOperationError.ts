import { Alert, InteractionManager, Platform } from 'react-native';

/**
 * Muestra un error al usuario. En Android, `Alert` detrás de un `Modal` a pantalla
 * completa no se ve; por eso se difiere con `InteractionManager` + `setTimeout`.
 * En web, `Alert` de React Native a veces no hace nada: se usa `window.alert`.
 */
export function showOperationError(title: string, message?: string | null): void {
  const body = (message != null && String(message).trim()) || 'Sin detalle del servidor.';

  const run = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${title}\n\n${body}`);
      return;
    }
    Alert.alert(title, body, [{ text: 'Aceptar', style: 'default' }], {
      cancelable: true,
    });
  };

  InteractionManager.runAfterInteractions(() => {
    setTimeout(run, 150);
  });
}
