import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal } from 'react-native';
import { useState } from 'react';
import { User, X, Search } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import { doorControlService } from '@/services/DoorControlService';

interface TechnicianModalProps {
  visible: boolean;
  onClose: () => void;
}

interface TechnicianData {
  dni: string;
  nombre: string;
  apellido: string;
  empresa: string;
  validez: string;
}
export default function TechnicianModal({ visible, onClose }: TechnicianModalProps) {
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

  const [dni, setDni] = useState<string>('');
  const [currentView, setCurrentView] = useState<'input' | 'result' | 'notfound'>('input');
  const [technicianData, setTechnicianData] = useState<TechnicianData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleConsult = () => {
    console.log('🔍 Consultando DNI:', dni);
    if (!dni.trim()) {
      return;
    }
    setIsLoading(true);
    void (async () => {
      try {
        const result = await doorControlService.lookupTechnician(dni.trim());
        if (result.found && result.technician) {
          const t = result.technician;
          setTechnicianData({
            dni: t.dni,
            nombre: t.nombre,
            apellido: t.apellidos,
            empresa: t.empresa,
            validez: t.valido_hasta || '—',
          });
          setCurrentView('result');
        } else {
          setCurrentView('notfound');
        }
      } catch {
        setCurrentView('notfound');
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const handleClose = () => {
    console.log('❌ Cerrando modal técnico');
    setDni('');
    setCurrentView('input');
    setTechnicianData(null);
    onClose();
  };

  const handleBack = () => {
    console.log('⬅️ Volviendo a vista DNI');
    setCurrentView('input');
    setTechnicianData(null);
  };

  const handlePermitido = () => {
    console.log('✅ Técnico autorizado:', technicianData?.nombre, technicianData?.apellido);
    handleClose();
  };

  const handleOverlayPress = () => {
    handleClose();
  };

  const handleModalPress = (e: any) => {
    e.stopPropagation();
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
      width: isSmallTablet ? '95%' : isLargeTablet ? '75%' : '85%',
      maxWidth: isSmallTablet ? 550 : isLargeTablet ? 800 : 675,
      maxHeight: '80%',
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
      padding: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
    },
    inputSection: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: '#212529',
      marginBottom: 6,
      letterSpacing: 0.3,
    },
    inputUnderline: {
      height: 1,
      backgroundColor: '#212529',
      marginBottom: 6,
    },
    textInput: {
      fontSize: 15,
      color: '#212529',
      paddingVertical: 10,
      paddingHorizontal: 0,
      backgroundColor: 'transparent',
      minHeight: 35,
      fontFamily: 'monospace',
    },
    exampleSection: {
      backgroundColor: '#E3F2FD',
      padding: 14,
      borderRadius: 8,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: '#2196F3',
    },
    exampleTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: '#1976D2',
      marginBottom: 6,
    },
    exampleText: {
      fontSize: 13,
      color: '#1976D2',
      fontFamily: 'monospace',
      marginBottom: 4,
    },
    resultSection: {
      marginBottom: 20,
    },
    dataCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: '#E9ECEF',
    },
    dataRow: {
      flexDirection: 'row',
      marginBottom: 14,
      alignItems: 'center',
    },
    dataLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: '#495057',
      minWidth: 90,
      letterSpacing: 0.3,
    },
    dataValue: {
      fontSize: 15,
      color: '#212529',
      fontWeight: '500',
      flex: 1,
    },
    notFoundSection: {
      marginBottom: 20,
    },
    notFoundCard: {
      backgroundColor: '#FFEBEE',
      borderRadius: 12,
      padding: 20,
      borderLeftWidth: 4,
      borderLeftColor: '#F44336',
      alignItems: 'center',
    },
    notFoundTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#C62828',
      marginBottom: 10,
      letterSpacing: 0.5,
    },
    notFoundDescription: {
      fontSize: 13,
      color: '#C62828',
      textAlign: 'center',
      lineHeight: 18,
    },
    buttonsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    closeButtonSecondary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#6C757D',
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 8,
      gap: 6,
      shadowColor: '#6C757D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    closeButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    consultButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#495057',
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 8,
      gap: 6,
      shadowColor: '#495057',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    consultButtonDisabled: {
      opacity: 0.6,
    },
    consultButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    backButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#6C757D',
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 8,
      gap: 6,
      shadowColor: '#6C757D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    backButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    permitidoButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#28A745',
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 8,
      gap: 6,
      shadowColor: '#28A745',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    permitidoButtonText: {
      fontSize: 14,
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
      onRequestClose={handleClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={handleOverlayPress}
      >
        <TouchableOpacity 
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={handleModalPress}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {currentView === 'input' ? 'INTRODUCIR DNI' : 
               currentView === 'result' ? 'VISTA TÉCNICOS' : 'DNI NO ENCONTRADO'}
            </Text>
          </View>

          <View style={styles.content}>
            {currentView === 'input' && (
              <>
                {/* DNI Input View */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>DNI:</Text>
                  <View style={styles.inputUnderline} />
                  <TextInput
                    style={styles.textInput}
                    value={dni}
                    onChangeText={setDni}
                    placeholder="12345678A"
                    autoCapitalize="characters"
                    maxLength={9}
                  />
                </View>

                {/* Ejemplo de DNI válido */}
                <View style={styles.exampleSection}>
                  <Text style={styles.exampleTitle}>DNIs de prueba:</Text>
                  <Text style={styles.exampleText}>12345678A - Juan García López</Text>
                  <Text style={styles.exampleText}>87654321B - María Rodríguez Martín</Text>
                  <Text style={styles.exampleText}>11223344C - Carlos Fernández Silva</Text>
                </View>

                {/* Buttons */}
                <View style={styles.buttonsContainer}>
                  <TouchableOpacity 
                    style={styles.closeButtonSecondary}
                    onPress={handleClose}
                  >
                    <Text style={styles.closeButtonText}>CERRAR</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.consultButton, isLoading && styles.consultButtonDisabled]} 
                    onPress={handleConsult}
                    disabled={isLoading}
                  >
                    <Search size={20} color="#FFFFFF" />
                    <Text style={styles.consultButtonText}>
                      {isLoading ? 'CONSULTANDO...' : 'CONSULTAR'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {currentView === 'result' && technicianData && (
              <>
                {/* Technician Data View */}
                <View style={styles.resultSection}>
                  <View style={styles.dataCard}>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>NOMBRE:</Text>
                      <Text style={styles.dataValue}>{technicianData.nombre}</Text>
                    </View>
                    
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>APELLIDO:</Text>
                      <Text style={styles.dataValue}>{technicianData.apellido}</Text>
                    </View>
                    
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>EMPRESA:</Text>
                      <Text style={styles.dataValue}>{technicianData.empresa}</Text>
                    </View>
                    
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>VALIDEZ:</Text>
                      <Text style={styles.dataValue}>{technicianData.validez}</Text>
                    </View>
                    
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>DNI:</Text>
                      <Text style={styles.dataValue}>{technicianData.dni}</Text>
                    </View>
                  </View>
                </View>

                {/* Buttons */}
                <View style={styles.buttonsContainer}>
                  <TouchableOpacity 
                    style={styles.backButton}
                    onPress={handleBack}
                  >
                    <Text style={styles.backButtonText}>VOLVER</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.permitidoButton}
                    onPress={handlePermitido}
                  >
                    <Text style={styles.permitidoButtonText}>PERMITIDO</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {currentView === 'notfound' && (
              <>
                {/* Not Found View */}
                <View style={styles.notFoundSection}>
                  <View style={styles.notFoundCard}>
                    <Text style={styles.notFoundTitle}>DNI NO ENCONTRADO</Text>
                    <Text style={styles.notFoundDescription}>
                      El DNI "{dni}" no se encuentra en la base de datos de técnicos autorizados.
                    </Text>
                  </View>
                </View>

                {/* Buttons */}
                <View style={styles.buttonsContainer}>
                  <TouchableOpacity 
                    style={styles.closeButtonSecondary}
                    onPress={handleClose}
                  >
                    <Text style={styles.closeButtonText}>CERRAR</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.backButton}
                    onPress={handleClose}
                  >
                    <Text style={styles.backButtonText}>VOLVER</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}