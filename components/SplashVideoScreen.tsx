import { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

interface SplashVideoScreenProps {
  onFinished: () => void;
}

/** GIF compatible con tablets Akuvox (el MP4/H.264 a menudo no se reproduce). */
const SPLASH_GIF = require('@/assets/splash.gif');

const MAX_SPLASH_MS = 8_000;
const MIN_SPLASH_MS = 2_200;

export default function SplashVideoScreen({ onFinished }: SplashVideoScreenProps) {
  const finishedRef = useRef(false);
  const startedAt = useRef(Date.now());

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    SplashScreen.hideAsync().catch(() => {});
    onFinished();
  }, [onFinished]);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    const maxTimer = setTimeout(finish, MAX_SPLASH_MS);
    return () => clearTimeout(maxTimer);
  }, [finish]);

  const handleLoadEnd = () => {
    const elapsed = Date.now() - startedAt.current;
    const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
    setTimeout(finish, wait + 3_500);
  };

  return (
    <View style={styles.container}>
      <Image
        source={SPLASH_GIF}
        style={styles.media}
        resizeMode="cover"
        onLoadEnd={handleLoadEnd}
        onError={() => finish()}
      />
      <View style={styles.skipBar} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.skipButton}
          onPress={finish}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Saltar introducción"
        >
          <Text style={styles.skipButtonText}>SALTAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  skipBar: {
    position: 'absolute',
    right: 20,
    bottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#495057',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 110,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#495057',
    letterSpacing: 1,
  },
});
