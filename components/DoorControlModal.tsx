import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useState } from 'react';
import { X, Lock, Clock as Unlock, MessageCircle, DoorOpen } from 'lucide-react-native';
import { useDoorControl } from '@/hooks/useDoorControl';

interface DoorControlModalProps {
  visible: boolean;
  onClose: () => void;
  doorId: 'P1' | 'P2' | 'P3' | 'P4';
  doorName: string;
}

export default function DoorControlModal({ visible, onClose, doorId, doorName }: DoorControlModalProps) {
  const [isCommunicating, setIsCommunicating] = useState(false);
  const { systemStatus, controlDoor } = useDoorControl();
  
  // Obtener estado actual de la puerta
  const currentDoor = systemStatus?.doors[doorId];
  const doorStatus = currentDoor?.status || 'closed';
  const isLocked = currentDoor?.locked ?? true;
  const isOpening = doorStatus === 'opening';
  const isClosing = doorStatus === 'closing';
  const isOpen = doorStatus === 'open';

  const handleCommunicate = () => {
    console.log(`📞 Comunicar con ${doorName}`);
    setIsCommunicating(true);
    
    // Simular comunicación por 3 segundos
    setTimeout(() => {
      setIsCommunicating(false);
    }, 3000);
  };

  const handleOpenDoor = async () => {
    console.log(`🚪 ${isOpen ? 'Cerrando' : 'Abriendo'} ${doorName}`);
    
    const action = isOpen ? 'close' : 'open';
    const success = await controlDoor(doorId, action);
    
    if (success) {
      console.log(`✅ ${doorName} - Comando ${action} ejecutado correctamente`);
    } else {
      console.error(`❌ Error ejecutando comando ${action} en ${doorName}`);
    }
  };

  // Función para obtener el texto del estado de la puerta
  const getDoorStatusText = () => {
    switch (doorStatus) {
      case 'open':
        return 'ABIERTA';
      case 'closed':
        return 'CERRADA';
      case 'opening':
        return 'ABRIENDO...';
      case 'closing':
        return 'CERRANDO...';
      case 'error':
        return 'ERROR';
      default:
        return 'DESCONOCIDO';
    }
  };

  // Función para obtener el texto del botón
  const getButtonText = () => {
    if (isOpening) return 'ABRIENDO...';
    if (isClosing) return 'CERRANDO...';
    return isOpen ? 'CERRAR PUERTA' : 'ABRIR PUERTA';
  };

  // Función para determinar si el botón está deshabilitado
  const isButtonDisabled = () => {
    return isOpening || isClosing;
  };

  const handleEmergency = () => {
    console.log(`🚨 Activando emergencia desde ${doorName}`);
  };

  const handleVisualization = () => {
    console.log(`👁️ Ver visualización desde ${doorName}`);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SAIMA SEGURIDAD – Panel de control puertas SECURA</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Door Title */}
          <Text style={styles.doorTitle}>{doorName}</Text>

          {/* Main Content Area */}
          <View style={styles.mainArea}>
            {/* Left Side - Video/Camera Area */}
            <View style={styles.videoSection}>
              <View style={styles.videoPlaceholder}>
                <View style={styles.cameraIcon}>
                  <View style={styles.cameraIconInner} />
                </View>
                <Text style={styles.videoText}>Vista de cámara</Text>
              </View>
            </View>

            {/* Right Side - Controls */}
            <View style={styles.controlsSection}>
              {/* Control Buttons */}
              <View style={styles.controlButtons}>
                <TouchableOpacity 
                  style={[
                    styles.controlButton,
                    isCommunicating && styles.communicatingButton
                  ]}
                  onPress={handleCommunicate}
                  disabled={isCommunicating}
                >
                  <MessageCircle size={18} color={isCommunicating ? "#FFFFFF" : "#495057"} />
                  <Text style={[
                    styles.controlButtonText,
                    isCommunicating && styles.communicatingButtonText
                  ]}>
                    {isCommunicating ? 'COMUNICANDO...' : 'COMUNICAR'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.controlButton, 
                    isButtonDisabled() && styles.controlButtonDisabled,
                    isOpen && styles.controlButtonClose
                  ]}
                  onPress={handleOpenDoor}
                  disabled={isButtonDisabled()}
                >
                  <DoorOpen size={18} color={isOpen ? "#FFFFFF" : "#495057"} />
                  <Text style={[
                    styles.controlButtonText,
                    isOpen && styles.controlButtonCloseText
                  ]}>
                    {getButtonText()}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Door Status */}
              <View style={styles.statusSection}>
                <Text style={styles.statusTitle}>ESTADO DE PUERTA</Text>
                <View style={styles.statusRow}>
                  <Text style={[
                    styles.statusText,
                    (isOpening || isClosing) && styles.statusTextAnimated
                  ]}>
                    {getDoorStatusText()}
                  </Text>
                  {isLocked ? (
                    <Lock size={20} color="#212529" />
                  ) : (
                    <Unlock size={20} color="#28A745" />
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Bottom Buttons */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity 
              style={styles.emergencyButton}
              onPress={handleEmergency}
            >
              <Text style={styles.emergencyButtonText}>ACTIVAR EMERGENCIA</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.visualizationButton}
              onPress={handleVisualization}
            >
              <Text style={styles.visualizationButtonText}>VISUALIZACIÓN</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Text */}
          <Text style={styles.footerText}>Pantalla acceso a visualización puerta {doorName.toLowerCase()}</Text>
        </View>
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 12,
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
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  doorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  mainArea: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  videoSection: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    width: '100%',
    maxWidth: 400,
    aspectRatio: 4/3,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraIcon: {
    width: 50,
    height: 38,
    backgroundColor: '#E9ECEF',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cameraIconInner: {
    width: 25,
    height: 18,
    backgroundColor: '#CED4DA',
    borderRadius: 4,
  },
  videoText: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '500',
  },
  controlsSection: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 16,
  },
  controlButtons: {
    gap: 16,
    marginBottom: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9ECEF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#CED4DA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  controlButtonDisabled: {
    opacity: 0.6,
  },
  communicatingButton: {
    backgroundColor: '#28A745',
    borderColor: '#1E7E34',
  },
  communicatingButtonText: {
    color: '#FFFFFF',
  },
  controlButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    letterSpacing: 0.5,
  },
  controlButtonClose: {
    backgroundColor: '#DC3545',
    borderColor: '#C82333',
  },
  controlButtonCloseText: {
    color: '#FFFFFF',
  },
  statusSection: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  statusRow: {
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  statusTextAnimated: {
    color: '#17A2B8',
    fontWeight: '700',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  emergencyButton: {
    flex: 1,
    backgroundColor: '#EC1C24',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EC1C24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  emergencyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  visualizationButton: {
    flex: 1,
    backgroundColor: '#495057',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#495057',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  visualizationButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 11,
    color: '#6C757D',
    textAlign: 'left',
    fontWeight: '400',
  },
});