import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Flame } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';

interface FireConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeactivating?: boolean;
}

export default function FireConfirmationModal({
  visible,
  onClose,
  onConfirm,
  isDeactivating = false,
}: FireConfirmationModalProps) {
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;
  const accent = '#E85D04';

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      width: isSmallTablet ? '90%' : isLargeTablet ? '60%' : '75%',
      maxWidth: isSmallTablet ? 500 : isLargeTablet ? 700 : 600,
      elevation: 8,
    },
    header: {
      backgroundColor: accent,
      paddingHorizontal: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      paddingVertical: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    headerTitle: {
      fontSize: isSmallTablet ? 16 : isLargeTablet ? 20 : 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    content: {
      padding: isSmallTablet ? 24 : isLargeTablet ? 40 : 32,
      alignItems: 'center',
    },
    iconContainer: {
      width: isSmallTablet ? 80 : isLargeTablet ? 100 : 90,
      height: isSmallTablet ? 80 : isLargeTablet ? 100 : 90,
      borderRadius: isSmallTablet ? 40 : isLargeTablet ? 50 : 45,
      backgroundColor: '#FFF4E6',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      borderWidth: 3,
      borderColor: '#FFB366',
    },
    title: {
      fontSize: isSmallTablet ? 20 : isLargeTablet ? 28 : 24,
      fontWeight: '700',
      color: accent,
      marginBottom: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      textAlign: 'center',
    },
    message: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      color: '#495057',
      lineHeight: isSmallTablet ? 20 : isLargeTablet ? 26 : 22,
      textAlign: 'center',
      marginBottom: isSmallTablet ? 24 : isLargeTablet ? 40 : 32,
    },
    buttonsContainer: {
      flexDirection: 'row',
      gap: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      width: '100%',
    },
    cancelButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#6C757D',
      paddingVertical: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      borderRadius: 8,
    },
    cancelButtonText: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    confirmButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: accent,
      paddingVertical: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      borderRadius: 8,
    },
    confirmButtonText: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isDeactivating ? 'DESACTIVAR SEÑAL DE INCENDIO' : 'ACTIVAR SEÑAL DE INCENDIO'}
            </Text>
          </View>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Flame size={isSmallTablet ? 40 : isLargeTablet ? 50 : 45} color={accent} />
            </View>
            <Text style={styles.title}>
              {isDeactivating ? '¿DESACTIVAR INCENDIO?' : '¿ACTIVAR INCENDIO?'}
            </Text>
            <Text style={styles.message}>
              {isDeactivating
                ? 'Se restaurará el modo operativo anterior en el panel cuando la señal lo permita.'
                : 'Se activará la regla de señal de incendio en el panel. Las puertas y salidas seguirán la lógica configurada para incendio.'}
            </Text>
            <View style={styles.buttonsContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
                <Text style={styles.confirmButtonText}>
                  {isDeactivating ? 'DESACTIVAR' : 'ACTIVAR'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
