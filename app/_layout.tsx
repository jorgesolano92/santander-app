import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useImmersiveFullscreen } from '@/hooks/useImmersiveFullscreen';
import IncomingCallHost from '@/components/IncomingCallHost';

export default function RootLayout() {
  useFrameworkReady();
  useImmersiveFullscreen();

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
