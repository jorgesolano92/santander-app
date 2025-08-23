import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { Settings, MessageCircle, DoorOpen, FileSliders as Sliders } from 'lucide-react-native';
import { Image } from 'react-native';
import ConfigurationModal from '@/components/ConfigurationModal';
import ModeSelectionModal from '@/components/ModeSelectionModal';
import VisualizationModal from '@/components/VisualizationModal';
import { useDoorControl } from '@/hooks/useDoorControl';

const { width, height } = Dimensions.get('window');

export default function MainScreen() {
  const {
    systemStatus,
    isLoading,
    error,
    connectionStatus,
    changeMode,
    toggleEmergency,
    configure,
    validateDevice,
  } = useDoorControl();

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [showVisualizationModal, setShowVisualizationModal] = useState(false);

  // Estados derivados del sistema real
  const currentMode = systemStatus?.mode || 'COMERCIAL AUTOMATICO';
  const isEmergencyActive = systemStatus?.emergencyActive || false;
  const isCargaCajeroMode = currentMode === 'CARGA DE CAJERO';
  const isManualMode = currentMode.includes('MANUAL');

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

  const handleModeSelect = async (mode: string) => {
    // Mapear el ID del modo a un texto descriptivo
    const modeMap: { [key: string]: string } = {
      'comercial_independiente': 'COMERCIAL INDEPENDIENTE',
      'comercial_automatico': 'COMERCIAL AUTOMÁTICO',
      'comercial_semiautomatico': 'COMERCIAL SEMIAUTOMÁTICO',
      'comercial_manual': 'COMERCIAL MANUAL',
      'extendido_semiautomatico': 'EXTENDIDO SEMIAUTOMÁTICO',
      'extendido_manual': 'EXTENDIDO MANUAL',
      'atm': 'ATM',
      'cerrado': 'CERRADO',
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
        <View style={styles.headerRight}>
          {/* Indicador de conexión */}
          <View style={[styles.connectionIndicator, { backgroundColor: connectionStatus === 'online' ? '#28A745' : '#DC3545' }]}>
            <Text style={styles.connectionText}>
              {connectionStatus === 'online' ? 'SANDBOX' : 'OFFLINE'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.configButton}
            onPress={() => setShowConfigModal(true)}
          >
            <Settings size={20} color="#666666" />
            <Text style={styles.configButtonText}>CONFIGURACIÓN</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.configButton}
            onPress={() => console.log('Ajustes - Funcionalidad pendiente')}
          >
            <Sliders size={20} color="#666666" />
            <Text style={styles.configButtonText}>AJUSTES</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Display */}
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
        /* Manual Mode View */
        <View style={styles.mainContent}>
          {/* Manual Mode Header */}
          <View style={styles.manualModeHeader}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>i</Text>
            </View>
            <View style={styles.manualModeHeaderContent}>
              <Text style={styles.manualModeTitle}>MODO MANUAL</Text>
              <Text style={styles.manualModeDescription}>
                La puerta P1 y la puerta P2 actúan de forma manual, es decir, tanto si se va en dirección entrada como de salida, será necesario pulsar el botón de llamada de los video porteros ubicados en la parte exterior de las puertas o los pulsadores retro iluminados ubicados en el interior de las puertas. Los detectores de movimiento interiores y exteriores actuarán sólo en modo seguridad, es decir, cuando la puerta esté abierta, protegerán a los usuarios frente al atrapamiento cuando ésta se cierre. Las puertas trabajan en modo esclusa; es decir una puerta no abre hasta que la otra esté cerrada.
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.changeModeButtonManual}
              onPress={() => setShowModeModal(true)}
            >
              <Text style={styles.changeModeButtonTextManual}>CAMBIAR MODO</Text>
            </TouchableOpacity>
          </View>

          {/* Door Controls */}
          <View style={styles.doorControlsContainer}>
            {/* Puerta Oficina */}
            <View style={styles.doorControlSection}>
              <Text style={styles.doorControlTitle}>PUERTA OFICINA</Text>
              <View style={styles.doorControlCard}>
                <TouchableOpacity 
                  style={styles.doorControlButton}
                  onPress={() => console.log('Comunicar Puerta Oficina')}
                >
                  <MessageCircle size={16} color="#495057" />
                  <Text style={styles.doorControlButtonText}>COMUNICAR</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.doorControlButton}
                  onPress={() => console.log('Abrir Puerta Oficina')}
                >
                  <DoorOpen size={16} color="#495057" />
                  <Text style={styles.doorControlButtonText}>ABRIR</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Puerta Calle */}
            <View style={styles.doorControlSection}>
              <Text style={styles.doorControlTitle}>PUERTA CALLE</Text>
              <View style={styles.doorControlCard}>
                <TouchableOpacity 
                  style={styles.doorControlButton}
                  onPress={() => console.log('Comunicar Puerta Calle')}
                >
                  <MessageCircle size={16} color="#495057" />
                  <Text style={styles.doorControlButtonText}>COMUNICAR</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.doorControlButton}
                  onPress={() => console.log('Abrir Puerta Calle')}
                >
                  <DoorOpen size={16} color="#495057" />
                  <Text style={styles.doorControlButtonText}>ABRIR</Text>
                </TouchableOpacity>
              </View>
            </View>
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

      {/* Configuration Modal */}
      <ConfigurationModal
        visible={showConfigModal}
        onClose={() => setShowConfigModal(false)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#495057',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  notificationsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  notificationsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  connectionIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  configButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  configButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  errorBanner: {
    backgroundColor: '#F8D7DA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
  },
  errorText: {
    fontSize: 14,
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
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    padding: 32,
  },
  emergencyContent: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  santanderLogo: {
    width: 380,
    height: 120,
  },
  operationSection: {
    marginBottom: 32,
  },
  modeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  modeDescription: {
    fontSize: 15,
    color: '#6C757D',
    lineHeight: 22,
    fontWeight: '400',
  },
  changeModeButton: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    marginLeft: 20,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  changeModeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
    letterSpacing: 0.5,
  },
  emergencyCard: {
    backgroundColor: '#EC1C24',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
    width: '100%',
    maxWidth: 1000,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  emergencyDescription: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    fontWeight: '400',
    opacity: 0.95,
  },
  deactivateEmergencyButton: {
    backgroundColor: '#EC1C24',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 24,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    textAlign: 'center',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
  },
  emergencyButton: {
    flex: 1,
    backgroundColor: '#EC1C24',
    paddingVertical: 20,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  visualizationButton: {
    flex: 1,
    backgroundColor: '#495057',
    paddingVertical: 20,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 13,
    color: '#6C757D',
    textAlign: 'left',
    fontWeight: '400',
  },
  cargaCajeroCard: {
    backgroundColor: '#F0F466', // Amarillo como en la imagen
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#4A5D23', // Verde oscuro para el título sobre fondo amarillo
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  cargaCajeroDescription: {
    fontSize: 15,
    color: '#5D6B2F', // Verde medio para la descripción sobre fondo amarillo
    lineHeight: 22,
    fontWeight: '400',
  },
  changeModeButtonCarga: {
    backgroundColor: '#F5F5DC',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    marginLeft: 20,
    borderWidth: 1,
    borderColor: '#D4D4AA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  changeModeButtonTextCarga: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5D23',
    letterSpacing: 0.5,
  },
  manualModeHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#495057',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    flexShrink: 0,
  },
  infoIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  manualModeHeaderContent: {
    flex: 1,
  },
  manualModeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  manualModeDescription: {
    fontSize: 15,
    color: '#6C757D',
    lineHeight: 22,
    fontWeight: '400',
  },
  changeModeButtonManual: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    marginLeft: 20,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
    letterSpacing: 0.5,
  },
  doorControlsContainer: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 32,
    justifyContent: 'center',
  },
  doorControlSection: {
    flex: 1,
    maxWidth: 350,
  },
  doorControlTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  doorControlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
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
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#CED4DA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  doorControlButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
    letterSpacing: 0.5,
  },
});