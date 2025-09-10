import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { X, Database } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import { ApiResponse } from '@/services/DoorControlService';

interface ApiResponseDisplayModalProps {
  visible: boolean;
  onClose: () => void;
  data: ApiResponse | null;
}

export default function ApiResponseDisplayModal({ visible, onClose, data }: ApiResponseDisplayModalProps) {
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

  const formatJsonData = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      return 'Error al formatear los datos';
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: '#F8F9FA',
      borderRadius: 16,
      width: isSmallTablet ? '95%' : isLargeTablet ? '80%' : '90%',
      maxWidth: isSmallTablet ? 700 : isLargeTablet ? 1000 : 850,
      maxHeight: '90%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    header: {
      backgroundColor: '#495057',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      paddingVertical: isSmallTablet ? 14 : isLargeTablet ? 20 : 16,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    headerTitle: {
      fontSize: isSmallTablet ? 16 : isLargeTablet ? 20 : 18,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    closeButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      padding: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
    },
    summarySection: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      marginBottom: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: '#E9ECEF',
    },
    summaryTitle: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 16 : 15,
      fontWeight: '700',
      color: '#212529',
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      letterSpacing: 0.3,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: isSmallTablet ? 4 : isLargeTablet ? 6 : 5,
    },
    summaryLabel: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 14 : 13,
      fontWeight: '600',
      color: '#495057',
    },
    summaryValue: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 14 : 13,
      fontWeight: '500',
      color: '#212529',
      backgroundColor: '#F8F9FA',
      paddingHorizontal: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
      paddingVertical: isSmallTablet ? 2 : isLargeTablet ? 4 : 3,
      borderRadius: 4,
      fontFamily: 'monospace',
    },
    dataSection: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      flex: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: '#E9ECEF',
    },
    dataSectionHeader: {
      backgroundColor: '#F8F9FA',
      paddingHorizontal: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      paddingVertical: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#E9ECEF',
    },
    dataSectionTitle: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 16 : 15,
      fontWeight: '700',
      color: '#212529',
      letterSpacing: 0.3,
    },
    dataScrollView: {
      flex: 1,
      paddingHorizontal: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      paddingVertical: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
    },
    dataText: {
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 12 : 11,
      color: '#212529',
      fontFamily: 'monospace',
      lineHeight: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
    },
    noDataText: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 16 : 15,
      color: '#6C757D',
      textAlign: 'center',
      fontStyle: 'italic',
      paddingVertical: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
    },
    bottomButtons: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      borderTopWidth: 1,
      borderTopColor: '#E9ECEF',
    },
    closeButtonSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#6C757D',
      paddingHorizontal: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      paddingVertical: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      borderRadius: 8,
      gap: isSmallTablet ? 4 : isLargeTablet ? 8 : 6,
      shadowColor: '#6C757D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    closeButtonText: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 16 : 15,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Database size={20} color="#FFFFFF" />
              <Text style={styles.headerTitle}>RESPUESTA DE LA API</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {data ? (
              <>
                {/* Summary Section */}
                <View style={styles.summarySection}>
                  <Text style={styles.summaryTitle}>RESUMEN DE DATOS</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tags:</Text>
                    <Text style={styles.summaryValue}>{data.tags?.length || 0}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Alarmas:</Text>
                    <Text style={styles.summaryValue}>{data.Alarms?.length || 0}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Eventos:</Text>
                    <Text style={styles.summaryValue}>{data.Events?.length || 0}</Text>
                  </View>
                </View>

                {/* Raw Data Section */}
                <View style={styles.dataSection}>
                  <View style={styles.dataSectionHeader}>
                    <Text style={styles.dataSectionTitle}>DATOS COMPLETOS (JSON)</Text>
                  </View>
                  <ScrollView style={styles.dataScrollView}>
                    <Text style={styles.dataText}>
                      {formatJsonData(data)}
                    </Text>
                  </ScrollView>
                </View>
              </>
            ) : (
              <View style={styles.dataSection}>
                <Text style={styles.noDataText}>
                  No se recibieron datos de la API
                </Text>
              </View>
            )}
          </View>

          {/* Bottom Buttons */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity 
              style={styles.closeButtonSecondary}
              onPress={onClose}
            >
              <X size={20} color="#FFFFFF" />
              <Text style={styles.closeButtonText}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}