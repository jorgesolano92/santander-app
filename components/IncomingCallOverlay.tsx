import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Vibration,
  Platform,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, PhoneOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { startCallRingtone, stopCallRingtone } from '@/services/callRingtone';
import type { IncomingCallPayload } from '@/services/tabletCallService';

const RING_PATTERN = [0, 900, 400, 900, 400, 900] as const;

type Props = {
  call: IncomingCallPayload;
  onAnswer: (call: IncomingCallPayload) => void;
  onReject: (call: IncomingCallPayload) => void;
  onExpired?: (call: IncomingCallPayload) => void;
};

export default function IncomingCallOverlay({ call, onAnswer, onReject, onExpired }: Props) {
  const insets = useSafeAreaInsets();
  const [remaining, setRemaining] = useState(0);
  const vibrateTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredRef = useRef(false);
  const callRef = useRef(call);
  callRef.current = call;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onReject(callRef.current);
      return true;
    });
    return () => sub.remove();
  }, [onReject]);

  useEffect(() => {
    expiredRef.current = false;
    const seconds = Math.max(1, call.remainingSeconds);
    setRemaining(seconds);
    void startCallRingtone();

    const tick = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);

    const expireTimer = setTimeout(() => {
      if (expiredRef.current) return;
      expiredRef.current = true;
      void stopCallRingtone();
      Vibration.cancel();
      onExpired?.(callRef.current);
    }, seconds * 1000);

    const pulse = () => {
      if (Platform.OS === 'android') {
        Vibration.vibrate([...RING_PATTERN]);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    };
    pulse();
    vibrateTimer.current = setInterval(pulse, 2800);

    return () => {
      clearInterval(tick);
      clearTimeout(expireTimer);
      void stopCallRingtone();
      if (vibrateTimer.current) {
        clearInterval(vibrateTimer.current);
        vibrateTimer.current = null;
      }
      Vibration.cancel();
    };
  }, [call.callId, onExpired]);

  const handleAnswer = () => {
    console.log('[TabletCall] UI contestar', call.callId);
    void stopCallRingtone();
    Vibration.cancel();
    onAnswer(call);
  };

  const handleReject = () => {
    console.log('[TabletCall] UI rechazar', call.callId);
    void stopCallRingtone();
    Vibration.cancel();
    onReject(call);
  };

  return (
    <ScrollView
      style={styles.overlay}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Math.max(insets.top, 16) + 24,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
      bounces={false}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>LLAMADA ENTRANTE</Text>
        <Text style={styles.title}>{call.doorLabel}</Text>
        <Text style={styles.subtitle}>Visitante en la puerta exterior</Text>
        <Text style={styles.timer}>
          {remaining > 0 ? `Contestar en ${remaining} s` : 'Tiempo agotado'}
        </Text>
      </View>

      <View style={styles.pulseRing}>
        <View style={styles.pulseInner}>
          <Phone size={64} color="#FFFFFF" />
        </View>
      </View>

      <Text style={styles.scrollHint}></Text>
      {/* <Text style={styles.scrollHint}>Desliza hacia abajo si no ves los botones</Text> */}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={handleReject}
          onPressIn={() => console.log('[TabletCall] press IN rechazar')}
          activeOpacity={0.85}
          accessibilityLabel="Rechazar llamada"
        >
          <PhoneOff size={28} color="#FFFFFF" />
          <Text style={styles.actionText}>RECHAZAR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.answerButton]}
          onPress={handleAnswer}
          onPressIn={() => console.log('[TabletCall] press IN contestar')}
          activeOpacity={0.85}
          accessibilityLabel="Contestar llamada"
        >
          <Phone size={28} color="#FFFFFF" />
          <Text style={styles.actionText}>CONTESTAR</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#1a1d21',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 24,
  },
  header: {
    alignItems: 'center',
  },
  kicker: {
    color: '#9aa0a6',
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#c4c7cc',
    fontSize: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  timer: {
    color: '#7dd3fc',
    fontSize: 16,
    marginTop: 20,
  },
  pulseRing: {
    alignSelf: 'center',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  pulseInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollHint: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
    marginTop: -8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 88,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  rejectButton: {
    backgroundColor: '#dc2626',
  },
  answerButton: {
    backgroundColor: '#16a34a',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
