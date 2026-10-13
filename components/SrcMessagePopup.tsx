import { useEffect } from 'react';
import { Audio } from 'expo-av';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { AlertTriangle, MessageCircle } from 'lucide-react-native';

import type { CoceMessage } from '@/services/CoceMessageService';

const ALERT_SOUND = require('@/assets/sounds/message_alert.wav');

type Props = {
  /** Cola de mensajes pendientes de confirmar; se muestra el primero. */
  queue: CoceMessage[];
  onAcknowledge: (message: CoceMessage) => void;
};

async function playAlert(times: number): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(ALERT_SOUND, { volume: 1.0 });
    for (let i = 0; i < times; i += 1) {
      await sound.setPositionAsync(0);
      await sound.playAsync();
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
    await sound.unloadAsync();
  } catch {
    // sin audio: el aviso visual sigue en pantalla
  }
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SrcMessagePopup({ queue, onAcknowledge }: Props) {
  const message = queue[0] ?? null;
  const { width } = useWindowDimensions();
  const compact = width < 900;

  useEffect(() => {
    if (!message) return;
    void playAlert(message.urgent ? 3 : 1);
  }, [message?.id]);

  if (!message) return null;

  const urgent = message.urgent;
  const accent = urgent ? '#B91C1C' : '#1D4ED8';

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={[styles.screen, urgent ? styles.screenUrgent : styles.screenNormal]}>
        <View style={[styles.banner, { backgroundColor: accent }]}>
          {urgent ? (
            <AlertTriangle size={compact ? 30 : 40} color="#FFFFFF" />
          ) : (
            <MessageCircle size={compact ? 30 : 40} color="#FFFFFF" />
          )}
          <Text style={[styles.bannerText, compact && styles.bannerTextCompact]}>
            {urgent ? 'MENSAJE URGENTE DEL SRC' : 'MENSAJE DEL SRC'}
          </Text>
          {queue.length > 1 ? (
            <Text style={styles.counter}>1 de {queue.length}</Text>
          ) : null}
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          <Text style={[styles.title, compact && styles.titleCompact, { color: accent }]}>
            {message.title}
          </Text>
          {message.body ? (
            <Text style={[styles.body, compact && styles.bodyCompact]}>{message.body}</Text>
          ) : null}
          <Text style={styles.meta}>Recibido {formatWhen(message.receivedAt)}</Text>
        </ScrollView>

        <TouchableOpacity
          style={[styles.ackButton, { backgroundColor: accent }]}
          onPress={() => onAcknowledge(message)}
          accessibilityRole="button"
          accessibilityLabel="Confirmar lectura del mensaje"
        >
          <Text style={[styles.ackText, compact && styles.ackTextCompact]}>ENTENDIDO</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    gap: 20,
  },
  screenNormal: {
    backgroundColor: '#EFF6FF',
  },
  screenUrgent: {
    backgroundColor: '#FEF2F2',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  bannerText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bannerTextCompact: {
    fontSize: 22,
  },
  counter: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  contentInner: {
    padding: 32,
    gap: 24,
  },
  title: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 52,
  },
  titleCompact: {
    fontSize: 32,
    lineHeight: 40,
  },
  body: {
    fontSize: 32,
    lineHeight: 44,
    color: '#0F172A',
  },
  bodyCompact: {
    fontSize: 24,
    lineHeight: 34,
  },
  meta: {
    fontSize: 18,
    color: '#64748B',
  },
  ackButton: {
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  ackText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  ackTextCompact: {
    fontSize: 24,
  },
});
