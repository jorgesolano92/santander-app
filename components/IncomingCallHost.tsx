import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import IncomingCallOverlay from '@/components/IncomingCallOverlay';
import type { IntercomConfig } from '@/components/IntercomConfigurationModal';
import {
  invokeAnswer,
  invokeExpired,
  invokeReject,
} from '@/services/incomingCallUiBridge';
import { wakeTablet } from '@/services/tabletWake';
import {
  tabletCallService,
  type IncomingCallPayload,
} from '@/services/tabletCallService';

function doorToIndex(door: string): number {
  const d = door.trim().toLowerCase();
  if (d === 'p1' || d === '1') return 0;
  if (d === 'p2' || d === '2') return 1;
  if (d === 'p3' || d === '3') return 2;
  if (d === 'p4' || d === '4') return 3;
  return 0;
}

/** Overlay de llamada a nivel raíz (hermano del Stack), fuera de la pantalla nativa. */
export default function IncomingCallHost() {
  const [call, setCall] = useState<IncomingCallPayload | null>(null);
  const [intercomConfig, setIntercomConfig] = useState<IntercomConfig | null>(null);
  const [doorName, setDoorName] = useState('');

  useEffect(() => {
    const onIncoming = async (payload: IncomingCallPayload) => {
      console.log('[TabletCall] incoming_call UI', payload.callId);
      wakeTablet();
      try {
        const raw = await AsyncStorage.getItem('new_door_config');
        if (raw) {
          const parsed = JSON.parse(raw);
          const doors = Array.isArray(parsed?.doors) ? parsed.doors : [];
          const idx = doorToIndex(payload.door);
          const door = doors[idx];
          setIntercomConfig(door?.intercom ?? null);
          setDoorName(String(door?.name || payload.doorLabel || ''));
        } else {
          setIntercomConfig(null);
          setDoorName(payload.doorLabel);
        }
      } catch {
        setIntercomConfig(null);
        setDoorName(payload.doorLabel);
      }
      setCall(payload);
    };
    const onClear = () => {
      setCall(null);
      setIntercomConfig(null);
    };

    tabletCallService.on('incoming_call', onIncoming);
    tabletCallService.on('call_ended', onClear);
    tabletCallService.on('call_accepted', onClear);

    return () => {
      tabletCallService.off('incoming_call', onIncoming);
      tabletCallService.off('call_ended', onClear);
      tabletCallService.off('call_accepted', onClear);
    };
  }, []);

  return (
    <Modal
      visible={!!call}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!call) return;
        setCall(null);
        invokeReject(call);
      }}
    >
      {call ? (
        <View style={styles.host} pointerEvents="auto">
          <IncomingCallOverlay
            call={call}
            intercomConfig={intercomConfig}
            doorName={doorName}
            onAnswer={(c) => {
              setCall(null);
              invokeAnswer(c);
            }}
            onReject={(c) => {
              setCall(null);
              invokeReject(c);
            }}
            onExpired={(c) => {
              setCall(null);
              invokeExpired(c);
            }}
          />
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
    elevation: 999999,
  },
});
