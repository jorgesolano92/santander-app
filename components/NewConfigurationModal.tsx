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
    onSave(config);
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
                      <Text style={styles.ipLabel}>IP Llamador Exterior:</Text>
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
                        <Wifi size={14} color="#FFFFFF" />
                        <Text style={styles.connectionButtonText}>
                          {getConnectionButtonText(connectionStatus[`exterior_${door.ipExterior}`])}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.ipRow}>
                      <Text style={styles.ipLabel}>IP Llamador Interior:</Text>
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
                        <Wifi size={14} color="#FFFFFF" />
                        <Text style={styles.connectionButtonText}>
                          {getConnectionButtonText(connectionStatus[`interior_${door.ipInterior}`])}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Parámetros de Red */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PARÁMETROS DE RED</Text>
            <View style={styles.networkCard}>
              <View style={styles.networkRow}>
                <Text style={styles.networkLabel}>Dirección IP consola:</Text>
                <TextInput
                  style={styles.networkInput}
                  value={config.network.consoleIP}
                  onChangeText={(text) => updateNetwork('consoleIP', text)}
                  placeholder="192.168.1.25"
                />
              </View>
              
              <View style={styles.networkRow}>
                <Text style={styles.networkLabel}>Máscara de red:</Text>
                <TextInput
                  style={styles.networkInput}
                  value={config.network.netmask}
                  onChangeText={(text) => updateNetwork('netmask', text)}
                  placeholder="255.255.255.0"
                />
              </View>
              
              <View style={styles.networkRow}>
                <Text style={styles.networkLabel}>Puerta de enlace (servidor):</Text>
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
                  <Wifi size={14} color="#FFFFFF" />
                  <Text style={styles.connectionButtonText}>
                    {getConnectionButtonText(connectionStatus[`server_${config.network.gateway}`])}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Horarios */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HORARIOS</Text>
            <View style={styles.scheduleCard}>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 32,
    paddingBottom: 64,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  doorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  doorNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginLeft: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    gap: 12,
  },
  ipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ipLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    minWidth: 140,
  },
  ipInput: {
    flex: 1,
    fontSize: 14,
    color: '#212529',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  connectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#495057',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  networkCard: {
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
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  networkLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    minWidth: 180,
  },
  networkInput: {
    flex: 1,
    fontSize: 14,
    color: '#212529',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  scheduleCard: {
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
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  scheduleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    minWidth: 100,
  },
  timeInput: {
    fontSize: 14,
    color: '#212529',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    width: 80,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  officeCard: {
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
  officeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  officeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#495057',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 16,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C757D',
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
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28A745',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#28A745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});