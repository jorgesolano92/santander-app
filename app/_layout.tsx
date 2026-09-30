import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useImmersiveFullscreen } from '@/hooks/useImmersiveFullscreen';
import IncomingCallHost from '@/components/IncomingCallHost';
import SplashVideoScreen from '@/components/SplashVideoScreen';
import { preloadCallRingtone } from '@/services/callRingtone';

export default function RootLayout() {
  useFrameworkReady();
  useImmersiveFullscreen();
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    void preloadCallRingtone();
  }, []);

  if (!splashFinished) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SplashVideoScreen onFinished={() => setSplashFinished(true)} />
        <StatusBar hidden translucent />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <IncomingCallHost />
      <StatusBar hidden translucent />
    </GestureHandlerRootView>
  );
}
