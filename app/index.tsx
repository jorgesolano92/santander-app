import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, MessageCircle, DoorOpen, HardHat } from 'lucide-react-native';
import { Image } from 'react-native';
import LoginModal from '@/components/LoginModal';
import NewConfigurationModal from '@/components/NewConfigurationModal';
import ModeSelectionModal from '@/components/ModeSelectionModal';
import VisualizationModal from '@/components/VisualizationModal';
import TechnicianModal from '@/components/TechnicianModal';
import ManualModeModal from '@/components/ManualModeModal';
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
  } = useDoorControl();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showNewConfigModal, setShowNewConfigModal] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [showVisualizationModal, setShowVisualizationModal] = useState(false);
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  const [showManualModeModal, setShowManualModeModal] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

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
  const isManualMode = currentMode.includes('MANUAL');

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
      'emergencia': 'EMERGENCIA'
    };
    
    const targetMode = modeMap[mode] || mode;
    console.log('🔄 Cambiando a modo (Sandbox):', targetMode);
    
    const success = await changeMode(targetMode);
    if (success) {
      console.log('✅ Modo cambiado exitosamente a:', targetMode);
    } else {
      console.error('❌ Error cambiando modo a:', targetMode);
    }
  };

  const handleEmergencyToggle = async () => {
    const newState = !isEmergencyActive;
    console.log('🚨 Emergencia (Sandbox):', newState ? 'ACTIVANDO' : 'DESACTIVANDO');
    
    const success = await toggleEmergency(newState);
    if (success) {
      console.log('✅ Emergencia:', newState ? 'ACTIVADA' : 'DESACTIVADA');
    } else {
      console.error('❌ Error cambiando estado de emergencia');
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
    },
    notificationsButtonText: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.5,
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
      gap: 16,
      marginBottom: 16,
    },
    emergencyButton: {
      flex: 1,
      backgroundColor: '#EC1C24',
      paddingVertical: 16,
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
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    visualizationButton: {
      flex: 1,
      backgroundColor: '#495057',
      paddingVertical: 16,
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
      fontSize: 15,
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
      backgroundColor: '#F0F466', // Amarillo como en la imagen
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
      color: '#4A5D23', // Verde oscuro para el título sobre fondo amarillo
      marginBottom: 8,
      letterSpacing: 0.3,
    },
    cargaCajeroDescription: {
      fontSize: 13,
      color: '#5D6B2F', // Verde medio para la descripción sobre fondo amarillo
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
    manualModeHeader: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: '#E9ECEF',
    },
    infoIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#495057',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      flexShrink: 0,
    },
    infoIconText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    manualModeHeaderContent: {
      flex: 1,
    },
    manualModeTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#212529',
      marginBottom: 8,
      letterSpacing: 0.3,
    },
    manualModeDescription: {
      fontSize: 13,
      color: '#6C757D',
      lineHeight: 18,
      fontWeight: '400',
    },
    changeModeButtonManual: {
      backgroundColor: '#F8F9FA',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      marginLeft: 16,
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
      fontSize: 13,
      fontWeight: '600',
      color: '#495057',
      letterSpacing: 0.5,
    },
    doorControlsContainer: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 20,
      justifyContent: 'center',
    },
    doorControlSection: {
      flex: 1,
      maxWidth: 280,
    },
    doorControlTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#212529',
      marginBottom: 12,
      letterSpacing: 0.3,
    },
    doorControlCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
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
      width: 180,
      height: 135,
      backgroundColor: '#E9ECEF',
      borderRadius: 12,
      marginBottom: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    doorControlButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#E9ECEF',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginBottom: 8,
      width: '100%',
      borderWidth: 1,
      borderColor: '#CED4DA',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      gap: 6,
    },
    doorControlButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#495057',
      letterSpacing: 0.5,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>

        <TouchableOpacity 
          style={styles.notificationsButton}
          onPress={() => console.log('Notificaciones presionado')}
        >
          <Text style={styles.notificationsButtonText}>NOTIFICACIONES</Text>
        </TouchableOpacity>
        
        {/* Fecha y hora */}
        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateTimeText}>{formatDateTime(currentDateTime)}</Text>
        </View>
        
        {/* Indicador de conexión */}
        <View style={[styles.connectionIndicator, { backgroundColor: connectionStatus === 'online' ? '#28A745' : '#DC3545' }]}>
          <Text style={styles.connectionText}>
            {connectionStatus === 'online' ? 'SANDBOX' : 'OFFLINE'}
          </Text>
        </View>
        
        {/* Indicador de modo automático por horario */}
        {currentScheduleMode && !isEmergencyActive && currentMode === currentScheduleMode && (
          <View style={styles.scheduleIndicator}>
            <Text style={styles.scheduleText}>AUTO: {currentScheduleMode}</Text>
          </View>
        )}
        
        {/* Indicador cuando el modo actual difiere del sugerido por horario */}
        {currentScheduleMode && !isEmergencyActive && currentMode !== currentScheduleMode && (
          <View style={styles.manualModeIndicator}>
            <Text style={styles.manualModeText}>MANUAL: {currentMode}</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.configButton}
          onPress={() => setShowLoginModal(true)}
        >
          <Settings size={20} color="#666666" />
          <Text style={styles.configButtonText}>CONFIGURACIÓN</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.configButton}
          onPress={() => setShowTechnicianModal(true)}
        >
          <HardHat size={20} color="#666666" />
          <Text style={styles.configButtonText}>TÉCNICO</Text>
        </TouchableOpacity>
      </View>

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
          {/* Santander Logo Area */}
          <View style={styles.logoSection}>
            <Image 
              source={require('@/assets/images/banco-santander-seeklogo.png')}
              style={styles.santanderLogo}
              resizeMode="contain"
            />
          </View>

          {/* Emergency Alert Card */}
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

          {/* Deactivate Emergency Button */}
          <TouchableOpacity 
            style={styles.deactivateEmergencyButton}
            onPress={handleEmergencyToggle}
          >
            <Text style={styles.deactivateEmergencyButtonText}>DESACTIVAR EMERGENCIA</Text>
          </TouchableOpacity>

          {/* Footer Text */}
          <Text style={styles.footerText}>Pantalla modo emergencia</Text>
        </View>
      ) : isCargaCajeroMode ? (
        /* Carga Cajero Mode View */
        <View style={styles.mainContent}>
          {/* Santander Logo Area */}
          <View style={styles.logoSection}>
            <Image 
              source={require('@/assets/images/banco-santander-seeklogo.png')}
              style={styles.santanderLogo}
              resizeMode="contain"
            />
          </View>

          {/* Carga Cajero Card */}
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

          {/* Bottom Buttons */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity 
              style={styles.emergencyButton}
              onPress={handleEmergencyToggle}
            >
              <Text style={styles.emergencyButtonText}>EMERGENCIA</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.visualizationButton}
              onPress={() => setShowVisualizationModal(true)}
            >
              <Text style={styles.visualizationButtonText}>VISUALIZACIÓN</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Text */}
          <Text style={styles.footerText}>Pantalla principal logo, estado puerta</Text>
        </View>
      ) : isManualMode ? (
        /* Manual Mode View - Handled by modal at bottom */
        <View style={styles.mainContent}>
          {/* Content handled by ManualModeModal */}
        </View>
      ) : (
        /* Normal Mode View */
        <View style={styles.mainContent}>
          {/* Santander Logo Area */}
          <View style={styles.logoSection}>
            <Image 
              source={require('@/assets/images/banco-santander-seeklogo.png')}
              style={styles.santanderLogo}
              resizeMode="contain"
            />
          </View>

          {/* Operation Mode Section */}
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

          {/* Bottom Buttons */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity 
              style={styles.emergencyButton}
              onPress={handleEmergencyToggle}
            >
              <Text style={styles.emergencyButtonText}>ACTIVAR EMERGENCIA</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.visualizationButton}
              onPress={() => setShowVisualizationModal(true)}
            >
              <Text style={styles.visualizationButtonText}>VISUALIZACIÓN</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Text */}
          <Text style={styles.footerText}>Pantalla principal logo, estado puerta</Text>
        </View>
      )}

      {/* Login Modal */}
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* New Configuration Modal */}
      <NewConfigurationModal
        visible={showNewConfigModal}
        onClose={() => setShowNewConfigModal(false)}
        onSave={handleConfigSave}
      />

      {/* Mode Selection Modal */}
      <ModeSelectionModal
        visible={showModeModal}
        onClose={() => setShowModeModal(false)}
        onModeSelect={handleModeSelect}
      />

      {/* Visualization Modal */}
      <VisualizationModal
        visible={showVisualizationModal}
        onClose={() => setShowVisualizationModal(false)}
      />

      {/* Technician Modal */}
      <TechnicianModal
        visible={showTechnicianModal}
        onClose={() => setShowTechnicianModal(false)}
      />

      {/* Manual Mode Modal */}
      <ManualModeModal
        visible={showManualModeModal || isManualMode}
        onClose={() => setShowManualModeModal(false)}
        onChangeMode={() => setShowModeModal(true)}
        onEmergency={handleEmergencyToggle}
        onVisualization={() => setShowVisualizationModal(true)}
      />
    </View>
  );
}