import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';

import type { CoceMessage } from '@/services/CoceMessageService';

type Props = {
  visible: boolean;
  messages: CoceMessage[];
  onClose: () => void;
};

function formatWhen(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CoceMessagesModal({ visible, messages, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.heading}>Mensajes del COCE</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X size={22} color="#334155" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Solo lectura · no se puede responder</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {messages.length === 0 ? (
              <Text style={styles.empty}>No hay mensajes recibidos.</Text>
            ) : (
              messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[styles.card, msg.urgent && styles.cardUrgent]}
                >
                  <View style={styles.cardHeader}>
                    {msg.urgent ? <AlertTriangle size={18} color="#B91C1C" /> : null}
                    <Text style={[styles.cardTitle, msg.urgent && styles.cardTitleUrgent]}>
                      {msg.title}
                    </Text>
                  </View>
                  <Text style={styles.cardBody}>{msg.body}</Text>
                  <Text style={styles.cardMeta}>{formatWhen(msg.receivedAt)}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    color: '#64748B',
    fontSize: 13,
  },
  list: {
    maxHeight: 520,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 10,
  },
  empty: {
    color: '#64748B',
    fontSize: 15,
    paddingVertical: 24,
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  cardUrgent: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardTitleUrgent: {
    color: '#991B1B',
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
  },
  cardMeta: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
  },
});
