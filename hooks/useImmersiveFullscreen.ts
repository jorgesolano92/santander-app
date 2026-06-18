import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';

/** Pantalla completa inmersiva (sin status bar / nav bar visibles) en Android. */
export function useImmersiveFullscreen() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const apply = () => {
      void SystemUI.setBackgroundColorAsync('transparent');
    };

    apply();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') apply();
    });
    return () => sub.remove();
  }, []);
}
