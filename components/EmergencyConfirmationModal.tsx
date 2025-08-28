import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';

interface EmergencyConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeactivating?: boolean;
}

export default function EmergencyConfirmationModal({ 
  visible, 
  onClose, 
  onConfirm, 
  isDeactivating = false 
}: EmergencyConfirmationModalProps) {
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    header: {
      backgroundColor: '#EC1C24',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      paddingVertical: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    headerTitle: {
      fontSize: isSmallTablet ? 16 : isLargeTablet ? 20 : 18,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    closeButton: {
      padding: 8,
    },
    content: {
      padding: isSmallTablet ? 24 : isLargeTablet ? 40 : 32,
      alignItems: 'center',
    },
    iconContainer: {
      width: isSmallTablet ? 80 : isLargeTablet ? 100 : 90,
      height: isSmallTablet ? 80 : isLargeTablet ? 100 : 90,
      borderRadius: isSmallTablet ? 40 : isLargeTablet ? 50 : 45,
      backgroundColor: '#FFF3CD',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      borderWidth: 3,
      borderColor: '#FFC107',
    },
    warningTitle: {
      fontSize: isSmallTablet ? 20 : isLargeTablet ? 28 : 24,
      fontWeight: '700',
      color: '#EC1C24',
      marginBottom: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    warningMessage: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      color: '#495057',
      lineHeight: isSmallTablet ? 20 : isLargeTablet ? 26 : 22,
      textAlign: 'center',
      marginBottom: isSmallTablet ? 24 : isLargeTablet ? 40 : 32,
      fontWeight: '400',
    },
    buttonsContainer: {
      flexDirection: 'row',
      gap: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      width: '100%',
    },
    cancelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#6C757D',
      paddingHorizontal: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      paddingVertical: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      borderRadius: 8,
      shadowColor: '#6C757D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    cancelButtonText: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    confirmButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#EC1C24',
      paddingHorizontal: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      paddingVertical: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      borderRadius: 8,
      shadowColor: '#EC1C24',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    confirmButtonText: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    deactivateButton: {
      backgroundColor: '#28A745',
    },
    deactivateButtonText: {
      color: '#FFFFFF',
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isDeactivating ? 'DESACTIVAR EMERGENCIA' : 'ACTIVAR EMERGENCIA'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Warning Icon */}
            <View style={styles.iconContainer}>
              <AlertTriangle size={isSmallTablet ? 40 : isLargeTablet ? 50 : 45} color="#FFC107" />
            </View>

            {/* Warning Title */}
            <Text style={styles.warningTitle}>
              {isDeactivating ? '¿DESACTIVAR EMERGENCIA?' : '¿ACTIVAR EMERGENCIA?'}
            </Text>

            {/* Warning Message */}
            <Text style={styles.warningMessage}>
              {isDeactivating 
                ? 'Se restaurarán las restricciones y lógicas de seguridad normales. Las puertas volverán a su funcionamiento estándar según el modo seleccionado.'
                : 'Esta acción deshabilitará todas las restricciones y lógicas de seguridad. Ambas puertas permanecerán desbloqueadas. Use solo en situaciones críticas.'
              }
            </Text>

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.confirmButton,
                  isDeactivating && styles.deactivateButton
                ]}
                onPress={onConfirm}
              >
                <Text style={[
                  styles.confirmButtonText,
                  isDeactivating && styles.deactivateButtonText
                ]}>
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