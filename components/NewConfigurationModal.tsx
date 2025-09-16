import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, X, Wifi, RefreshCw } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doorControlService, ApiResponse } from '@/services/DoorControlService';
import ApiResponseDisplayModal from './ApiResponseDisplayModal';
import IntercomConfigurationModal, { IntercomConfig } from './IntercomConfigurationModal';

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
  intercom: IntercomConfig;
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
  api: {
    port: number;
    username: string;
    password: string;
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
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

  const [config, setConfig] = useState<ConfigurationData>({
    doors: [
      { 
        enabled: true, 
        name: 'Calle (P1)', 
        ipExterior: '192.168.1.26', 
        ipInterior: '192.168.1.27',
        intercom: {
          name: 'Intercomunicador Calle (P1)',
          cameraIP: '',
          httpPort: 80,
          httpsPort: 443,
          onvifUsername: 'admin',
          onvifPassword: '',
          rtspPort: 554,
          videoProfile: 'MainStream',
          sipUri: '',
          sipUsername: '',
          sipPassword: '',
          sipDomain: '',
          enableOnvifEvents: true,
          enableTLS: false,
          preferredResolution: '1920x1080',
          preferredFPS: 25,
          defaultOpenTime: 5,
        }
      },
      { 
        enabled: true, 
        name: 'Oficina (P2)', 
        ipExterior: '192.168.1.28', 
        ipInterior: '192.168.1.29',
        intercom: {
          name: 'Intercomunicador Oficina (P2)',
          cameraIP: '',
          httpPort: 80,
          httpsPort: 443,
          onvifUsername: 'admin',
          onvifPassword: '',
          rtspPort: 554,
          videoProfile: 'MainStream',
          sipUri: '',
          sipUsername: '',
          sipPassword: '',
          sipDomain: '',
          enableOnvifEvents: true,
          enableTLS: false,
          preferredResolution: '1920x1080',
          preferredFPS: 25,
          defaultOpenTime: 5,
        }
      },
      { 
        enabled: false, 
        name: 'Puerta 3', 
        ipExterior: '', 
        ipInterior: '',
        intercom: {
          name: 'Intercomunicador Puerta 3',
          cameraIP: '',
          httpPort: 80,
          httpsPort: 443,
          onvifUsername: 'admin',
          onvifPassword: '',
          rtspPort: 554,
          videoProfile: 'MainStream',
          sipUri: '',
          sipUsername: '',
          sipPassword: '',
          sipDomain: '',
          enableOnvifEvents: true,
          enableTLS: false,
          preferredResolution: '1920x1080',
          preferredFPS: 25,
          defaultOpenTime: 5,
        }
      },
      { 
        enabled: false, 
        name: 'Puerta 4', 
        ipExterior: '', 
        ipInterior: '',
        intercom: {
          name: 'Intercomunicador Puerta 4',
          cameraIP: '',
          httpPort: 80,
          httpsPort: 443,
          onvifUsername: 'admin',
          onvifPassword: '',
          rtspPort: 554,
          videoProfile: 'MainStream',
          sipUri: '',
          sipUsername: '',
          sipPassword: '',
          sipDomain: '',
          enableOnvifEvents: true,
          enableTLS: false,
          preferredResolution: '1920x1080',
          preferredFPS: 25,
          defaultOpenTime: 5,
        }
      },
      { 
        enabled: false, 
        name: 'Puerta 5', 
        ipExterior: '', 
        ipInterior: '',
        intercom: {
          name: 'Intercomunicador Puerta 5',
          cameraIP: '',
          httpPort: 80,
          httpsPort: 443,
          onvifUsername: 'admin',
          onvifPassword: '',
          rtspPort: 554,
          videoProfile: 'MainStream',
          sipUri: '',
          sipUsername: '',
          sipPassword: '',
          sipDomain: '',
          enableOnvifEvents: true,
          enableTLS: false,
          preferredResolution: '1920x1080',
          preferredFPS: 25,
          defaultOpenTime: 5,
        }
      },
    ],
    network: {
      consoleIP: '192.168.1.25',
      netmask: '255.255.255.0',
      gateway: '192.168.1.1',
    },
    api: {
      port: 443,
      username: 'Scati2023',
      password: 'Scati2023',
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
  const [showApiResponseModal, setShowApiResponseModal] = useState(false);
  const [apiResponseData, setApiResponseData] = useState<ApiResponse | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [showIntercomModal, setShowIntercomModal] = useState(false);
  const [selectedDoorIndex, setSelectedDoorIndex] = useState<number>(0);

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
      serverIP: config.network.consoleIP,
      apiPort: config.api.port,
      apiUsername: config.api.username,
      apiPassword: config.api.password,
      updateServerURL: 'http://192.168.1.200/updates',
      deviceId: 'device_id_placeholder',
      ...config // Spread de toda la configuración
    };
    
    onSave(configForParent);
    onClose(); // Cerrar el modal después de guardar
    console.log('📋 Nueva configuración completa guardada:', config);
  };

  const handleTestApiConnection = async () => {
    setIsTestingApi(true);
    try {
      // Configurar temporalmente el servicio con los datos actuales
      const tempConfig = {
        serverIP: config.network.consoleIP,
        apiPort: config.api.port,
        apiUsername: config.api.username,
        apiPassword: config.api.password,
        username: 'admin',
        updateServerURL: 'http://192.168.1.200/updates',
        deviceId: 'device_id_placeholder',
      };
      
      await doorControlService.setConfiguration(tempConfig);
      
      // Realizar la prueba GET
      const response = await doorControlService.getTags(0, 0);
      
      if (response) {
        setApiResponseData(response);
        setShowApiResponseModal(true);
        console.log('✅ Prueba API exitosa:', response);
      } else {
        console.error('❌ No se recibieron datos de la API');
        // Aquí podrías mostrar un mensaje de error al usuario
      }
    } catch (error) {
      console.error('❌ Error en prueba API:', error);
      // Aquí podrías mostrar un mensaje de error al usuario
    } finally {
      setIsTestingApi(false);
    }
  };

  const updateDoor = (index: number, field: keyof DoorConfig, value: any) => {
    const newDoors = [...config.doors];
    newDoors[index] = { ...newDoors[index], [field]: value };
    setConfig(prev => ({ ...prev, doors: newDoors }));
  };

  const updateDoorIntercom = (index: number, intercomConfig: IntercomConfig) => {
    const newDoors = [...config.doors];
    newDoors[index] = { ...newDoors[index], intercom: intercomConfig };
    setConfig(prev => ({ ...prev, doors: newDoors }));
  };

  const handleIntercomConfig = (index: number) => {
    setSelectedDoorIndex(index);
    setShowIntercomModal(true);
  };

  const handleIntercomSave = (intercomConfig: IntercomConfig) => {
    updateDoorIntercom(selectedDoorIndex, intercomConfig);
    setShowIntercomModal(false);
  };

  const updateNetwork = (field: keyof typeof config.network, value: string) => {
    setConfig(prev => ({
      ...prev,
      network: { ...prev.network, [field]: value }
    }));
  };

  const updateApi = (field: keyof typeof config.api, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      api: { ...prev.api, [field]: value }
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
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    headerTitle: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
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
      padding: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingBottom: 40,
    },
    section: {
      marginBottom: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
    },
    sectionTitle: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      fontWeight: '700',
      color: '#212529',
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      letterSpacing: 0.5,
    },
    doorsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isSmallTablet ? 8 : isLargeTablet ? 16 : 12,
    },
    doorCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      flex: 1,
      minWidth: isSmallTablet ? 200 : isLargeTablet ? 280 : 240,
      maxWidth: isSmallTablet ? '48%' : isLargeTablet ? '45%' : '46%',
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
      justifyContent: 'space-between',
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
    },
    doorNameInput: {
      flex: 1,
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 14 : 13,
      fontWeight: '600',
      color: '#212529',
      backgroundColor: 'transparent',
      borderBottomWidth: 1,
      borderBottomColor: '#CED4DA',
      paddingVertical: isSmallTablet ? 4 : isLargeTablet ? 6 : 5,
      marginLeft: 8,
    },
    disabledInput: {
      color: '#6C757D',
      borderBottomColor: '#E9ECEF',
    },
    doorDetails: {
      gap: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
    },
    ipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
    },
    ipLabel: {
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 12 : 11,
      fontWeight: '600',
      color: '#495057',
      minWidth: isSmallTablet ? 60 : isLargeTablet ? 80 : 70,
    },
    ipInput: {
      flex: 1,
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 12 : 11,
      color: '#212529',
      backgroundColor: '#F8F9FA',
      borderWidth: 1,
      borderColor: '#CED4DA',
      borderRadius: 4,
      paddingHorizontal: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
      paddingVertical: isSmallTablet ? 4 : isLargeTablet ? 6 : 5,
      fontFamily: 'monospace',
    },
    connectionButton: {
      backgroundColor: '#6C757D',
      paddingHorizontal: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
      paddingVertical: isSmallTablet ? 4 : isLargeTablet ? 6 : 5,
      borderRadius: 4,
      minWidth: isSmallTablet ? 24 : isLargeTablet ? 32 : 28,
      alignItems: 'center',
      justifyContent: 'center',
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
    twoColumnSection: {
      flexDirection: 'row',
      gap: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      marginBottom: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
    },
    leftColumn: {
      flex: 1,
    },
    rightColumn: {
      flex: 1,
    },
    networkCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
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
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      gap: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
    },
    networkLabel: {
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      fontWeight: '600',
      color: '#495057',
      minWidth: isSmallTablet ? 70 : isLargeTablet ? 90 : 80,
    },
    networkInput: {
      flex: 1,
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      color: '#212529',
      backgroundColor: '#F8F9FA',
      borderWidth: 1,
      borderColor: '#CED4DA',
      borderRadius: 4,
      paddingHorizontal: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      paddingVertical: isSmallTablet ? 6 : isLargeTablet ? 8 : 7,
      fontFamily: 'monospace',
    },
    scheduleCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: '#E9ECEF',
    },
    scheduleHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
      paddingBottom: isSmallTablet ? 4 : isLargeTablet ? 6 : 5,
      borderBottomWidth: 1,
      borderBottomColor: '#E9ECEF',
    },
    scheduleHeaderLabel: {
      flex: 1,
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 12 : 11,
      fontWeight: '700',
      color: '#495057',
    },
    scheduleHeaderTime: {
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 12 : 11,
      fontWeight: '700',
      color: '#495057',
      width: isSmallTablet ? 50 : isLargeTablet ? 70 : 60,
      textAlign: 'center',
    },
    scheduleHeaderSeparator: {
      width: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
    },
    scheduleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
      gap: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
    },
    scheduleLabel: {
      flex: 1,
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      fontWeight: '600',
      color: '#495057',
    },
    timeInput: {
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      color: '#212529',
      backgroundColor: '#F8F9FA',
      borderWidth: 1,
      borderColor: '#CED4DA',
      borderRadius: 4,
      paddingHorizontal: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
      paddingVertical: isSmallTablet ? 4 : isLargeTablet ? 6 : 5,
      width: isSmallTablet ? 50 : isLargeTablet ? 70 : 60,
      textAlign: 'center',
      fontFamily: 'monospace',
    },
    timeSeparator: {
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      fontWeight: '600',
      color: '#495057',
      width: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      textAlign: 'center',
    },
    officeCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
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
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 14 : 13,
      fontWeight: '600',
      color: '#495057',
      flex: 1,
    },
    bottomButtons: {
      flexDirection: 'row',
      gap: isSmallTablet ? 8 : isLargeTablet ? 16 : 12,
      marginTop: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
    },
    backButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#6C757D',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      borderRadius: 8,
      gap: isSmallTablet ? 4 : isLargeTablet ? 8 : 6,
      shadowColor: '#6C757D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    backButtonText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 14 : 13,
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
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      borderRadius: 8,
      gap: isSmallTablet ? 4 : isLargeTablet ? 8 : 6,
      shadowColor: '#28A745',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    saveButtonText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 14 : 13,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    testApiButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#17A2B8',
      paddingHorizontal: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      paddingVertical: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      borderRadius: 6,
      gap: isSmallTablet ? 4 : isLargeTablet ? 8 : 6,
      marginTop: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      shadowColor: '#17A2B8',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    testApiButtonDisabled: {
      opacity: 0.6,
    },
    testApiButtonText: {
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 12 : 11,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    intercomConfigButton: {
      backgroundColor: '#17A2B8',
      paddingHorizontal: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      paddingVertical: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
      borderRadius: 6,
      marginTop: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
      shadowColor: '#17A2B8',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    intercomConfigButtonText: {
      fontSize: isSmallTablet ? 9 : isLargeTablet ? 11 : 10,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.5,
      textAlign: 'center',
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
          <Text style={styles.headerTitle}>CONFIGURACIÓN DEL SISTEMA</Text>
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
                    
                    <TouchableOpacity
                      style={styles.intercomConfigButton}
                      onPress={() => handleIntercomConfig(index)}
                    >
                      <Text style={styles.intercomConfigButtonText}>CONFIGURAR INTERCOMUNICADOR</Text>
                    </TouchableOpacity>
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
              
              {/* Configuración API */}
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>CONFIGURACIÓN API</Text>
              <View style={styles.networkCard}>
                <View style={styles.networkRow}>
                  <Text style={styles.networkLabel}>Puerto:</Text>
                  <TextInput
                    style={styles.networkInput}
                    value={config.api.port.toString()}
                    onChangeText={(text) => updateApi('port', parseInt(text) || 443)}
                    placeholder="443"
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.networkRow}>
                  <Text style={styles.networkLabel}>Usuario:</Text>
                  <TextInput
                    style={styles.networkInput}
                    value={config.api.username}
                    onChangeText={(text) => updateApi('username', text)}
                    placeholder="Scati2023"
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.networkRow}>
                  <Text style={styles.networkLabel}>Contraseña:</Text>
                  <TextInput
                    style={styles.networkInput}
                    value={config.api.password}
                    onChangeText={(text) => updateApi('password', text)}
                    placeholder="Scati2023"
                    autoCapitalize="none"
                    secureTextEntry={true}
                  />
                </View>
                
                <TouchableOpacity 
                  style={[styles.testApiButton, isTestingApi && styles.testApiButtonDisabled]}
                  onPress={handleTestApiConnection}
                  disabled={isTestingApi}
                >
                  <RefreshCw size={16} color="#FFFFFF" />
                  <Text style={styles.testApiButtonText}>
                    {isTestingApi ? 'PROBANDO...' : 'PROBAR CONEXIÓN API'}
                  </Text>
                </TouchableOpacity>
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
        
        <ApiResponseDisplayModal
          visible={showApiResponseModal}
          onClose={() => setShowApiResponseModal(false)}
          data={apiResponseData}
        />
        
        <IntercomConfigurationModal
          visible={showIntercomModal}
          onClose={() => setShowIntercomModal(false)}
          onSave={handleIntercomSave}
          doorName={config.doors[selectedDoorIndex]?.name || ''}
          initialConfig={config.doors[selectedDoorIndex]?.intercom}
        />
      </View>
    </Modal>
  );
}