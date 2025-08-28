import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { X, MessageCircle, DoorOpen } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import { useDoorControl } from '@/hooks/useDoorControl';

interface ManualModeModalProps {
  visible: boolean;
  onClose: () => void;
  onChangeMode: () => void;
  onEmergency: () => void;
  onVisualization: () => void;
}

export default function ManualModeModal({ 
  visible, 
  onClose, 
  onChangeMode, 
  onEmergency, 
  onVisualization 
}: ManualModeModalProps) {
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

  const { controlDoor } = useDoorControl();

  const handleCommunicate = (doorName: string) => {
    console.log(`📞 Comunicar con ${doorName}`);
  };

  const handleOpenDoor = async (doorId: 'P1' | 'P2', doorName: string) => {
    console.log(`🚪 Abrir ${doorName}`);
    const success = await controlDoor(doorId, 'open');
    if (success) {
      console.log(`✅ ${doorName} - Comando abrir ejecutado correctamente`);
    } else {
      console.error(`❌ Error abriendo ${doorName}`);
    }
  };

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
      flex: 1,
      padding: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
    },
    modeHeader: {
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
    modeHeaderContent: {
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
      alignSelf: 'flex-start',
    },
    changeModeButtonText: {
      fontSize: isSmallTablet ? 13 : isLargeTablet ? 16 : 14,
      fontWeight: '600',
      color: '#495057',
      letterSpacing: 0.5,
    },
    doorControlsContainer: {
      flexDirection: 'row',
      gap: isSmallTablet ? 16 : isLargeTablet ? 32 : 24,
      marginBottom: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      justifyContent: 'center',
    },
    doorControlSection: {
      flex: 1,
      maxWidth: isSmallTablet ? 280 : isLargeTablet ? 350 : 320,
    },
    doorControlTitle: {
      fontSize: isSmallTablet ? 16 : isLargeTablet ? 20 : 18,
      fontWeight: '700',
      color: '#212529',
      marginBottom: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      letterSpacing: 0.3,
      textAlign: 'center',
    },
    doorControlCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
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
      width: isSmallTablet ? 40 : isLargeTablet ? 60 : 50,
      height: isSmallTablet ? 30 : isLargeTablet ? 45 : 37,
      backgroundColor: '#CED4DA',
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
    },
    cameraIconInner: {
      width: isSmallTablet ? 20 : isLargeTablet ? 30 : 25,
      height: isSmallTablet ? 15 : isLargeTablet ? 22 : 18,
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
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      borderRadius: 8,
      gap: 6,
      borderWidth: 1,
      borderColor: '#CED4DA',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    doorControlButtonText: {
      fontSize: isSmallTablet ? 13 : isLargeTablet ? 16 : 14,
      fontWeight: '600',
      color: '#495057',
      letterSpacing: 0.5,
    },
    bottomButtons: {
      flexDirection: 'row',
      gap: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      marginBottom: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
    },
    emergencyButton: {
      flex: 1,
      backgroundColor: '#EC1C24',
      paddingVertical: isSmallTablet ? 16 : isLargeTablet ? 20 : 18,
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
      fontSize: isSmallTablet ? 15 : isLargeTablet ? 18 : 16,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    visualizationButton: {
      flex: 1,
      backgroundColor: '#495057',
      paddingVertical: isSmallTablet ? 16 : isLargeTablet ? 20 : 18,
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
      fontSize: isSmallTablet ? 15 : isLargeTablet ? 18 : 16,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    footerText: {
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
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
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SAIMA SEGURIDAD – Panel de control puertas SECURA</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Mode Header */}
          <View style={styles.modeHeader}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>i</Text>
            </View>
            <View style={styles.modeHeaderContent}>
              <Text style={styles.modeTitle}>MODO MANUAL</Text>
              <Text style={styles.modeDescription}>
                La puerta P1 y la puerta P2 actúan de forma manual, es decir, tanto si se va en dirección entrada como de salida, será necesario pulsar el botón de llamada de los video porteros ubicados en la parte exterior de las puertas o los pulsadores retro iluminados ubicados en el interior de las puertas. Los detectores de movimiento interiores y exteriores actuarán sólo en modo seguridad, es decir, cuando la puerta esté abierta, protegerán a los usuarios frente al atrapamiento cuando ésta se cierre. Las puertas trabajan en modo esclusa; es decir una puerta no abre hasta que la otra esté cerrada.
              </Text>
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
            {/* Puerta Oficina */}
            <View style={styles.doorControlSection}>
              <Text style={styles.doorControlTitle}>PUERTA OFICINA</Text>
              <View style={styles.doorControlCard}>
                <View style={styles.doorControlImagePlaceholder}>
                  <View style={styles.cameraIcon}>
                    <View style={styles.cameraIconInner} />
                  </View>
                </View>
                
                <View style={styles.doorControlButtons}>
                  <TouchableOpacity 
                    style={styles.doorControlButton}
                    onPress={() => handleCommunicate('Puerta Oficina')}
                  >
                    <MessageCircle size={16} color="#495057" />
                    <Text style={styles.doorControlButtonText}>COMUNICAR</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.doorControlButton}
                    onPress={() => handleOpenDoor('P2', 'Puerta Oficina')}
                  >
                    <DoorOpen size={16} color="#495057" />
                    <Text style={styles.doorControlButtonText}>ABRIR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Puerta Calle */}
            <View style={styles.doorControlSection}>
              <Text style={styles.doorControlTitle}>PUERTA CALLE</Text>
              <View style={styles.doorControlCard}>
                <View style={styles.doorControlImagePlaceholder}>
                  <View style={styles.cameraIcon}>
                    <View style={styles.cameraIconInner} />
                  </View>
                </View>
                
                <View style={styles.doorControlButtons}>
                  <TouchableOpacity 
                    style={styles.doorControlButton}
                    onPress={() => handleCommunicate('Puerta Calle')}
                  >
                    <MessageCircle size={16} color="#495057" />
                    <Text style={styles.doorControlButtonText}>COMUNICAR</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.doorControlButton}
                    onPress={() => handleOpenDoor('P1', 'Puerta Calle')}
                  >
                    <DoorOpen size={16} color="#495057" />
                    <Text style={styles.doorControlButtonText}>ABRIR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
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
              onPress={onVisualization}
            >
              <Text style={styles.visualizationButtonText}>VISUALIZACIÓN</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Text */}
          <Text style={styles.footerText}>Pantalla principal logo, estado puerta</Text>
        </View>
      </View>
    </Modal>
  );
}