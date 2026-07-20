import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';

import type { CoceMessage } from '@/services/CoceMessageService';

type Props = {
  message: CoceMessage | null;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 12000;

export function CoceMessageToast({ message, onDismiss }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <View
      style={[
        styles.wrap,
        message.urgent ? styles.wrapUrgent : styles.wrapNormal,
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.header}>
        {message.urgent ? (
          <AlertTriangle size={20} color="#B91C1C" />
        ) : null}
        <Text style={[styles.title, message.urgent && styles.titleUrgent]} numberOfLines={2}>
          {message.title}
        </Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={12} accessibilityLabel="Cerrar aviso">
          <X size={18} color="#64748B" />
        </TouchableOpacity>
      </View>
      <Text style={styles.body} numberOfLines={4}>
        {message.body}
      </Text>
      {message.urgent ? (
        <Text style={styles.urgentTag}>Mensaje urgente del COCE</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: Platform.OS === 'web' ? 360 : 320,
    maxWidth: '92%',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1200,
  },
  wrapNormal: {
    borderColor: '#CBD5E1',
  },
  wrapUrgent: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  titleUrgent: {
    color: '#991B1B',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
  },
  urgentTag: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
    textTransform: 'uppercase',
  },
});
