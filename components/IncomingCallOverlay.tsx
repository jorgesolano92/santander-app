import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Platform,
  BackHandler,
  Dimensions,
} from 'react-native';
import { Phone, PhoneOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import DoorVideoStream from '@/components/DoorVideoStream';
import type { IntercomConfig } from '@/components/IntercomConfigurationModal';
import { startCallRingtone, stopCallRingtone } from '@/services/callRingtone';
import type { IncomingCallPayload } from '@/services/tabletCallService';

const RING_PATTERN = [0, 900, 400, 900, 400, 900] as const;

type Props = {
  call: IncomingCallPayload;
  onAnswer: (call: IncomingCallPayload) => void;
  onReject: (call: IncomingCallPayload) => void;
  onExpired?: (call: IncomingCallPayload) => void;
  /** Config RTSP del videoportero que llama (sin audio). */
  intercomConfig?: IntercomConfig | null;
  doorName?: string;
};

export default function IncomingCallOverlay({
  call,
  onAnswer,
  onReject,
  onExpired,
  intercomConfig,
  doorName,
}: Props) {
  const [remaining, setRemaining] = useState(0);
  const vibrateTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredRef = useRef(false);
  const callRef = useRef(call);
  callRef.current = call;
  const screen = Dimensions.get('window');

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
    void stopCallRingtone();
    Vibration.cancel();
    onAnswer(call);
  };

  const handleReject = () => {
    void stopCallRingtone();
    Vibration.cancel();
    onReject(call);
  };

  return (
    <View style={styles.overlay}>
      {intercomConfig?.cameraIP ? (
        <View style={styles.videoLayer} pointerEvents="none">
          <DoorVideoStream
            intercomConfig={intercomConfig}
            doorName={doorName || call.doorLabel}
            forceMuted
            autoStartInline
            hideControls
            isExpanded
            expandedVideoHeight={screen.height}
          />
        </View>
      ) : (
        <View style={styles.fallbackBg} />
      )}

      <View style={styles.scrim} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>LLAMADA ENTRANTE</Text>
          <Text style={styles.title}>{call.doorLabel}</Text>
          <Text style={styles.subtitle}>Visitante en videoportero</Text>
          <Text style={styles.timer}>
            {remaining > 0 ? `Contestar en ${remaining} s` : 'Tiempo agotado'}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            activeOpacity={0.85}
            accessibilityLabel="Rechazar llamada"
          >
            <PhoneOff size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>RECHAZAR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.answerButton]}
            onPress={handleAnswer}
            activeOpacity={0.85}
            accessibilityLabel="Contestar llamada"
          >
            <Phone size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>CONTESTAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#1a1d21',
  },
  videoLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1d21',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  kicker: {
    color: '#E2E8F0',
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 12,
    fontWeight: '700',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: '#F1F5F9',
    fontSize: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  timer: {
    color: '#7dd3fc',
    fontSize: 16,
    marginTop: 20,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
  },
  actionButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rejectButton: {
    backgroundColor: '#DC3545',
  },
  answerButton: {
    backgroundColor: '#28A745',
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
