import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, X, Wifi } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NewConfigurationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (config: ConfigurationData) => void;
}

interface DoorConfig {
  enabled: boolean;
  name: string;
  ipExterior: string;
  ipInterior: string;
}

interface ScheduleConfig {
  ini1: string;
  ini2: string;
}

interface ConfigurationData {
  doors: DoorConfig[];
  network: {
    consoleIP: string;
    netmask: string;
    gateway: string;
  };
  schedules: {
    comercial: ScheduleConfig;
    extendido: ScheduleConfig;
    autoservicio: ScheduleConfig;
    cerrado: ScheduleConfig;
  };
  officeWithATM: boolean;
}

export default function NewConfigurationModal({ visible, onClose, onSave }: NewConfigurationModalProps) {
  const [config, setConfig] = useState<ConfigurationData>({
    doors: [
      { enabled: true, name: 'Calle (P1)', ipExterior: '192.168.1.26', ipInterior: '192.168.1.27' },
      { enabled: true, name: 'Oficina (P2)', ipExterior: '192.168.1.28', ipInterior: '192.168.1.29' },
      { enabled: false, name: 'Puerta 3', ipExterior: '', ipInterior: '' },
      { enabled: false, name: 'Puerta 4', ipExterior: '', ipInterior: '' },
      { enabled: false, name: 'Puerta 5', ipExterior: '', ipInterior: '' },
    ],
    network: {
      consoleIP: '192.168.1.25',
      netmask: '255.255.255.0',
      gateway: '192.168.1.1',
    },
    schedules: {
      comercial: { ini1: '08:00', ini2: '14:00' },
      extendido: { ini1: '07:00', ini2: '22:00' },
      autoservicio: { ini1: '00:00', ini2: '23:59' },
      cerrado: { ini1: '22:00', ini2: '08:00' },
    },
    officeWithATM: false,
  });

  const [connectionStatus, setConnectionStatus] = useState<{ [key: string]: 'testing' | 'success' | 'error' | null }>({});

  useEffect(() => {
    if (visible) {
      loadSavedConfiguration();
    }
  }, [visible]);

  const loadSavedConfiguration = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem('new_door_config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsedConfig }));
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  };

  const saveConfiguration = async (configToSave: ConfigurationData) => {
    try {
      await AsyncStorage.setItem('new_door_config', JSON.stringify(configToSave));
      console.log('✅ Nueva configuración guardada exitosamente');
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
    }
  };

  const handleSave = async () => {
    await saveConfiguration(config);
    
    // Convertir la configuración al formato esperado por el componente padre
    const configForParent = {
      username: 'admin', // Usuario por defecto
      password: '123456', // Password por defecto  
      officeNumber: '1234', // Número de oficina por defecto
      ...config // Spread de toda la configuración
    };
    
    onSave(configForParent);
    console.log('📋 Nueva configuración completa guardada:', config);
  };

  const updateDoor = (index: number, field: keyof DoorConfig, value: any) => {
    const newDoors = [...config.doors];
    newDoors[index] = { ...newDoors[index], [field]: value };
    setConfig(prev => ({ ...prev, doors: newDoors }));
  };

  const updateNetwork = (field: keyof typeof config.network, value: string) => {
    setConfig(prev => ({
      ...prev,
      network: { ...prev.network, [field]: value }
    }));
  };

  const updateSchedule = (type: keyof typeof config.schedules, field: keyof ScheduleConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      schedules: {
        ...prev.schedules,
        [type]: { ...prev.schedules[type], [field]: value }
      }
    }));
  };

  const testConnection = async (type: string, ip: string) => {
    const key = `${type}_${ip}`;
    setConnectionStatus(prev => ({ ...prev, [key]: 'testing' }));
    
    // Simular test de conexión
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% éxito
      setConnectionStatus(prev => ({ 
        ...prev, 
        [key]: success ? 'success' : 'error' 
      }));
      
      // Limpiar estado después de 3 segundos
      setTimeout(() => {
        setConnectionStatus(prev => ({ ...prev, [key]: null }));
      }, 3000);
    }, 1500);
  };

  const getConnectionButtonStyle = (status: 'testing' | 'success' | 'error' | null) => {
    switch (status) {
      case 'testing':
        return [styles.connectionButton, styles.connectionButtonTesting];
      case 'success':
        return [styles.connectionButton, styles.connectionButtonSuccess];
      case 'error':
        return [styles.connectionButton, styles.connectionButtonError];
      default:
        return styles.connectionButton;
    }
  };

  const getConnectionButtonText = (status: 'testing' | 'success' | 'error' | null) => {
    switch (status) {
      case 'testing':
        return 'PROBANDO...';
      case 'success':
        return 'CONECTADO';
      case 'error':
        return 'ERROR';
      default:
        return 'CONEXIÓN';
    }
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
          <Text style={styles.headerTitle}>CONFIGURACIÓN DEL SISTEMA</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Configuración de Puertas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONFIGURACIÓN DE PUERTAS</Text>
            
            <View style={styles.doorsGrid}>
              {config.doors.map((door, index) => (
                <View key={index} style={styles.doorCard}>
                  <View style={styles.doorHeader}>
                    <Switch
                      value={door.enabled}
                      onValueChange={(value) => updateDoor(index, 'enabled', value)}
                      trackColor={{ false: '#CED4DA', true: '#28A745' }}
                      thumbColor={door.enabled ? '#FFFFFF' : '#FFFFFF'}
                    />
                    <TextInput
                      style={[styles.doorNameInput, !door.enabled && styles.disabledInput]}
                      value={door.name}
                      onChangeText={(text) => updateDoor(index, 'name', text)}
                      placeholder={`Puerta ${index + 1}`}
                      editable={door.enabled}
                    />
                  </View>
                  
                  {door.enabled && (
                    <View style={styles.doorDetails}>
                      <View style={styles.ipRow}>
                        <Text style={styles.ipLabel}>IP Exterior:</Text>
                        <TextInput
                          style={styles.ipInput}
                          value={door.ipExterior}
                          onChangeText={(text) => updateDoor(index, 'ipExterior', text)}
                          placeholder="192.168.1.x"
                        />
                        <TouchableOpacity
                          style={getConnectionButtonStyle(connectionStatus[`exterior_${door.ipExterior}`])}
                          onPress={() => testConnection('exterior', door.ipExterior)}
                          disabled={connectionStatus[`exterior_${door.ipExterior}`] === 'testing'}
                        >
                          <Wifi size={12} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.ipRow}>
                        <Text style={styles.ipLabel}>IP Interior:</Text>
                        <TextInput
                          style={styles.ipInput}
                          value={door.ipInterior}
                          onChangeText={(text) => updateDoor(index, 'ipInterior', text)}
                          placeholder="192.168.1.x"
                        />
                        <TouchableOpacity
                          style={getConnectionButtonStyle(connectionStatus[`interior_${door.ipInterior}`])}
                          onPress={() => testConnection('interior', door.ipInterior)}
                          disabled={connectionStatus[`interior_${door.ipInterior}`] === 'testing'}
                        >
                          <Wifi size={12} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Sección en dos columnas */}
          <View style={styles.twoColumnSection}>
            {/* Columna Izquierda - Parámetros de Red */}
            <View style={styles.leftColumn}>
              <Text style={styles.sectionTitle}>PARÁMETROS DE RED</Text>
              <View style={styles.networkCard}>
                <View style={styles.networkRow}>
                  <Text style={styles.networkLabel}>IP consola:</Text>
                  <TextInput
                    style={styles.networkInput}
                    value={config.network.consoleIP}
                    onChangeText={(text) => updateNetwork('consoleIP', text)}
                    placeholder="192.168.1.25"
                  />
                </View>
                
                <View style={styles.networkRow}>
                  <Text style={styles.networkLabel}>Máscara:</Text>
                  <TextInput
                    style={styles.networkInput}
                    value={config.network.netmask}
                    onChangeText={(text) => updateNetwork('netmask', text)}
                    placeholder="255.255.255.0"
                  />
                </View>
                
                <View style={styles.networkRow}>
                  <Text style={styles.networkLabel}>Gateway:</Text>
                  <TextInput
                    style={styles.networkInput}
                    value={config.network.gateway}
                    onChangeText={(text) => updateNetwork('gateway', text)}
                    placeholder="192.168.1.1"
                  />
                  <TouchableOpacity
                    style={getConnectionButtonStyle(connectionStatus[`server_${config.network.gateway}`])}
                    onPress={() => testConnection('server', config.network.gateway)}
                    disabled={connectionStatus[`server_${config.network.gateway}`] === 'testing'}
                  >
                    <Wifi size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Columna Derecha - Horarios */}
            <View style={styles.rightColumn}>
              <Text style={styles.sectionTitle}>HORARIOS</Text>
              <View style={styles.scheduleCard}>
                <View style={styles.scheduleHeaderRow}>
                  <Text style={styles.scheduleHeaderLabel}></Text>
                  <Text style={styles.scheduleHeaderTime}>INI 1</Text>
                  <Text style={styles.scheduleHeaderSeparator}></Text>
                  <Text style={styles.scheduleHeaderTime}>INI 2</Text>
                </View>
                {Object.entries(config.schedules).map(([type, schedule]) => (
                  <View key={type} style={styles.scheduleRow}>
                    <Text style={styles.scheduleLabel}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}:
                    </Text>
                    <TextInput
                      style={styles.timeInput}
                      value={schedule.ini1}
                      onChangeText={(text) => updateSchedule(type as keyof typeof config.schedules, 'ini1', text)}
                      placeholder="00:00"
                    />
                    <Text style={styles.timeSeparator}>-</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={schedule.ini2}
                      onChangeText={(text) => updateSchedule(type as keyof typeof config.schedules, 'ini2', text)}
                      placeholder="00:00"
                    />
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Tipo de Oficina */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TIPO DE OFICINA</Text>
            <View style={styles.officeCard}>
              <View style={styles.officeRow}>
                <Text style={styles.officeLabel}>Oficina con cajero en zaguán</Text>
                <Switch
                  value={config.officeWithATM}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, officeWithATM: value }))}
                  trackColor={{ false: '#CED4DA', true: '#28A745' }}
                  thumbColor={config.officeWithATM ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
            </View>
          </View>

          {/* Botones */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <ArrowLeft size={20} color="#FFFFFF" />
              <Text style={styles.backButtonText}>VOLVER</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>GUARDAR</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  doorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  doorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: 240,
    maxWidth: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  doorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  doorNameInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  disabledInput: {
    backgroundColor: '#E9ECEF',
    color: '#6C757D',
  },
  doorDetails: {
    gap: 10,
  },
  ipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
    minWidth: 70,
  },
  ipInput: {
    flex: 1,
    fontSize: 13,
    color: '#212529',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  connectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#495057',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 28,
  },
  connectionButtonTesting: {
    backgroundColor: '#FFC107',
  },
  connectionButtonSuccess: {
    backgroundColor: '#28A745',
  },
  connectionButtonError: {
    backgroundColor: '#DC3545',
  },
  connectionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  twoColumnSection: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },
  networkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  networkLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
    minWidth: 70,
  },
  networkInput: {
    flex: 1,
    fontSize: 13,
    color: '#212529',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  scheduleLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
    minWidth: 80,
  },
  timeInput: {
    fontSize: 13,
    color: '#212529',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    width: 70,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  scheduleHeaderLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
    minWidth: 80,
  },
  scheduleHeaderTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#495057',
    width: 70,
    textAlign: 'center',
  },
  scheduleHeaderSeparator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    width: 14,
  },
  officeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  officeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  officeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C757D',
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
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28A745',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#28A745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});