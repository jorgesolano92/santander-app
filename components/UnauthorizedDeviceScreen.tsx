import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

type Props = {
  androidId: string;
  reason?: string | null;
  checking?: boolean;
  onRetry?: () => void;
  onOpenConfig?: () => void;
};

function reasonMessage(reason?: string | null): string {
  switch (reason) {
    case 'not_registered':
      return 'Este dispositivo no está en la lista de tablets autorizadas del panel.';
    case 'disabled':
      return 'Esta tablet está registrada pero desactivada en el panel.';
    case 'android_id_missing':
      return 'No se pudo obtener el identificador del dispositivo.';
    case 'panel_unreachable':
      return 'No se pudo contactar con el panel para verificar la autorización.';
    case 'no_config':
      return 'Configura la IP del panel y vuelve a comprobar la autorización.';
    default:
      return 'Esta tablet no tiene autorización para usar la aplicación.';
  }
}

export default function UnauthorizedDeviceScreen({
  androidId,
  reason,
  checking,
  onRetry,
  onOpenConfig,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Tablet no autorizada</Text>
        <Text style={styles.body}>{reasonMessage(reason)}</Text>
        <Text style={styles.hint}>
          En el panel: Configuración tablet → Tablets autorizadas. Añade el ID que aparece abajo.
        </Text>

        <View style={styles.idBox}>
          <Text style={styles.idLabel}>Android ID</Text>
          <Text style={styles.idValue} selectable>
            {androidId || '—'}
          </Text>
        </View>

        <View style={styles.actions}>
          {onRetry ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onRetry}
              disabled={!!checking}
            >
              {checking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Reintentar</Text>
              )}
            </TouchableOpacity>
          ) : null}
          {onOpenConfig ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onOpenConfig}>
              <Text style={styles.secondaryBtnText}>Configuración</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Text style={styles.footerId} selectable>
        ID: {androidId || '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#374151',
  },
  title: {
    color: '#F87171',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  body: {
    color: '#E5E7EB',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 10,
  },
  hint: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  idBox: {
    backgroundColor: '#0B1220',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#4B5563',
    marginBottom: 18,
  },
  idLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  idValue: {
    color: '#F9FAFB',
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6B7280',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryBtnText: {
    color: '#E5E7EB',
    fontWeight: '600',
    fontSize: 14,
  },
  footerId: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
