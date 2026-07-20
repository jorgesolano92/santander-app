import { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

interface SplashVideoScreenProps {
  onFinished: () => void;
}

const SPLASH_VIDEO = require('@/assets/splash.mp4');

/** Tiempo máximo por si el vídeo no dispara fin o falla al cargar. */
const MAX_SPLASH_MS = 90_000;

export default function SplashVideoScreen({ onFinished }: SplashVideoScreenProps) {
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    SplashScreen.hideAsync().catch(() => {});
    onFinished();
  }, [onFinished]);

  const player = useVideoPlayer(SPLASH_VIDEO, (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  useEventListener(player, 'playToEnd', () => {
    finish();
  });

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'error') {
      console.warn('Splash video error:', error);
      finish();
    }
    if (status === 'readyToPlay') {
      SplashScreen.hideAsync().catch(() => {});
      if (Platform.OS === 'web' && !player.playing) {
        player.muted = true;
        player.play();
      }
    }
  });

  useEffect(() => {
    const timer = setTimeout(finish, MAX_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [finish]);

  useEffect(() => {
    player.muted = true;
    player.play();
  }, [player]);

  return (
    <View style={styles.container}>
      <VideoView
        style={styles.video}
        player={player}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
      />
      <View style={styles.skipBar} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.skipButton}
          onPress={finish}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Saltar vídeo introductorio"
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
  video: {
    width: '100%',
    height: '100%',
  },
  skipBar: {
    position: 'absolute',
    // left: 0,
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
    paddingVertical: 8,
    minWidth: 96,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#495057',
    letterSpacing: 1,
  },
});
