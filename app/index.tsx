import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, MessageCircle, DoorOpen, HardHat, Wifi } from 'lucide-react-native';
import { Image } from 'react-native';
import LoginModal from '@/components/LoginModal';
import NewConfigurationModal from '@/components/NewConfigurationModal';
import ModeSelectionModal from '@/components/ModeSelectionModal';
import TechnicianModal from '@/components/TechnicianModal';
import ManualModeModal from '@/components/ManualModeModal';
import EmergencyConfirmationModal from '@/components/EmergencyConfirmationModal';
import { useDoorControl } from '@/hooks/useDoorControl';

export default function MainScreen() {
  // Get window dimensions reactively
  const { width = 0, height = 0 } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  // Responsive breakpoints
  const isSmallTablet = width < 900; // 8" tablets like Oukitel RT3 Pro
  const isLargeTablet = width >= 1200; // 11" tablets like Xiaomi Redmi Pad 2
  const isMediumTablet = width >= 900 && width < 1200; // 10" tablets

  const {
    systemStatus,
    isLoading,
    error,
    connectionStatus,
    currentScheduleMode,
    changeMode,
    toggleEmergency,
    configure,
    validateDevice,
    determineScheduleMode,
    controlDoor,
  } = useDoorControl();

  // Función para obtener el estado de la puerta
  const getDoorStatus = (doorId: 'P1' | 'P2' | 'P3' | 'P4') => {
    const door = systemStatus?.doors[doorId];
    return {
      status: door?.status || 'closed',
      isOpen: door?.status === 'open',
      isOpening: door?.status === 'opening',
      isClosing: door?.status === 'closing',
    };
  };

  // Función para obtener el texto del botón de abrir/cerrar
  const getDoorButtonText = (doorId: 'P1' | 'P2' | 'P3' | 'P4') => {
    const { isOpen, isOpening, isClosing } = getDoorStatus(doorId);
    
    if (isOpening) return 'ABRIENDO...';
    if (isClosing) return 'CERRANDO...';
    return isOpen ? 'CERRAR' : 'ABRIR';
  };

  // Función para determinar si el botón está deshabilitado
  const isDoorButtonDisabled = (doorId: 'P1' | 'P2' | 'P3' | 'P4') => {
    const { isOpening, isClosing } = getDoorStatus(doorId);
    return isOpening || isClosing;
  };

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showNewConfigModal, setShowNewConfigModal] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  const [showManualModeModal, setShowManualModeModal] = useState(false);
  const [showEmergencyConfirmModal, setShowEmergencyConfirmModal] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [communicatingDoors, setCommunicatingDoors] = useState<Set<string>>(new Set());

  // Actualizar fecha y hora cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Formatear fecha y hora
  const formatDateTime = useCallback((date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }, []);

  // Estados derivados del sistema real
  const currentMode = systemStatus?.mode || 'COMERCIAL AUTOMATICO';
  const isEmergencyActive = systemStatus?.emergencyActive || false;
  const isCargaCajeroMode = currentMode === 'CARGA DE CAJERO';

  // Mostrar información del modo automático por horario
  useEffect(() => {
    if (currentScheduleMode) {
      console.log(`📅 Modo sugerido por horario: ${currentScheduleMode}`);
    }
  }, [currentScheduleMode]);

  // Validar dispositivo al iniciar
  useEffect(() => {
    const checkDevice = async () => {
      const isValid = await validateDevice();
      if (!isValid) {
        console.error('🚫 Dispositivo no autorizado');
        // En producción, aquí mostrarías un error y cerrarías la app
      } else {
        console.log('✅ Dispositivo autorizado - Modo Sandbox Activo');
      }
    };
    checkDevice();
  }, [validateDevice]);

  const handleConfigSave = async (config: any) => {
    console.log('💾 Configuración guardada (Sandbox):', config);
    
    // Configurar el servicio con los datos reales
    const configData = {
      serverIP: config.direccionIP1 || '192.168.1.100',
      serverPort: 8080,
      authToken: 'bearer_token_here',
      username: config.username || 'admin',
      updateServerURL: 'http://192.168.1.200/updates',
      deviceId: 'device_id_placeholder',
    };
    
    const success = await configure(configData);
    if (success) {
      console.log('✅ Configuración aplicada correctamente (Sandbox)');
    } else {
      console.error('❌ Error aplicando configuración');
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setShowNewConfigModal(true);
  };

  const handleModeSelect = async (mode: string) => {
    // Mapear el ID del modo a un texto descriptivo
    const modeMap: { [key: string]: string } = {
      'comercial_automatico': 'COMERCIAL AUTOMÁTICO',
      'comercial_esclusa': 'COMERCIAL ESCLUSA',
      'horario_extendido': 'HORARIO EXTENDIDO',
      'horario_manual': 'HORARIO MANUAL',
      'oficina_cerrada': 'OFICINA CERRADA',
      'carga_cajero': 'CARGA DE CAJERO',
      'emergencia': 'EMERGENCIA',
      'manual': 'MANUAL'
    };
    
    const targetMode = modeMap[mode] || mode;
    console.log('🔄 Cambiando a modo (Sandbox):', targetMode);
    
    const success = await changeMode(targetMode);
    if (success) {
      console.log('✅ Modo cambiado exitosamente a:', targetMode);
      
      // Cerrar el modal de selección de modo
      setShowModeModal(false);
      
      // Si el modo es MANUAL, abrir directamente el modal de control manual
      if (targetMode === 'MANUAL') {
        setShowManualModeModal(true);
      }
    } else {
      console.error('❌ Error cambiando modo a:', targetMode);
    }
  };

  const handleEmergencyToggle = () => {
    setShowEmergencyConfirmModal(true);
  };

  const handleEmergencyConfirm = async () => {
    setShowEmergencyConfirmModal(false);
    
    const newState = !isEmergencyActive;
    console.log('🚨 Emergencia (Sandbox):', newState ? 'ACTIVANDO' : 'DESACTIVANDO');
    
    const success = await toggleEmergency(newState);
    if (success) {
      console.log('✅ Emergencia:', newState ? 'ACTIVADA' : 'DESACTIVADA');
    } else {
      console.error('❌ Error cambiando estado de emergencia');
    }
  };

  const handleCommunicate = (doorId: string, doorName: string) => {
    console.log(`📞 Comunicar con ${doorName}`);
    
    // Agregar puerta a la lista de comunicación
    setCommunicatingDoors(prev => new Set(prev).add(doorId));
    
    // Simular comunicación por 5 segundos
    setTimeout(() => {
      setCommunicatingDoors(prev => {
        const newSet = new Set(prev);
        newSet.delete(doorId);
        return newSet;
      });
    }, 5000);
  };

  const handleOpenDoor = async (doorId: 'P1' | 'P2', doorName: string) => {
    const door = systemStatus?.doors[doorId];
    const isOpen = door?.status === 'open';
    const action = isOpen ? 'close' : 'open';
    
    console.log(`🚪 ${action === 'open' ? 'Abrir' : 'Cerrar'} ${doorName}`);
    const success = await controlDoor(doorId, action);
    if (success) {
      console.log(`✅ ${doorName} - Comando ${action} ejecutado correctamente`);
    } else {
      console.error(`❌ Error ejecutando comando ${action} en ${doorName}`);
    }
  };

  // Create styles inside component with access to responsive variables
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    header: {
      backgroundColor: '#495057',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 32 : 24,
      paddingTop: (isSmallTablet ? 12 : isLargeTablet ? 20 : 16) + insets.top,
      paddingBottom: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    dateTimeContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      paddingVertical: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    dateTimeText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      fontWeight: '600',
      color: '#FFFFFF',
      fontFamily: 'monospace',
      letterSpacing: 0.5,
    },
    notificationsButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    notificationsButtonText: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    leftHeaderSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    rightHeaderSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    connectionIndicatorContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      marginRight: 16,
    },
    connectionIndicator: {
      paddingHorizontal: isSmallTablet ? 10 : isLargeTablet ? 16 : 12,
      paddingVertical: isSmallTablet ? 5 : isLargeTablet ? 8 : 6,
      borderRadius: 12,
    },
    connectionText: {
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    scheduleIndicator: {
      backgroundColor: '#17A2B8',
      paddingHorizontal: isSmallTablet ? 10 : isLargeTablet ? 16 : 12,
      paddingVertical: isSmallTablet ? 5 : isLargeTablet ? 8 : 6,
      borderRadius: 12,
    },
    scheduleText: {
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    manualModeIndicator: {
      backgroundColor: '#FFC107',
      paddingHorizontal: isSmallTablet ? 10 : isLargeTablet ? 16 : 12,
      paddingVertical: isSmallTablet ? 5 : isLargeTablet ? 8 : 6,
      borderRadius: 12,
    },
    manualModeText: {
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      fontWeight: '600',
      color: '#212529',
    },
    configButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      borderRadius: 8,
      gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    configButtonText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      fontWeight: '600',
      color: '#333333',
    },
    header: {
      backgroundColor: '#495057',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 32 : 24,
      paddingTop: (isSmallTablet ? 12 : isLargeTablet ? 20 : 16) + insets.top,
      paddingBottom: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    dateTimeContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      paddingVertical: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    dateTimeText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      fontWeight: '600',
      color: '#FFFFFF',
      fontFamily: 'monospace',
      letterSpacing: 0.5,
    },
    notificationsButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    notificationsButtonText: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    leftHeaderSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    rightHeaderSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    connectionIndicatorContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      marginRight: 16,
    },
    connectionIndicator: {
      paddingHorizontal: isSmallTablet ? 10 : isLargeTablet ? 16 : 12,
      paddingVertical: isSmallTablet ? 5 : isLargeTablet ? 8 : 6,
      borderRadius: 12,
    },
    connectionText: {
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    scheduleIndicator: {
      backgroundColor: '#17A2B8',
      paddingHorizontal: isSmallTablet ? 10 : isLargeTablet ? 16 : 12,
      paddingVertical: isSmallTablet ? 5 : isLargeTablet ? 8 : 6,
      borderRadius: 12,
    },
    scheduleText: {
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    manualModeIndicator: {
      backgroundColor: '#FFC107',
      paddingHorizontal: isSmallTablet ? 10 : isLargeTablet ? 16 : 12,
      paddingVertical: isSmallTablet ? 5 : isLargeTablet ? 8 : 6,
      borderRadius: 12,
    },
    manualModeText: {
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      fontWeight: '600',
      color: '#212529',
    },
    configButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      borderRadius: 8,
      gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    configButtonText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      fontWeight: '600',
      color: '#333333',
    },
    errorBanner: {
      backgroundColor: '#F8D7DA',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderLeftWidth: 4,
      borderLeftColor: '#DC3545',
    },
    errorText: {
      fontSize: 12,
      color: '#721C24',
      fontWeight: '500',
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    loadingText: {
      fontSize: 16,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    mainContent: {
      flex: 1,
      padding: isSmallTablet ? 16 : isLargeTablet ? 32 : 24,
    },
    emergencyContent: {
      flex: 1,
      padding: isSmallTablet ? 16 : isLargeTablet ? 32 : 24,
      alignItems: 'center',
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      marginTop: 8,
    },
    santanderLogo: {
      width: isSmallTablet ? 280 : isLargeTablet ? 400 : 340,
      height: isSmallTablet ? 90 : isLargeTablet ? 130 : 110,
    },
    operationSection: {
      marginBottom: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
    },
    modeCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 0,
    },
    modeImagePlaceholder: {
      width: 120,
      height: 90,
      backgroundColor: '#E9ECEF',
      borderRadius: 12,
      marginRight: 24,
    },
    modeContent: {
      flex: 1,
    },
    modeTitle: {
      fontSize: isSmallTablet ? 18 : isLargeTablet ? 24 : 21,
      fontWeight: '700',
      color: '#212529',
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      letterSpacing: 0.3,
    },
    modeDescription: {
      fontSize: isSmallTablet ? 13 : isLargeTablet ? 16 : 14,
      color: '#6C757D',
      lineHeight: isSmallTablet ? 18 : isLargeTablet ? 24 : 20,
      fontWeight: '400',
    },
    changeModeButton: {
      backgroundColor: '#F8F9FA',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      borderRadius: 8,
      marginLeft: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      borderWidth: 1,
      borderColor: '#DEE2E6',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    changeModeButtonText: {
      fontSize: isSmallTablet ? 13 : isLargeTablet ? 16 : 14,
      fontWeight: '600',
      color: '#495057',
      letterSpacing: 0.5,
    },
    emergencyCard: {
      backgroundColor: '#EC1C24',
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 20,
      width: '100%',
      maxWidth: 700,
      shadowColor: '#EC1C24',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    emergencyImagePlaceholder: {
      width: 120,
      height: 90,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 12,
      marginRight: 24,
      flexShrink: 0,
    },
    emergencyTextContent: {
      flex: 1,
    },
    emergencyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 12,
      letterSpacing: 0.5,
    },
    emergencyDescription: {
      fontSize: 14,
      color: '#FFFFFF',
      lineHeight: 20,
      fontWeight: '400',
      opacity: 0.95,
    },
    deactivateEmergencyButton: {
      backgroundColor: '#EC1C24',
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 12,
      marginBottom: 16,
      shadowColor: '#EC1C24',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deactivateEmergencyButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1,
      textAlign: 'center',
    },
    bottomButtons: {
      flexDirection: 'row',
      gap: isSmallTablet ? 12 : isLargeTablet ? 24 : 18,
      marginBottom: isSmallTablet ? 12 : isLargeTablet ? 24 : 18,
      paddingHorizontal: isSmallTablet ? 8 : 0,
    },
    emergencyButton: {
      flex: 1,
      backgroundColor: '#EC1C24',
      paddingVertical: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
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
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 18 : 14,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    visualizationButton: {
      flex: 1,
      backgroundColor: '#495057',
      paddingVertical: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
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
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 18 : 14,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    footerText: {
      fontSize: 11,
      color: '#6C757D',
      textAlign: 'left',
      fontWeight: '400',
    },
    cargaCajeroCard: {
      backgroundColor: '#F0F466',
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 0,
    },
    cargaCajeroImagePlaceholder: {
      width: 120,
      height: 90,
      backgroundColor: 'rgba(255, 255, 255, 0.6)',
      borderRadius: 12,
      marginRight: 24,
    },
    cargaCajeroContent: {
      flex: 1,
    },
    cargaCajeroTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#4A5D23',
      marginBottom: 8,
      letterSpacing: 0.3,
    },
    cargaCajeroDescription: {
      fontSize: 13,
      color: '#5D6B2F',
      lineHeight: 18,
      fontWeight: '400',
    },
    changeModeButtonCarga: {
      backgroundColor: '#F5F5DC',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      marginLeft: 16,
      borderWidth: 1,
      borderColor: '#D4D4AA',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    changeModeButtonTextCarga: {
      fontSize: 13,
      fontWeight: '600',
      color: '#4A5D23',
      letterSpacing: 0.5,
    },
    // Estilos para modo manual
    manualModeHeader: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: '#E9ECEF',
    },
    infoIcon: {
      width: isSmallTablet ? 20 : isLargeTablet ? 28 : 24,
      height: isSmallTablet ? 20 : isLargeTablet ? 28 : 24,
      borderRadius: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      backgroundColor: '#495057',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      flexShrink: 0,
    },
    infoIconText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    manualModeHeaderContent: {
      flex: 1,
    },
    manualModeTitle: {
      fontSize: isSmallTablet ? 18 : isLargeTablet ? 24 : 21,
      fontWeight: '700',
      color: '#212529',
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      letterSpacing: 0.3,
    },
    manualModeDescription: {
      fontSize: isSmallTablet ? 13 : isLargeTablet ? 16 : 14,
      color: '#6C757D',
      lineHeight: isSmallTablet ? 18 : isLargeTablet ? 24 : 20,
      fontWeight: '400',
    },
    changeModeButtonManual: {
      backgroundColor: '#F8F9FA',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      borderRadius: 8,
      marginLeft: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      borderWidth: 1,
      borderColor: '#DEE2E6',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
      alignSelf: 'flex-start',
    },
    changeModeButtonTextManual: {
      fontSize: isSmallTablet ? 13 : isLargeTablet ? 16 : 14,
      fontWeight: '600',
      color: '#495057',
      letterSpacing: 0.5,
    },
    doorControlsContainer: {
      flexDirection: 'row',
      gap: isSmallTablet ? 16 : isLargeTablet ? 32 : 24,
      marginBottom: isSmallTablet ? 16 : isLargeTablet ? 32 : 24,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    doorControlSection: {
      flex: 1,
      maxWidth: isSmallTablet ? 320 : isLargeTablet ? 450 : 400,
      minWidth: isSmallTablet ? 280 : isLargeTablet ? 350 : 320,
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
      marginBottom: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
    },
    cameraIcon: {
      width: isSmallTablet ? 32 : isLargeTablet ? 60 : 50,
      height: isSmallTablet ? 24 : isLargeTablet ? 45 : 37,
      backgroundColor: '#CED4DA',
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isSmallTablet ? 6 : isLargeTablet ? 12 : 8,
    },
    cameraIconInner: {
      width: isSmallTablet ? 16 : isLargeTablet ? 30 : 25,
      height: isSmallTablet ? 12 : isLargeTablet ? 22 : 18,
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
      paddingHorizontal: isSmallTablet ? 12 : isLargeTablet ? 24 : 18,
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
    doorControlButtonText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      fontWeight: '600',
      color: '#495057',
      letterSpacing: 0.5,
    },
    // Estilos adicionales para modo manual responsivo
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftHeaderSection}>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.dateTimeText}>
              {formatDateTime(currentDateTime)}
            </Text>
          </View>
        </View>

        <View style={styles.rightHeaderSection}>
          <TouchableOpacity 
            style={styles.notificationsButton}
            onPress={() => console.log('📢 Notificaciones presionado')}
          >
            <MessageCircle size={20} color="#FFFFFF" />
            <Text style={styles.notificationsButtonText}>NOTIFICACIONES</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.configButton}
            onPress={() => setShowLoginModal(true)}
          >
            <Settings size={20} color="#333333" />
            <Text style={styles.configButtonText}>CONFIGURACIÓN</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.configButton}
            onPress={() => setShowTechnicianModal(true)}
          >
            <HardHat size={20} color="#333333" />
            <Text style={styles.configButtonText}>TÉCNICO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Procesando...</Text>
        </View>
      )}

      {/* Main Content */}
      {isEmergencyActive ? (
        /* Emergency Mode View */
        <View style={styles.emergencyContent}>
          <View style={styles.logoSection}>
            <Image 
              source={require('@/assets/images/banco-santander-seeklogo.png')}
              style={styles.santanderLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.emergencyCard}>
            <View style={styles.emergencyTextContent}>
              <Text style={styles.emergencyTitle}>MODO EMERGENCIA ACTIVADO</Text>
              <Text style={styles.emergencyDescription}>
                El sistema ha deshabilitado todas las restricciones y lógicas de seguridad.{'\n'}
                Ambas puertas permanecen desbloqueadas hasta nuevo aviso.{'\n'}
                Uso reservado para situaciones críticas.
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.deactivateEmergencyButton}
            onPress={handleEmergencyToggle}
          >
            <Text style={styles.deactivateEmergencyButtonText}>DESACTIVAR EMERGENCIA</Text>
          </TouchableOpacity>
        </View>
      ) : isCargaCajeroMode ? (
        <View style={styles.mainContent}>
          <View style={styles.logoSection}>
            <Image 
              source={require('@/assets/images/banco-santander-seeklogo.png')}
              style={styles.santanderLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.cargaCajeroCard}>
            <View style={styles.cargaCajeroContent}>
              <Text style={styles.cargaCajeroTitle}>CARGA CAJERO</Text>
              <Text style={styles.cargaCajeroDescription}>
                Es el modo de funcionamiento destinado la carga de cajero en los casos que exista en el uno en el zaguán. La puerta P1 permanece cerrada y es necesario pulsar para que haga llamada a las consolas interiores. La puerta P2 permanece abierta para facilitar el desarrollo de la actividad.
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.changeModeButtonCarga}
              onPress={() => setShowModeModal(true)}
            >
              <Text style={styles.changeModeButtonTextCarga}>CAMBIAR MODO</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomButtons}>
            <TouchableOpacity 
              style={styles.emergencyButton}
              onPress={handleEmergencyToggle}
            >
              <Text style={styles.emergencyButtonText}>EMERGENCIA</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.visualizationButton}
              onPress={() => setShowManualModeModal(true)}
            >
              <Text style={styles.visualizationButtonText}>CONTROL MANUAL</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Vista normal para todos los modos excepto emergencia y carga cajero */
        <View style={styles.mainContent}>
          <View style={styles.logoSection}>
            <Image 
              source={require('@/assets/images/banco-santander-seeklogo.png')}
              style={styles.santanderLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.operationSection}>
            <View style={styles.modeCard}>
              <View style={styles.modeContent}>
                <Text style={styles.modeTitle}>Modo de Operación Actual: {currentMode}</Text>
                <Text style={styles.modeDescription}>
                  Visualización del modo de operación activo en tiempo real. Esta información se obtiene automáticamente mediante una consulta GET al sistema de control de puertas.
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.changeModeButton}
                onPress={() => setShowModeModal(true)}
              >
                <Text style={styles.changeModeButtonText}>CAMBIAR MODO</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomButtons}>
            <TouchableOpacity 
              style={styles.emergencyButton}
              onPress={handleEmergencyToggle}
            >
              <Text style={styles.emergencyButtonText}>ACTIVAR EMERGENCIA</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.visualizationButton}
              onPress={() => setShowManualModeModal(true)}
            >
              <Text style={styles.visualizationButtonText}>CONTROL MANUAL</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />

      <TechnicianModal
        visible={showTechnicianModal}
        onClose={() => setShowTechnicianModal(false)}
      />

      <NewConfigurationModal
        visible={showNewConfigModal}
        onClose={() => setShowNewConfigModal(false)}
        onSave={handleConfigSave}
      />

      <ModeSelectionModal
        visible={showModeModal}
        onClose={() => setShowModeModal(false)}
        onModeSelect={handleModeSelect}
      />

      <ManualModeModal
        visible={showManualModeModal}
        onClose={() => setShowManualModeModal(false)}
        onChangeMode={() => {
          setShowManualModeModal(false);
          setShowModeModal(true);
        }}
        onEmergency={handleEmergencyToggle}
        communicatingDoors={communicatingDoors}
        onCommunicate={handleCommunicate}
        getDoorStatus={getDoorStatus}
        isDoorButtonDisabled={isDoorButtonDisabled}
        getDoorButtonText={getDoorButtonText}
      />

      <EmergencyConfirmationModal
        visible={showEmergencyConfirmModal}
        onClose={() => setShowEmergencyConfirmModal(false)}
        onConfirm={handleEmergencyConfirm}
        isDeactivating={isEmergencyActive}
      />
    </View>
  );
}