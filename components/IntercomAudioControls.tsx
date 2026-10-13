import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Mic, Minus, Plus, SlidersHorizontal, Volume2 } from 'lucide-react-native';
import { doorControlService, type IntercomAudioLevels } from '@/services/DoorControlService';

type Props = {
  door: 'p1' | 'p2';
  doorName: string;
  variant?: 'inline' | 'floating';
};

type Channel = 'speaker' | 'microphone';

const SAVE_DELAY_MS = 600;

export default function IntercomAudioControls({ door, doorName, variant = 'inline' }: Props) {
  const [open, setOpen] = useState(false);
  const [levels, setLevels] = useState<IntercomAudioLevels | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ speaker?: number; microphone?: number }>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLevels(await doorControlService.getIntercomAudio(door));
    } catch (e: any) {
      setError(e?.message || 'No se pudo leer la placa');
    } finally {
      setLoading(false);
    }
  }, [door]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const flush = useCallback(async () => {
    timer.current = null;
    const changes = pending.current;
    pending.current = {};
    if (changes.speaker === undefined && changes.microphone === undefined) return;
    setSaving(true);
    setError(null);
    try {
      setLevels(await doorControlService.setIntercomAudio(door, changes));
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar en la placa');
      void load();
    } finally {
      setSaving(false);
    }
  }, [door, load]);

  const step = (channel: Channel, delta: number) => {
    if (!levels) return;
    const next = Math.max(levels.min, Math.min(levels.max, levels[channel] + delta));
    if (next === levels[channel]) return;
    setLevels({ ...levels, [channel]: next });
    pending.current = { ...pending.current, [channel]: next };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  };

  const renderRow = (channel: Channel, label: string, Icon: typeof Volume2) => {
    const value = levels?.[channel] ?? 0;
    const max = levels?.max ?? 10;
    return (
      <View style={styles.row}>
        <View style={styles.rowLabel}>
          <Icon size={22} color="#212529" />
          <Text style={styles.rowLabelText}>{label}</Text>
        </View>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepButton, (!levels || value <= (levels?.min ?? 0)) && styles.stepButtonDisabled]}
            onPress={() => step(channel, -1)}
            disabled={!levels}
            accessibilityLabel={`Bajar ${label}`}
          >
            <Minus size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.meter}>
            <View style={styles.meterBars}>
              {Array.from({ length: max }, (_, i) => (
                <View key={i} style={[styles.meterBar, i < value && styles.meterBarOn]} />
              ))}
            </View>
            <Text style={styles.meterValue}>{levels ? `${value} / ${max}` : '—'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.stepButton, (!levels || value >= max) && styles.stepButtonDisabled]}
            onPress={() => step(channel, 1)}
            disabled={!levels}
            accessibilityLabel={`Subir ${label}`}
          >
            <Plus size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={variant === 'floating' ? styles.triggerFloating : styles.trigger}
        onPress={() => setOpen(true)}
        accessibilityLabel={`Audio de la placa ${doorName}`}
      >
        <SlidersHorizontal size={16} color={variant === 'floating' ? '#FFFFFF' : '#495057'} />
        <Text style={variant === 'floating' ? styles.triggerFloatingText : styles.triggerText}>AUDIO PLACA</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} onPress={() => undefined}>
            <Text style={styles.title}>Audio del intercomunicador</Text>
            <Text style={styles.subtitle}>
              {doorName} · se aplica en la placa de la puerta, no en la tablet
            </Text>

            {loading && !levels ? (
              <ActivityIndicator size="large" color="#EC1C24" style={{ marginVertical: 24 }} />
            ) : (
              <>
                {renderRow('speaker', 'Altavoz', Volume2)}
                {renderRow('microphone', 'Micrófono', Mic)}
              </>
            )}

            <View style={styles.statusLine}>
              {saving ? <Text style={styles.statusText}>Guardando en la placa…</Text> : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            <View style={styles.footer}>
              {error && !levels ? (
                <TouchableOpacity style={styles.secondaryButton} onPress={() => void load()}>
                  <Text style={styles.secondaryButtonText}>REINTENTAR</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.primaryButton} onPress={() => setOpen(false)}>
                <Text style={styles.primaryButtonText}>CERRAR</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    backgroundColor: '#FFFFFF',
  },
  triggerText: { fontSize: 13, fontWeight: '700', color: '#495057', letterSpacing: 0.4 },
  triggerFloating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: 'rgba(52, 58, 64, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  triggerFloatingText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#212529' },
  subtitle: { fontSize: 14, color: '#6C757D', marginTop: 4, marginBottom: 16 },
  row: { marginVertical: 10 },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  rowLabelText: { fontSize: 17, fontWeight: '700', color: '#212529' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EC1C24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: { opacity: 0.35 },
  meter: { flex: 1, alignItems: 'center' },
  meterBars: { flexDirection: 'row', gap: 4, width: '100%' },
  meterBar: { flex: 1, height: 18, borderRadius: 3, backgroundColor: '#E9ECEF' },
  meterBarOn: { backgroundColor: '#28A745' },
  meterValue: { marginTop: 6, fontSize: 15, fontWeight: '700', color: '#495057' },
  statusLine: { minHeight: 22, marginTop: 8 },
  statusText: { fontSize: 13, color: '#6C757D' },
  errorText: { fontSize: 13, color: '#DC3545' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  primaryButton: { backgroundColor: '#495057', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.6 },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  secondaryButtonText: { color: '#495057', fontWeight: '700' },
});
