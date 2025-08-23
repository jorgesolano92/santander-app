import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal } from 'react-native';
import { useState } from 'react';
import { User, X, Search } from 'lucide-react-native';

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

// Base de datos simulada de técnicos
const TECHNICIANS_DB: TechnicianData[] = [
  {
    dni: '12345678A',
    nombre: 'Juan',
    apellido: 'García López',
    empresa: 'SAIMA Seguridad',
    validez: '2025-12-31'
  },
  {
    dni: '87654321B',
    nombre: 'María',
    apellido: 'Rodríguez Martín',
    empresa: 'Técnicos Santander',
    validez: '2025-06-30'
  },
  {
    dni: '11223344C',
    nombre: 'Carlos',
    apellido: 'Fernández Silva',
    empresa: 'SAIMA Seguridad',
    validez: '2024-12-31'
  }
];

export default function TechnicianModal({ visible, onClose }: TechnicianModalProps) {
  const [dni, setDni] = useState<string>('');
  const [currentView, setCurrentView] = useState<'input' | 'result' | 'notfound'>('input');
  const [technicianData, setTechnicianData] = useState<TechnicianData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleConsult = () => {
    if (!dni.trim()) return;
    
    setIsLoading(true);
    
    // Simular consulta a base de datos
    setTimeout(() => {
      const foundTechnician = TECHNICIANS_DB.find(
        tech => tech.dni.toLowerCase() === dni.trim().toLowerCase()
      );
      
      if (foundTechnician) {
        setTechnicianData(foundTechnician);
        setCurrentView('result');
      } else {
        setCurrentView('notfound');
      }
      setIsLoading(false);
    }, 1000);
  };

  const handleClose = () => {
    setDni('');
    setCurrentView('input');
    setTechnicianData(null);
    onClose();
  };

  const handleBack = () => {
    setCurrentView('input');
    setTechnicianData(null);
  };

  const handlePermitido = () => {
    console.log('✅ Técnico autorizado:', technicianData?.nombre, technicianData?.apellido);
    handleClose();
  };

  const formatDNI = (value: string) => {
    // Formatear DNI español (8 números + 1 letra)
    const cleaned = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    if (cleaned.length <= 8) {
      return cleaned;
    }
    return cleaned.slice(0, 8) + cleaned.slice(8, 9);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {currentView === 'input' ? 'INTRODUCIR DNI' : 
               currentView === 'result' ? 'VISTA TÉCNICOS' : 'DNI NO ENCONTRADO'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {currentView === 'input' && (
              <>
                {/* DNI Input View */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>DNI ESPAÑOL:</Text>
                  <View style={styles.inputUnderline} />
                  <TextInput
                    style={styles.textInput}
                    value={dni}
                    onChangeText={(text) => setDni(formatDNI(text))}
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
                    disabled={isLoading || !dni.trim()}
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
                    onPress={handleBack}
                  >
                    <Text style={styles.backButtonText}>VOLVER</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

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
    width: '90%',
    maxWidth: 600,
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    padding: 32,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputUnderline: {
    height: 1,
    backgroundColor: '#212529',
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    color: '#212529',
    paddingVertical: 12,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    minHeight: 40,
    fontFamily: 'monospace',
  },
  exampleSection: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: '#1976D2',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  resultSection: {
    marginBottom: 24,
  },
  dataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
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
    marginBottom: 16,
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    minWidth: 100,
    letterSpacing: 0.3,
  },
  dataValue: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '500',
    flex: 1,
  },
  notFoundSection: {
    marginBottom: 24,
  },
  notFoundCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
    alignItems: 'center',
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#C62828',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  notFoundDescription: {
    fontSize: 14,
    color: '#C62828',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  closeButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C757D',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#6C757D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButtonText: {
    fontSize: 16,
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
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
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
    fontSize: 16,
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
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#6C757D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonText: {
    fontSize: 16,
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
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#28A745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  permitidoButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});