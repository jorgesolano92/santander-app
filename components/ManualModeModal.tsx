import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { X, MessageCircle, DoorOpen, PhoneCall, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react-native';
import { ScrollView } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDoorControl } from '@/hooks/useDoorControl';
import DoorVideoStream from './DoorVideoStream';
import { IntercomConfig } from './IntercomConfigurationModal';

interface DoorConfig {
  enabled: boolean;
  name: string;
  ipExterior: string;
  ipInterior: string;
  intercom: IntercomConfig;
}

interface ManualModeModalProps {
  visible: boolean;
  onClose: () => void;
  onChangeMode: () => void;
  onEmergency: () => void;
  communicatingDoors: Set<string>;
  onCommunicate: (doorId: string, doorName: string) => void;
  getDoorStatus: (doorId: string) => {
    status: string;
    isOpen: boolean;
    isOpening: boolean;
    isClosing: boolean;
  };
  isDoorButtonDisabled: (doorId: string) => boolean;
  getDoorButtonText: (doorId: string) => string;
  intercomConfigs: DoorConfig[];
}

export default function ManualModeModal({ 
  visible, 
  onClose, 
  onChangeMode, 
  onEmergency,
  communicatingDoors,
  onCommunicate,
  getDoorStatus,
  isDoorButtonDisabled,
  getDoorButtonText,
  intercomConfigs
}: ManualModeModalProps) {
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

  // Estado local para la configuración de puertas
  const [currentIntercomConfigs, setCurrentIntercomConfigs] = useState<DoorConfig[]>(intercomConfigs || []);
  
  // Filter enabled doors for styling calculations
  const enabledDoors = currentIntercomConfigs.filter(door => door.enabled);
  
  // Cargar configuración cuando el modal se abre
  useEffect(() => {
    if (visible) {
      loadCurrentConfig();
    }
  }, [visible]);
  
  // Actualizar cuando cambie la prop
  useEffect(() => {
    if (intercomConfigs) {
      setCurrentIntercomConfigs(intercomConfigs);
    }
  }, [intercomConfigs]);
  
  const loadCurrentConfig = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem('new_door_config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        if (parsedConfig.doors) {
          setCurrentIntercomConfigs(parsedConfig.doors);
          console.log('🔄 Configuración de puertas cargada en ManualModeModal:', parsedConfig.doors);
        }
      }
    } catch (error) {
      console.error('❌ Error cargando configuración en ManualModeModal:', error);
    }
  };

  const { 
    controlDoor, 
    sipCallState, 
    startIntercomCall, 
    endIntercomCall, 
    muteMicrophone, 
    setSpeakerphone, 
    activeSipCallDoorId 
  } = useDoorControl();

  // Obtener configuraciones de intercomunicador para cada puerta
  const getIntercomConfig = (doorIndex: number): IntercomConfig | null => {
    if (intercomConfigs && intercomConfigs[doorIndex] && intercomConfigs[doorIndex].enabled) {
      return intercomConfigs[doorIndex].intercom;
    }
    return null;
  };

  const handleCommunicate = async (doorId: string, doorName: string) => {
    // Find the door configuration by doorId
    const doorIndex = parseInt(doorId.replace('P', '')) - 1;
    const door = enabledDoors[doorIndex];
    const intercomConfig = door?.intercom;
    
    if (!intercomConfig) {
      console.error('❌ No hay configuración de intercomunicador para', doorName);
      return;
    }
    
    // Check if there's already an active call
    if (sipCallState?.isActive) {
      if (activeSipCallDoorId === doorId) {
        // End the current call
        console.log('📞 Finalizando llamada con', doorName);
        await endIntercomCall();
      } else {
        console.log('❌ Ya hay una llamada activa con otra puerta');
        return;
      }
    } else {
      // Start a new call
      console.log('📞 Iniciando llamada SIP con', doorName);
      const success = await startIntercomCall(intercomConfig);
      if (success) {
        console.log('✅ Llamada SIP iniciada con', doorName);
      } else {
        console.error('❌ Error iniciando llamada SIP con', doorName);
      }
    }
  };

  const handleOpenDoor = async (doorId: 'P1' | 'P2', doorName: string) => {
    const door = getDoorStatus(doorId);
    const action = door.isOpen ? 'close' : 'open';
    const actionText = action === 'open' ? 'Abrir' : 'Cerrar';
    
    console.log(`🚪 ${actionText} ${doorName}`);
    const success = await controlDoor(doorId, action);
    if (success) {
      console.log(`✅ ${doorName} - Comando ${actionText.toLowerCase()} ejecutado correctamente`);
    } else {
      console.error(`❌ Error ${actionText.toLowerCase()} ${doorName}`);
    }
  };

  const handleMuteMicrophone = async () => {
    if (sipCallState) {
      await muteMicrophone(!sipCallState.isMuted);
    }
  };

  const handleToggleSpeaker = async () => {
    if (sipCallState) {
      await setSpeakerphone(!sipCallState.isSpeakerOn);
    }
  };

  const getCallButtonText = (doorId: string) => {
    if (activeSipCallDoorId === doorId && sipCallState?.isActive) {
      if (sipCallState.isConnected) {
        return `FINALIZAR (${Math.floor(sipCallState.duration / 60)}:${(sipCallState.duration % 60).toString().padStart(2, '0')})`;
      } else {
        return 'CONECTANDO...';
      }
    }
    return 'COMUNICAR';
  };

  const getCallButtonStyle = (doorId: string) => {
    if (activeSipCallDoorId === doorId && sipCallState?.isActive) {
      if (sipCallState.isConnected) {
        return [styles.doorControlButton, styles.doorControlButtonConnected];
      } else {
        return [styles.doorControlButton, styles.doorControlButtonConnecting];
      }
    }
    return styles.doorControlButton;
  };

  const getCallButtonTextStyle = (doorId: string) => {
    if (activeSipCallDoorId === doorId && sipCallState?.isActive) {
      return [styles.doorControlButtonText, styles.doorControlButtonConnectedText];
    }
    return styles.doorControlButtonText;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    scrollContent: {
      flexGrow: 1,
    },
    header: {
      backgroundColor: '#495057',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      paddingVertical: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    headerTitle: {
      fontSize: isSmallTablet ? 16 : isLargeTablet ? 20 : 18,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    configButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    configButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    closeButton: {
      padding: 8,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: isSmallTablet ? 12 : isLargeTablet ? 32 : 20,
      paddingVertical: isSmallTablet ? 8 : isLargeTablet ? 24 : 16,
      minHeight: 600,
    },
    modeHeader: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: isSmallTablet ? 12 : isLargeTablet ? 24 : 18,
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: isSmallTablet ? 12 : isLargeTablet ? 24 : 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: '#E9ECEF',
    },
    infoIcon: {
      width: isSmallTablet ? 20 : 24,
      height: isSmallTablet ? 20 : 24,
      borderRadius: isSmallTablet ? 10 : 12,
      backgroundColor: '#495057',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: isSmallTablet ? 12 : 16,
      flexShrink: 0,
    },
    infoIconText: {
      fontSize: isSmallTablet ? 12 : 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    modeHeaderContent: {
      flex: 1,
    },
    modeTitle: {
      fontSize: isSmallTablet ? 18 : isLargeTablet ? 24 : 21,
      fontWeight: '700',
      color: '#212529',
      marginBottom: isSmallTablet ? 6 : isLargeTablet ? 12 : 8,
      letterSpacing: 0.3,
    },
    modeDescription: {
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 16 : 13,
      color: '#6C757D',
      lineHeight: isSmallTablet ? 15 : isLargeTablet ? 24 : 18,
      fontWeight: '400',
    },
    changeModeButton: {
      backgroundColor: '#F8F9FA',
      paddingHorizontal: isSmallTablet ? 12 : isLargeTablet ? 24 : 18,
      paddingVertical: isSmallTablet ? 8 : isLargeTablet ? 16 : 12,
      borderRadius: 8,
      marginLeft: isSmallTablet ? 12 : isLargeTablet ? 24 : 18,
      borderWidth: 1,
      borderColor: '#DEE2E6',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
      alignSelf: 'flex-start',
    },
    changeModeButtonText: {
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 16 : 12,
      fontWeight: '600',
      color: '#495057',
      letterSpacing: 0.5,
    },
    doorControlsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isSmallTablet ? 16 : isLargeTablet ? 32 : 24,
      marginBottom: isSmallTablet ? 16 : isLargeTablet ? 32 : 24,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    doorControlSection: {
      minWidth: isSmallTablet ? 280 : isLargeTablet ? 320 : 300,
      maxWidth: isSmallTablet ? 320 : isLargeTablet ? 400 : 350,
      flex: enabledDoors.length <= 2 ? 1 : 0,
      marginBottom: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
    },
    doorControlTitle: {
      fontSize: isSmallTablet ? 16 : isLargeTablet ? 20 : 18,
      fontWeight: '700',
      color: '#212529',
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 16 : 12,
      letterSpacing: 0.3,
      textAlign: 'center',
    },
    doorControlCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: isSmallTablet ? 12 : isLargeTablet ? 24 : 18,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: '#E9ECEF',
    },
    doorControlImagePlaceholder: {
      width: isSmallTablet ? 200 : isLargeTablet ? 260 : 230,
      height: isSmallTablet ? 150 : isLargeTablet ? 195 : 172,
      backgroundColor: '#E9ECEF',
      borderRadius: 12,
      marginBottom: isSmallTablet ? 10 : isLargeTablet ? 20 : 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cameraIcon: {
      width: isSmallTablet ? 28 : isLargeTablet ? 60 : 50,
      height: isSmallTablet ? 21 : isLargeTablet ? 45 : 37,
      backgroundColor: '#CED4DA',
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isSmallTablet ? 6 : isLargeTablet ? 12 : 8,
    },
    cameraIconInner: {
      width: isSmallTablet ? 14 : isLargeTablet ? 30 : 25,
      height: isSmallTablet ? 10 : isLargeTablet ? 22 : 18,
      backgroundColor: '#ADB5BD',
      borderRadius: 4,
    },
    doorControlButtons: {
      gap: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      width: '100%',
    },
    doorControlButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#E9ECEF',
      paddingVertical: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      paddingHorizontal: isSmallTablet ? 10 : isLargeTablet ? 24 : 16,
      borderRadius: 8,
      gap: isSmallTablet ? 6 : 8,
      borderWidth: 1,
      borderColor: '#CED4DA',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    doorControlButtonText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      fontWeight: '600',
      color: '#495057',
      letterSpacing: 0.5,
    },
    doorControlButtonCommunicating: {
      backgroundColor: '#28A745',
      borderColor: '#1E7E34',
    },
    doorControlButtonCommunicatingText: {
      color: '#FFFFFF',
    },
    doorControlButtonClose: {
      backgroundColor: '#DC3545',
      borderColor: '#C82333',
    },
    doorControlButtonCloseText: {
      color: '#FFFFFF',
    },
    doorControlButtonDisabled: {
      opacity: 0.6,
    },
    doorControlButtonConnecting: {
      backgroundColor: '#FFC107',
      borderColor: '#E0A800',
    },
    doorControlButtonConnected: {
      backgroundColor: '#28A745',
      borderColor: '#1E7E34',
    },
    doorControlButtonConnectedText: {
      color: '#FFFFFF',
    },
    callControlsContainer: {
      flexDirection: 'row',
      gap: isSmallTablet ? 6 : 8,
      marginTop: isSmallTablet ? 8 : 12,
    },
    callControlButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#6C757D',
      paddingVertical: isSmallTablet ? 8 : 10,
      paddingHorizontal: isSmallTablet ? 6 : 8,
      borderRadius: 6,
      gap: 4,
    },
    callControlButtonActive: {
      backgroundColor: '#DC3545',
    },
    callControlButtonText: {
      fontSize: isSmallTablet ? 10 : 12,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    bottomButtons: {
      flexDirection: 'row',
      gap: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      marginBottom: isSmallTablet ? 12 : isLargeTablet ? 24 : 18,
    },
    emergencyButton: {
      flex: 1,
      backgroundColor: '#EC1C24',
      paddingVertical: isSmallTablet ? 14 : isLargeTablet ? 20 : 17,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#EC1C24',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    emergencyButtonText: {
      fontSize: isSmallTablet ? 13 : isLargeTablet ? 18 : 15,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    visualizationButton: {
      flex: 1,
      backgroundColor: '#495057',
      paddingVertical: isSmallTablet ? 14 : isLargeTablet ? 20 : 17,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#495057',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    visualizationButtonText: {
      fontSize: isSmallTablet ? 13 : isLargeTablet ? 18 : 15,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    footerText: {
      fontSize: isSmallTablet ? 9 : isLargeTablet ? 13 : 11,
      color: '#6C757D',
      textAlign: 'left',
      fontWeight: '400',
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SAIMA SEGURIDAD – Panel de control puertas SECURA</Text>
        </View>

        <View style={styles.content}>
          {/* Mode Header */}
          <View style={styles.modeHeader}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>i</Text>
            </View>
            <View style={styles.modeHeaderContent}>
              <Text style={styles.modeTitle}>MODO MANUAL</Text>
            </View>
            <TouchableOpacity 
              style={styles.changeModeButton}
              onPress={onChangeMode}
            >
              <Text style={styles.changeModeButtonText}>CAMBIAR MODO</Text>
            </TouchableOpacity>
          </View>

          {/* Door Controls */}
          <View style={styles.doorControlsContainer}>
            {enabledDoors.map((door, index) => {
              const doorId = `P${index + 1}`;
              return (
                <View key={doorId} style={styles.doorControlSection}>
                  <Text style={styles.doorControlTitle}>{door.name.toUpperCase()}</Text>
                  <View style={styles.doorControlCard}>
                    {door.intercom ? (
                      <DoorVideoStream 
                        intercomConfig={door.intercom} 
                        doorName={door.name}
                      />
                    ) : (
                      <View style={styles.doorControlImagePlaceholder}>
                        <View style={styles.cameraIcon}>
                          <View style={styles.cameraIconInner} />
                        </View>
                      </View>
                    )}
                    
                    <View style={styles.doorControlButtons}>
                      <TouchableOpacity 
                        style={getCallButtonStyle(doorId)}
                        onPress={() => handleCommunicate(doorId, door.name)}
                      >
                        <PhoneCall size={16} color={activeSipCallDoorId === doorId && sipCallState?.isActive ? "#FFFFFF" : "#495057"} />
                        <Text style={getCallButtonTextStyle(doorId)}>
                          {getCallButtonText(doorId)}
                        </Text>
                      </TouchableOpacity>
                      
                      {/* Call controls - only show when connected */}
                      {activeSipCallDoorId === doorId && sipCallState?.isConnected && (
                        <View style={styles.callControlsContainer}>
                          <TouchableOpacity 
                            style={[
                              styles.callControlButton,
                              sipCallState.isMuted && styles.callControlButtonActive
                            ]}
                            onPress={handleMuteMicrophone}
                          >
                            {sipCallState.isMuted ? (
                              <MicOff size={12} color="#FFFFFF" />
                            ) : (
                              <Mic size={12} color="#FFFFFF" />
                            )}
                            <Text style={styles.callControlButtonText}>
                              {sipCallState.isMuted ? 'MUTE' : 'MIC'}
                            </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[
                              styles.callControlButton,
                              sipCallState.isSpeakerOn && styles.callControlButtonActive
                            ]}
                            onPress={handleToggleSpeaker}
                          >
                            <Volume2 size={12} color="#FFFFFF" />
                            <Text style={styles.callControlButtonText}>
                              {sipCallState.isSpeakerOn ? 'SPK' : 'EAR'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      
                      <TouchableOpacity 
                        style={[
                          styles.doorControlButton,
                          getDoorStatus(doorId).isOpen && styles.doorControlButtonClose,
                          isDoorButtonDisabled(doorId) && styles.doorControlButtonDisabled
                        ]}
                        onPress={() => handleOpenDoor(doorId as 'P1' | 'P2', door.name)}
                        disabled={isDoorButtonDisabled(doorId)}
                      >
                        <DoorOpen 
                          size={16} 
                          color={getDoorStatus(doorId).isOpen ? "#FFFFFF" : "#495057"} 
                        />
                        <Text style={[
                          styles.doorControlButtonText,
                          getDoorStatus(doorId).isOpen && styles.doorControlButtonCloseText
                        ]}>
                          {getDoorButtonText(doorId)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Bottom Buttons */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity 
              style={styles.emergencyButton}
              onPress={onEmergency}
            >
              <Text style={styles.emergencyButtonText}>EMERGENCIA</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.visualizationButton}
              onPress={onClose}
            >
              <Text style={styles.visualizationButtonText}>VOLVER</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Text */}
        </View>
      </ScrollView>
    </Modal>
  );
}