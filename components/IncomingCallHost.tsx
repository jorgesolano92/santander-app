import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import IncomingCallOverlay from '@/components/IncomingCallOverlay';
import {
  invokeAnswer,
  invokeExpired,
  invokeReject,
} from '@/services/incomingCallUiBridge';
import {
  tabletCallService,
  type IncomingCallPayload,
} from '@/services/tabletCallService';

/** Overlay de llamada a nivel raíz (hermano del Stack), fuera de la pantalla nativa. */
export default function IncomingCallHost() {
  const [call, setCall] = useState<IncomingCallPayload | null>(null);

  useEffect(() => {
    const onIncoming = (payload: IncomingCallPayload) => {
      console.log('[TabletCall] incoming_call UI', payload.callId);
      setCall(payload);
    };
    const onClear = () => setCall(null);

    tabletCallService.on('incoming_call', onIncoming);
    tabletCallService.on('call_ended', onClear);
    tabletCallService.on('call_accepted', onClear);

    return () => {
      tabletCallService.off('incoming_call', onIncoming);
      tabletCallService.off('call_ended', onClear);
      tabletCallService.off('call_accepted', onClear);
    };
  }, []);

  if (!call) return null;

  return (
    <View style={styles.host} pointerEvents="auto">
      <IncomingCallOverlay
        call={call}
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
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
    elevation: 999999,
  },
});
