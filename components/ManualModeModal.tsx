import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { X, DoorOpen, Mic, MicOff, Minimize2 } from 'lucide-react-native';
import { ScrollView } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDoorControl } from '@/hooks/useDoorControl';
import DoorVideoStream from './DoorVideoStream';
import { startIntercom, stopIntercom } from '@/services/intercom';
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
  isDoorVerifying: (doorId: string) => boolean;
  refreshAllDoorsStatus: () => Promise<boolean>;
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
  isDoorVerifying,
  refreshAllDoorsStatus,
  intercomConfigs
}: ManualModeModalProps) {
  const MANUAL_OUTPUT_STATE_KEY = 'door_manual_output_state';
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

  // Estado local para la configuración de puertas
  const [currentIntercomConfigs, setCurrentIntercomConfigs] = useState<DoorConfig[]>(intercomConfigs || []);
  const [cameraConfigs, setCameraConfigs] = useState<DoorConfig[]>([]);
  const [sendingPulse, setSendingPulse] = useState<Set<string>>(new Set()); // Track puertas con pulso en proceso
  const [manualOutputState, setManualOutputState] = useState<Record<string, boolean>>({});
  const [expandedVideoDoorId, setExpandedVideoDoorId] = useState<string | null>(null);
  const [sdkIntercomDoorId, setSdkIntercomDoorId] = useState<string | null>(null);
  const [sdkIntercomLoading, setSdkIntercomLoading] = useState<string | null>(null);
  
  // Filter enabled doors for styling calculations
  const enabledDoors = currentIntercomConfigs.filter(door => door.enabled);
  
  // Cargar configuración cuando el modal se abre
  useEffect(() => {
    if (visible) {
      loadCurrentConfig();
      // Consultar estado inicial de todas las puertas
      refreshAllDoorsStatus().then(() => {
        console.log('🔄 Estado inicial de puertas consultado al abrir ManualModeModal');
      }).catch((error) => {
        console.error('❌ Error consultando estado inicial:', error);
      });
    }
  }, [visible, refreshAllDoorsStatus]);

  useEffect(() => {
    if (!visible) {
      setExpandedVideoDoorId(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!expandedVideoDoorId) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setExpandedVideoDoorId(null);
      return true;
    });
    return () => sub.remove();
  }, [expandedVideoDoorId]);

  const screen = Dimensions.get('window');
  /** Vídeo a pantalla completa; botones flotantes encima (no restan altura). */
  const expandedVideoHeight = screen.height;
  
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
        const manualStateRaw = await AsyncStorage.getItem(MANUAL_OUTPUT_STATE_KEY);
        const manualStateParsed = manualStateRaw ? JSON.parse(manualStateRaw) : {};
        setManualOutputState(
          manualStateParsed && typeof manualStateParsed === 'object' ? manualStateParsed : {}
        );
        if (parsedConfig.doors) {
          // Migrar configuraciones antiguas que no tienen campos SDIO12
          const migratedDoors = parsedConfig.doors.map((door: any, index: number) => {
            if (door.intercom) {
              // Remover doorControlIP si existe (campo obsoleto)
              const { doorControlIP, ...intercomRest } = door.intercom;
              return {
                ...door,
                intercom: {
                  ...intercomRest,
                  doorControlUsername: door.intercom.doorControlUsername || 'Scati2023',
                  doorControlPassword: door.intercom.doorControlPassword || 'Scati2023',
                  doorControlPCB: door.intercom.doorControlPCB ?? 1,
                  doorControlSwitch: door.intercom.doorControlSwitch ?? (index + 1),
                  doorControlAction: door.intercom.doorControlAction || 'set_output',
                  doorControlRuleKey: door.intercom.doorControlRuleKey || '',
                  doorOutputMode: door.intercom.doorOutputMode || 'auto',
                  doorControlPulseTime:
                    typeof door.intercom.doorControlPulseTime === 'number'
                      ? door.intercom.doorControlPulseTime
                      : 1.0,
                  sdkPort:
                    door.intercom.sdkPort === 6036 || door.intercom.sdkPort == null
                      ? 9008
                      : door.intercom.sdkPort,
                  sdkUsername: door.intercom.sdkUsername ?? 'admin',
                  sdkPassword: door.intercom.sdkPassword ?? '',
                  voiceChannel: door.intercom.voiceChannel ?? -1,
                }
              };
            }
            return door;
          });
          
          setCurrentIntercomConfigs(migratedDoors);
          setCameraConfigs(migratedDoors);
          console.log('🔄 Configuración de puertas y cámaras cargada en ManualModeModal:', migratedDoors);
        }
      }
    } catch (error) {
      console.error('❌ Error cargando configuración en ManualModeModal:', error);
    }
  };


  const { 
    controlDoor, 
  } = useDoorControl();

  // Obtener configuraciones de intercomunicador para cada puerta
  const getIntercomConfig = (doorIndex: number): IntercomConfig | null => {
    if (intercomConfigs && intercomConfigs[doorIndex] && intercomConfigs[doorIndex].enabled) {
      return intercomConfigs[doorIndex].intercom;
    }
    return null;
  };

  const handleOpenDoor = async (doorId: 'P1' | 'P2', doorName: string) => {
    try {
      const doorIndex = doorId === 'P1' ? 0 : 1;
      const doorCfg = currentIntercomConfigs[doorIndex]?.intercom;
      const actionKind = doorCfg?.doorControlAction || 'set_output';
      const outputMode = doorCfg?.doorOutputMode || 'auto';
      const currentlyOpen = Boolean(manualOutputState[doorId]);
      const nextAction: 'open' | 'close' =
        actionKind === 'set_output' && outputMode === 'manual' && currentlyOpen
          ? 'close'
          : 'open';
      console.log(
        `🚪 ${nextAction === 'open' ? 'Abriendo' : 'Cerrando'} ${doorName} (${actionKind}/${outputMode})`
      );

      setSendingPulse(prev => new Set(prev).add(doorId));

      const success = await controlDoor(doorId, nextAction);

      setTimeout(() => {
        setSendingPulse(prev => {
          const newSet = new Set(prev);
          newSet.delete(doorId);
          return newSet;
        });
      }, 1000);

      if (success) {
        if (actionKind === 'set_output' && outputMode === 'manual') {
          const newState = nextAction === 'open';
          const updated = { ...manualOutputState, [doorId]: newState };
          setManualOutputState(updated);
          await AsyncStorage.setItem(MANUAL_OUTPUT_STATE_KEY, JSON.stringify(updated));
        }
        console.log(`✅ ${doorName} - comando enviado correctamente`);
      } else {
        console.error(`❌ Error enviando comando en ${doorName}`);
        setSendingPulse(prev => {
          const newSet = new Set(prev);
          newSet.delete(doorId);
          return newSet;
        });
      }
    } catch (error) {
      console.error(`❌ Error en handleOpenDoor:`, error);
      setSendingPulse(prev => {
        const newSet = new Set(prev);
        newSet.delete(doorId);
        return newSet;
      });
    }
  };

  const handleEmergency = () => {
    console.log('🚨 Emergencia activada desde ManualModeModal - cerrando modal');
    onClose(); // Cerrar el modal primero
    setTimeout(() => {
      onEmergency(); // Luego activar emergencia
    }, 100); // Pequeño delay para que se cierre suavemente
  };

  const getDoorButtonTextLocal = (doorId: 'P1' | 'P2'): string => {
    const doorIndex = doorId === 'P1' ? 0 : 1;
    const doorConfig = currentIntercomConfigs[doorIndex];
    
    if (!doorConfig || !doorConfig.intercom) {
      return 'ABRIR';
    }

    // Si está enviando pulso, mostrar feedback
    if (sendingPulse.has(doorId)) {
      return 'ENVIANDO PULSO...';
    }

    const intercom = doorConfig.intercom;
    const actionKind = intercom?.doorControlAction || 'set_output';
    const outputMode = intercom?.doorOutputMode || 'auto';
    if (actionKind === 'set_rule') {
      return 'EJECUTAR REGLA';
    }
    if (outputMode === 'manual') {
      return manualOutputState[doorId] ? 'CERRAR PUERTA' : 'ABRIR PUERTA';
    }
    return 'ABRIR PUERTA';
  };

  useEffect(() => {
    if (!visible && sdkIntercomDoorId) {
      const doorIndex = parseInt(sdkIntercomDoorId.replace('P', ''), 10) - 1;
      const intercom = currentIntercomConfigs[doorIndex]?.intercom;
      void stopIntercom(intercom).finally(() => setSdkIntercomDoorId(null));
    }
  }, [visible, sdkIntercomDoorId]);

  const handleToggleBridgeIntercom = async (doorId: string, intercom: IntercomConfig) => {
    if (Platform.OS !== 'android') {
      Alert.alert('Intercom puente', 'Solo disponible en Android.');
      return;
    }

    if (sdkIntercomDoorId === doorId) {
      setSdkIntercomLoading(doorId);
      try {
        await stopIntercom(intercom);
        setSdkIntercomDoorId(null);
      } finally {
        setSdkIntercomLoading(null);
      }
      return;
    }

    setSdkIntercomLoading(doorId);
    try {
      const ok = await startIntercom(doorId, intercom);
      if (ok) {
        setSdkIntercomDoorId(doorId);
      }
    } finally {
      setSdkIntercomLoading(null);
    }
  };

  const renderDoorControlButton = (doorId: string, doorName: string, floating = false) => (
    <TouchableOpacity
      style={[
        styles.doorControlButton,
        floating && styles.doorControlButtonFloating,
        getDoorStatus(doorId).isOpen && styles.doorControlButtonClose,
        (isDoorButtonDisabled(doorId) || isDoorVerifying(doorId)) && styles.doorControlButtonDisabled,
      ]}
      onPress={() => handleOpenDoor(doorId as 'P1' | 'P2', doorName)}
      disabled={isDoorButtonDisabled(doorId) || isDoorVerifying(doorId) || sendingPulse.has(doorId)}
    >
      {isDoorVerifying(doorId) ? (
        <>
          <ActivityIndicator
            size="small"
            color={getDoorStatus(doorId).isOpen ? '#FFFFFF' : '#495057'}
          />
          <Text
            style={[
              styles.doorControlButtonText,
              getDoorStatus(doorId).isOpen && styles.doorControlButtonCloseText,
            ]}
          >
            VERIFICANDO...
          </Text>
        </>
      ) : sendingPulse.has(doorId) ? (
        <>
          <ActivityIndicator size="small" color="#FFC107" />
          <Text style={[styles.doorControlButtonText, { color: '#FFC107' }]}>
            {getDoorButtonTextLocal(doorId as 'P1' | 'P2')}
          </Text>
        </>
      ) : (
        <>
          <DoorOpen size={16} color={getDoorStatus(doorId).isOpen ? '#FFFFFF' : '#495057'} />
          <Text
            style={[
              styles.doorControlButtonText,
              getDoorStatus(doorId).isOpen && styles.doorControlButtonCloseText,
            ]}
          >
            {getDoorButtonTextLocal(doorId as 'P1' | 'P2')}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    modalRoot: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    scrollContent: {
      flexGrow: 1,
    },
    scrollContentFullscreen: {
      flexGrow: 1,
      minHeight: screen.height,
      width: '100%',
      backgroundColor: '#000',
    },
    contentExpanded: {
      flex: 1,
      width: '100%',
      paddingHorizontal: 0,
      paddingVertical: 0,
      minHeight: screen.height,
    },
    doorControlsContainerExpanded: {
      flex: 1,
      width: '100%',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      marginBottom: 0,
      gap: 0,
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
      marginBottom: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
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
    sdkTestButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#6F42C1',
      paddingVertical: isSmallTablet ? 11 : 13,
      paddingHorizontal: 16,
      borderRadius: 8,
      gap: 8,
      width: '100%',
      marginBottom: isSmallTablet ? 8 : 10,
    },
    sdkTestButtonText: {
      fontSize: isSmallTablet ? 12 : 14,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    sdkIntercomButtonActive: {
      backgroundColor: '#DC3545',
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
    doorControlCardExpanded: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
      position: 'relative',
      backgroundColor: '#000',
      borderColor: '#000',
      borderRadius: 0,
      padding: 0,
      shadowOpacity: 0,
      elevation: 0,
      overflow: 'hidden',
    },
    doorControlSectionExpanded: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
      marginBottom: 0,
    },
    doorControlButtonsFloating: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      zIndex: 30,
      elevation: 30,
    },
    doorControlButtonFloating: {
      minWidth: 180,
      maxWidth: 240,
      paddingVertical: 11,
      paddingHorizontal: 20,
      borderRadius: 28,
      backgroundColor: 'rgba(248, 249, 250, 0.96)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 10,
    },
    fullscreenExitButtonFloating: {
      minWidth: 96,
      maxWidth: 110,
      paddingHorizontal: 14,
      backgroundColor: 'rgba(52, 58, 64, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    fullscreenExitButtonText: {
      color: '#FFFFFF',
      fontSize: isSmallTablet ? 11 : 13,
      fontWeight: '700',
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContent,
            expandedVideoDoorId ? styles.scrollContentFullscreen : null,
          ]}
          scrollEnabled={!expandedVideoDoorId}
        >
        {!expandedVideoDoorId ? (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>SAIMA SEGURIDAD – Panel de control puertas SECURA</Text>
          </View>
        ) : null}

        <View style={[styles.content, expandedVideoDoorId ? styles.contentExpanded : null]}>
          {!expandedVideoDoorId ? (
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
          ) : null}

          <View
            style={[
              styles.doorControlsContainer,
              expandedVideoDoorId ? styles.doorControlsContainerExpanded : null,
            ]}
          >
            {enabledDoors.map((door, index) => {
              const doorId = `P${index + 1}`;
              if (expandedVideoDoorId && expandedVideoDoorId !== doorId) {
                return null;
              }
              const isDoorExpanded = expandedVideoDoorId === doorId;
              const intercomEstablished = sdkIntercomDoorId === doorId;
              const intercomBusyOnDoor =
                intercomEstablished || sdkIntercomLoading === doorId;
              return (
                <View
                  key={doorId}
                  style={isDoorExpanded ? styles.doorControlSectionExpanded : styles.doorControlSection}
                >
                  {!isDoorExpanded ? (
                    <Text style={styles.doorControlTitle}>{door.name.toUpperCase()}</Text>
                  ) : null}
                  <View
                    style={[
                      styles.doorControlCard,
                      isDoorExpanded && styles.doorControlCardExpanded,
                    ]}
                  >
                    {door.intercom ? (
                      <>
                        <DoorVideoStream
                          intercomConfig={door.intercom}
                          doorName={door.name}
                          suspendStream={false}
                          muteAmbientDuringIntercom={intercomEstablished}
                          isExpanded={isDoorExpanded}
                          expandedVideoHeight={expandedVideoHeight}
                          onExpandedChange={(expanded) =>
                            setExpandedVideoDoorId(expanded ? doorId : null)
                          }
                        />
                        {isDoorExpanded ? (
                          <View style={styles.doorControlButtonsFloating} pointerEvents="box-none">
                            {renderDoorControlButton(doorId, door.name, true)}
                            <TouchableOpacity
                              style={[
                                styles.doorControlButton,
                                styles.doorControlButtonFloating,
                                styles.fullscreenExitButtonFloating,
                              ]}
                              onPress={() => setExpandedVideoDoorId(null)}
                              accessibilityLabel="Salir de pantalla completa"
                            >
                              <Minimize2 size={16} color="#FFFFFF" />
                              <Text style={styles.fullscreenExitButtonText}>SALIR</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </>
                    ) : (
                      <View style={styles.doorControlImagePlaceholder}>
                        <View style={styles.cameraIcon}>
                          <View style={styles.cameraIconInner} />
                        </View>
                      </View>
                    )}
                    
                    {!isDoorExpanded && door.intercom && Platform.OS === 'android' ? (
                      <TouchableOpacity
                        style={[
                          styles.sdkTestButton,
                          sdkIntercomDoorId === doorId && styles.sdkIntercomButtonActive,
                        ]}
                        onPress={() => handleToggleBridgeIntercom(doorId, door.intercom)}
                        disabled={
                          sdkIntercomLoading === doorId ||
                          (sdkIntercomDoorId !== null && sdkIntercomDoorId !== doorId)
                        }
                      >
                        {sdkIntercomLoading === doorId ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            {sdkIntercomDoorId === doorId ? (
                              <MicOff size={16} color="#FFFFFF" />
                            ) : (
                              <Mic size={16} color="#FFFFFF" />
                            )}
                            <Text style={styles.sdkTestButtonText}>
                              {sdkIntercomDoorId === doorId ? 'DETENER INTERCOM' : 'INTERCOM PUENTE'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}

                    {!isDoorExpanded ? (
                      <View style={styles.doorControlButtons}>
                        {renderDoorControlButton(doorId, door.name)}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          {!expandedVideoDoorId ? (
          <View style={styles.bottomButtons}>
            <TouchableOpacity 
              style={styles.emergencyButton}
              onPress={handleEmergency}
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
          ) : null}

        </View>
        </ScrollView>
      </View>
    </Modal>
  );
}