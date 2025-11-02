/**
 * Control de Audio SIP para AXIS I8116-E
 * 
 * Implementación completa de comunicación SIP usando jssip
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react-native';
import { getAxisSIPService, cleanupAxisSIPService, AxisSIPConfig, AxisSIPState } from '../services/AxisSIPService';
import { IntercomConfig } from './IntercomConfigurationModal';

interface AxisAudioControlProps {
  intercomConfig: IntercomConfig;
  doorName: string;
  isVisible?: boolean;
}

export default function AxisAudioControl({ 
  intercomConfig, 
  doorName, 
  isVisible = true 
}: AxisAudioControlProps) {
  const [sipState, setSipState] = useState<AxisSIPState>({
    isCallActive: false,
    isConnected: false,
    isRinging: false,
    error: null,
    callDuration: 0,
  });
  const [isMuted, setIsMuted] = useState(false);
  
  // Obtener instancia SIP para este dispositivo
  const deviceId = `${intercomConfig.cameraIP}-${doorName}`;
  const sipService = getAxisSIPService(deviceId);

  useEffect(() => {
    // Listener para cambios de estado
    const handleStateChange = (newState: AxisSIPState) => {
      setSipState(newState);
    };

    sipService.addListener(handleStateChange);

    return () => {
      sipService.removeListener(handleStateChange);
      cleanupAxisSIPService(deviceId);
    };
  }, [deviceId, sipService]);

  const startCall = async () => {
    if (!intercomConfig.cameraIP) {
      Alert.alert('Error', 'No hay IP configurada');
      return;
    }

    try {
      const config: AxisSIPConfig = {
        deviceIP: intercomConfig.cameraIP,
        sipUserId: 'ceroideas',
        sipAccount: 'tests',
        localSIPPort: 5060,
      };

      const success = await sipService.startSIPCall(config);
      if (success) {
        console.log(`✅ Llamada SIP iniciada a ${deviceId}`);
      } else {
        Alert.alert('Error', 'No se pudo iniciar la llamada');
      }
    } catch (error) {
      console.error(`❌ Error iniciando llamada:`, error);
      Alert.alert('Error', 'Error iniciando llamada SIP');
    }
  };

  const endCall = async () => {
    try {
      await sipService.endSIPCall();
      console.log(`✅ Llamada terminada: ${deviceId}`);
    } catch (error) {
      console.error(`❌ Error terminando llamada:`, error);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    sipService.muteMicrophone(!isMuted);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>AXIS I8116-E - SIP Audio</Text>
        {sipState.isCallActive && (
          <Text style={styles.durationText}>{formatDuration(sipState.callDuration)}</Text>
        )}
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {sipState.isRinging ? '🔔 LLAMANDO...' :
           sipState.isConnected ? '🟢 LLAMADA ACTIVA' :
           sipState.isCallActive ? '🟡 CONECTANDO...' :
           sipState.error ? '🔴 ERROR' : '⚪ DESCONECTADO'}
        </Text>
        {sipState.error && (
          <Text style={styles.errorText}>• {sipState.error}</Text>
        )}
      </View>

      <View style={styles.controlsContainer}>
        {/* Botón Llamar/Colgar */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            sipState.isCallActive ? styles.endCallButton : styles.startCallButton
          ]}
          onPress={sipState.isCallActive ? endCall : startCall}
          disabled={!intercomConfig.cameraIP}
        >
          {sipState.isCallActive ? (
            <PhoneOff size={20} color="#FFFFFF" />
          ) : (
            <Phone size={20} color="#FFFFFF" />
          )}
          <Text style={styles.controlButtonText}>
            {sipState.isCallActive ? 'COLGAR' : 'LLAMAR'}
          </Text>
        </TouchableOpacity>

        {/* Botón Silenciar */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            styles.muteButton,
            !sipState.isConnected && styles.disabledButton
          ]}
          onPress={toggleMute}
          disabled={!sipState.isConnected}
        >
          {isMuted ? (
            <MicOff size={16} color="#FFFFFF" />
          ) : (
            <Mic size={16} color="#FFFFFF" />
          )}
          <Text style={styles.controlButtonText}>
            {isMuted ? 'SILENCIADO' : 'ACTIVO'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.infoText}>
        {Platform.OS === 'web' 
          ? '⚠️ Modo prueba (solo micrófono local). Audio bidireccional completo en Android.'
          : 'Audio bidireccional via WebRTC (AXIS I8116-E)'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  headerText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  durationText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 5,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginHorizontal: 5,
    flex: 1,
    justifyContent: 'center',
  },
  controlButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 12,
    fontWeight: 'bold',
  },
  startCallButton: {
    backgroundColor: '#10B981',
  },
  endCallButton: {
    backgroundColor: '#EF4444',
  },
  muteButton: {
    backgroundColor: '#6B7280',
    flex: 0.6,
  },
  disabledButton: {
    opacity: 0.5,
  },
  infoText: {
    color: '#94A3B8',
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
