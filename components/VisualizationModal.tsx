import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { X, Lock, Clock as Unlock } from 'lucide-react-native';
import { Image } from 'react-native';
import { useState } from 'react';
import { useDoorControl } from '@/hooks/useDoorControl';
import DoorControlModal from './DoorControlModal';

interface VisualizationModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function VisualizationModal({ visible, onClose }: VisualizationModalProps) {
  const { systemStatus } = useDoorControl();
  const [selectedDoor, setSelectedDoor] = useState<{ id: 'P1' | 'P2' | 'P3' | 'P4'; name: string } | null>(null);
  
  // Configuración por defecto - siempre 2 puertas
  const doorConfig = [
    { id: 'P1' as const, name: 'PUERTA CALLE', ip: '192.168.1.100', type: 'Principal' },
    { id: 'P2' as const, name: 'PUERTA OFICINA', ip: '192.168.1.101', type: 'Principal' }
  ];

  const getDoorStatusText = (doorId: 'P1' | 'P2' | 'P3' | 'P4') => {
    const door = systemStatus?.doors[doorId];
    if (!door) return 'DESCONOCIDO';
    
    switch (door.status) {
      case 'open':
        return 'ABIERTA';
      case 'closed':
        return 'CERRADA';
      case 'opening':
        return 'ABRIENDO';
      case 'closing':
        return 'CERRANDO';
      case 'error':
        return 'ERROR';
      default:
        return 'DESCONOCIDO';
    }
  };

  const isDoorLocked = (doorId: 'P1' | 'P2' | 'P3' | 'P4') => {
    return systemStatus?.doors[doorId]?.locked ?? true;
  };

  const handleDoorPress = (doorId: 'P1' | 'P2' | 'P3' | 'P4', doorName: string) => {
    setSelectedDoor({ id: doorId, name: doorName });
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

        <View style={styles.content}>
          {/* Santander Logo */}
          <View style={styles.logoSection}>
            <Image 
              source={require('@/assets/images/banco-santander-seeklogo.png')}
              style={styles.santanderLogo}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text style={styles.pageTitle}>VISUALIZACIÓN</Text>
          <View style={styles.titleUnderline} />

          {/* Door Status Cards */}
          <View style={styles.doorsContainer}>
            {doorConfig.map((door) => (
              <View key={door.id} style={styles.doorCard}>
                <TouchableOpacity 
                  style={styles.doorButton}
                  onPress={() => handleDoorPress(door.id, door.name)}
                >
                  <Text style={styles.doorButtonText}>{door.name}</Text>
                </TouchableOpacity>
                
                <View style={styles.statusContainer}>
                  <Text style={styles.statusLabel}>ESTADO DE PUERTA</Text>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusText}>{getDoorStatusText(door.id)}</Text>
                    {isDoorLocked(door.id) ? (
                      <Lock size={20} color="#212529" />
                    ) : (
                      <Unlock size={20} color="#212529" />
                    )}
                  </View>
                </View>
                
                {/* Información adicional de configuración */}
                <View style={styles.doorInfo}>
                  <Text style={styles.doorInfoText}>IP: {door.ip}</Text>
                  <Text style={styles.doorInfoText}>Tipo: {door.type}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Text style={styles.backButtonText}>VOLVER</Text>
          </TouchableOpacity>

          {/* Footer Text */}
          <Text style={styles.footerText}>
            Pantalla acceso a videoporteros - {doorConfig.length} puerta{doorConfig.length !== 1 ? 's' : ''} configurada{doorConfig.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Door Control Modal */}
      {selectedDoor && (
        <DoorControlModal
          visible={!!selectedDoor}
          onClose={() => setSelectedDoor(null)}
          doorId={selectedDoor.id}
          doorName={selectedDoor.name}
        />
      )}
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
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  santanderLogo: {
    width: 280,
    height: 80,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  titleUnderline: {
    width: 160,
    height: 2,
    backgroundColor: '#212529',
    marginBottom: 24,
  },
  doorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    marginBottom: 24,
    alignItems: 'flex-start',
    justifyContent: 'center',
    maxWidth: 1000,
  },
  doorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  doorButton: {
    backgroundColor: '#495057',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 20,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#495057',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  doorButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 12,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    letterSpacing: 0.3,
  },
  doorInfo: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    width: '100%',
  },
  doorInfoText: {
    fontSize: 11,
    color: '#6C757D',
    fontWeight: '500',
    marginBottom: 2,
  },
  backButton: {
    backgroundColor: '#495057',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 24,
    shadowColor: '#495057',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
  nodoorsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  nodoorsText: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
});