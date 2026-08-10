import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';

import { doorControlService } from '@/services/DoorControlService';
import { showOperationError, showOperationInfo } from '@/utils/showOperationError';

const WEEKDAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const WEEKDAY_LABELS: Record<(typeof WEEKDAY_KEYS)[number], string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

type Slot = {
  start: string;
  end: string;
  rule_key: string;
  active: boolean;
};

type ScheduleConfig = {
  enabled: boolean;
  days: Record<string, Slot[]>;
  location?: Record<string, unknown>;
};

type ModeOption = { key: string; enabled?: boolean };

type Props = {
  styles?: Record<string, unknown>;
};

export default function TabletSchedulesPanel(_props: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ScheduleConfig | null>(null);
  const [modes, setModes] = useState<ModeOption[]>([]);
  const [dayKey, setDayKey] = useState<(typeof WEEKDAY_KEYS)[number]>('monday');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sched, modeList] = await Promise.all([
        doorControlService.fetchSchedules(),
        doorControlService.fetchModesList(),
      ]);
      setConfig(sched);
      setModes(modeList);
    } catch (e) {
      showOperationError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateSlot = (index: number, field: keyof Slot, value: string | boolean) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const days = { ...prev.days };
      const slots = [...(days[dayKey] || [])];
      slots[index] = { ...slots[index], [field]: value };
      days[dayKey] = slots;
      return { ...prev, days };
    });
  };

  const addSlot = () => {
    setConfig((prev) => {
      if (!prev) return prev;
      const days = { ...prev.days };
      const slots = [...(days[dayKey] || [])];
      slots.push({
        start: '09:00',
        end: '18:00',
        rule_key: modes[0]?.key || 'horario_automatico',
        active: true,
      });
      days[dayKey] = slots;
      return { ...prev, days };
    });
  };

  const removeSlot = (index: number) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const days = { ...prev.days };
      days[dayKey] = (days[dayKey] || []).filter((_, i) => i !== index);
      return { ...prev, days };
    });
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const saved = await doorControlService.saveSchedules(config);
      setConfig(saved);
      showOperationInfo('Horarios guardados en el panel');
    } catch (e) {
      showOperationError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <View style={local.card}>
        <ActivityIndicator color="#495057" />
        <Text style={local.hint}>Cargando horarios del panel…</Text>
      </View>
    );
  }

  const slots = config.days?.[dayKey] || [];

  return (
    <View style={local.card}>
      <View style={local.row}>
        <Text style={local.title}>Horarios semanales (panel)</Text>
        <Switch
          value={!!config.enabled}
          onValueChange={(v) => setConfig((prev) => (prev ? { ...prev, enabled: v } : prev))}
          trackColor={{ false: '#CED4DA', true: '#28A745' }}
        />
      </View>
      <Text style={local.hint}>
        Mismas franjas que el software de puertas. El modo manual se respeta hasta la siguiente franja.
      </Text>

      <View style={local.dayTabs}>
        {WEEKDAY_KEYS.map((k) => (
          <TouchableOpacity
            key={k}
            style={[local.dayTab, dayKey === k && local.dayTabActive]}
            onPress={() => setDayKey(k)}
          >
            <Text style={[local.dayTabText, dayKey === k && local.dayTabTextActive]}>
              {WEEKDAY_LABELS[k].slice(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {slots.map((slot, index) => (
        <View key={`${dayKey}-${index}`} style={local.slotCard}>
          <View style={local.row}>
            <Text style={local.slotLabel}>Franja {index + 1}</Text>
            <Switch
              value={!!slot.active}
              onValueChange={(v) => updateSlot(index, 'active', v)}
              trackColor={{ false: '#CED4DA', true: '#28A745' }}
            />
          </View>
          <View style={local.slotRow}>
            <TextInput
              style={local.input}
              value={slot.start}
              onChangeText={(t) => updateSlot(index, 'start', t)}
              placeholder="08:00"
            />
            <Text style={local.slotLabel}>→</Text>
            <TextInput
              style={local.input}
              value={slot.end}
              onChangeText={(t) => updateSlot(index, 'end', t)}
              placeholder="15:00"
            />
          </View>
          <TextInput
            style={local.inputWide}
            value={slot.rule_key}
            onChangeText={(t) => updateSlot(index, 'rule_key', t)}
            placeholder="horario_automatico"
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => removeSlot(index)}>
            <Text style={local.remove}>Eliminar franja</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={local.actions}>
        <TouchableOpacity style={local.btnSecondary} onPress={addSlot}>
          <Text style={local.btnSecondaryText}>AÑADIR FRANJA</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[local.btnPrimary, saving && { opacity: 0.7 }]}
          onPress={() => void save()}
          disabled={saving}
        >
          <Text style={local.btnPrimaryText}>{saving ? 'GUARDANDO…' : 'GUARDAR HORARIOS'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
  },
  hint: {
    fontSize: 12,
    color: '#6C757D',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E9ECEF',
  },
  dayTabActive: {
    backgroundColor: '#495057',
  },
  dayTabText: {
    fontWeight: '700',
    color: '#495057',
    fontSize: 12,
  },
  dayTabTextActive: {
    color: '#FFFFFF',
  },
  slotCard: {
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    backgroundColor: '#F8F9FA',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotLabel: {
    fontWeight: '600',
    color: '#495057',
  },
  input: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inputWide: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  remove: {
    color: '#DC3545',
    fontWeight: '600',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#E9ECEF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontWeight: '700',
    color: '#495057',
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#28A745',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
