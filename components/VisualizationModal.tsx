import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { X, Lock, Clock as Unlock } from 'lucide-react-native';
import { Image } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useDoorControl } from '@/hooks/useDoorControl';
import DoorControlModal from './DoorControlModal';
import { useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VisualizationModalProps {
  visible: boolean;
  onClose: () => void;
}

interface DoorConfig {
  enabled: boolean;
  name: string;
  ipExterior: string;
  ipInterior: string;
}

interface SavedConfiguration {
  doors: DoorConfig[];
}

export default function VisualizationModal({ visible, onClose }: VisualizationModalProps) {
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

  const { systemStatus } = useDoorControl();
  const [selectedDoor, setSelectedDoor] = useState<{ id: 'P1' | 'P2' | 'P3' | 'P4'; name: string } | null>(null);
  const [doorConfig, setDoorConfig] = useState([
    { id: 'P1' as const, name: 'PUERTA CALLE', ip: '192.168.1.100', type: 'Principal' },
    { id: 'P2' as const, name: 'PUERTA OFICINA', ip: '192.168.1.101', type: 'Principal' }
  ]);
  
  // Cargar configuración de puertas guardada
  const loadDoorConfiguration = useCallback(async () => {
    try {
      const savedConfig = await AsyncStorage.getItem('new_door_config');
      if (savedConfig) {
        const config: SavedConfiguration = JSON.parse(savedConfig);
        const enabledDoors = config.doors.filter(door => door.enabled);
        
        const newDoorConfig = enabledDoors.map((door, index) => {
          const doorIds = ['P1', 'P2', 'P3', 'P4'] as const;
          return {
            id: doorIds[index] || 'P1',
            name: door.name.toUpperCase(),
            ip: door.ipExterior || `192.168.1.${100 + index}`,
            type: 'Principal' as const
          };
        });
        
        // Asegurar que siempre haya al menos 2 puertas por defecto
        if (newDoorConfig.length === 0) {
          setDoorConfig([
            { id: 'P1' as const, name: 'PUERTA CALLE', ip: '192.168.1.100', type: 'Principal' },
            { id: 'P2' as const, name: 'PUERTA OFICINA', ip: '192.168.1.101', type: 'Principal' }
          ]);
        } else {
          setDoorConfig(newDoorConfig);
        }
        
        console.log('✅ Configuración de puertas cargada:', newDoorConfig);
      }
    } catch (error) {
      console.error('❌ Error cargando configuración de puertas:', error);
    }
  }, []);

  // Cargar configuración cuando se abre el modal
  useEffect(() => {
    if (visible) {
      loadDoorConfiguration();
    }
  }, [visible, loadDoorConfiguration]);

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
      paddingHorizontal: isSmallTablet ? 24 : isLargeTablet ? 32 : 28,
      paddingVertical: isSmallTablet ? 18 : isLargeTablet ? 24 : 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    headerTitle: {
      fontSize: isSmallTablet ? 18 : isLargeTablet ? 22 : 20,
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
      alignItems: 'center',
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      marginTop: isSmallTablet ? 8 : isLargeTablet ? 16 : 12,
    },
    santanderLogo: {
      width: isSmallTablet ? 280 : isLargeTablet ? 380 : 330,
      height: isSmallTablet ? 80 : isLargeTablet ? 110 : 95,
    },
    doorsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      marginBottom: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      alignItems: 'flex-start',
      justifyContent: 'center',
      maxWidth: '100%',
      flex: 1,
    },
    doorCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      alignItems: 'center',
      minWidth: isSmallTablet ? 240 : isLargeTablet ? 320 : 280,
      maxWidth: isSmallTablet ? 280 : isLargeTablet ? 360 : 320,
      flex: doorConfig.length <= 2 ? 1 : 0,
      maxWidth: doorConfig.length <= 2 ? '45%' : isSmallTablet ? '30%' : '32%',
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
      paddingHorizontal: isSmallTablet ? 24 : isLargeTablet ? 36 : 30,
      paddingVertical: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      borderRadius: 8,
      marginBottom: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      minWidth: isSmallTablet ? 180 : isLargeTablet ? 240 : 210,
      alignItems: 'center',
      shadowColor: '#495057',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    doorButtonText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 14 : 13,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    statusContainer: {
      alignItems: 'center',
    },
    statusLabel: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 14 : 13,
      fontWeight: '700',
      color: '#212529',
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      letterSpacing: 0.3,
      textAlign: 'center',
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    statusText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 14 : 13,
      fontWeight: '600',
      color: '#212529',
      letterSpacing: 0.3,
    },
    backButton: {
      backgroundColor: '#495057',
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 8,
      marginBottom: 20,
      shadowColor: '#495057',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    backButtonText: {
      fontSize: isSmallTablet ? 15 : isLargeTablet ? 18 : 16,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    footerText: {
      fontSize: 12,
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
          <Text style={styles.headerTitle}>VISUALIZACIÓN</Text>
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
                    {isDoorLocked(door.id) ? <Lock size={20} color="#212529" /> : <Unlock size={20} color="#212529" />}
                </View>
                </View>
              </View>
            ))}
          </View>

          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Text style={styles.backButtonText}>VOLVER</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Door Control Modal */}
      {selectedDoor && (
        <DoorControlModal
          visible={!!selectedDoor}
          onClose={() => setSelectedDoor(null)}
          onCloseAll={onClose}
          doorId={selectedDoor.id}
          doorName={selectedDoor.name}
        />
      )}
    </Modal>
  );
}