import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, Switch, Platform, Alert } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, X, Wifi, RefreshCw, Settings } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doorControlService, ApiResponse } from '@/services/DoorControlService';
import ApiResponseDisplayModal from './ApiResponseDisplayModal';
import IntercomConfigurationModal, { IntercomConfig } from './IntercomConfigurationModal';
import { Picker } from '@react-native-picker/picker';
import { emergencyService } from '@/services/EmergencyService';

interface NewConfigurationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (config: ConfigurationData) => void;
  initialSandboxMode: boolean;
  onToggleSandboxMode: (isSandbox: boolean) => void;
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

interface EmergencyConfig {
  enabled: boolean;
  pcb1: number;
  switch1: number;
  pcb2: number;
  switch2: number;
}

interface ModeConfig {
  rule_key: string;
  action: 'set_rule';
  enabled: boolean;
}

interface ModesConfig {
  automatico: ModeConfig;
  esclusa: ModeConfig;
  extendido: ModeConfig;
  autoservicio: ModeConfig;
  oficinaCerrada: ModeConfig;
  cargaCajero: ModeConfig;
  manual: ModeConfig;
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
    urlToken: string; // URL para token (ej: /api/v1/auth/token)
    urlGet: string;   // URL para GET (ej: /api/v1/get_mode)
    urlPost: string;  // URL para POST (ej: /api/v1/set_mode)
    urlModes: string; // URL para listar modos (ej: /api/v1/modes)
  };
  schedules: {
    comercial: ScheduleConfig;
    extendido: ScheduleConfig;
    autoservicio: ScheduleConfig;
    cerrado: ScheduleConfig;
  };
  officeWithATM: boolean;
  emergency: EmergencyConfig;
  modes: ModesConfig;
}

export default function NewConfigurationModal({ 
  visible, 
  onClose, 
  onSave, 
  initialSandboxMode, 
  onToggleSandboxMode 
}: NewConfigurationModalProps) {
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

  const [config, setConfig] = useState<ConfigurationData>({
    doors: [
      {
        enabled: true,
        name: 'Calle (P1)',
        ipExterior: '127.0.0.1',
        ipInterior: '',
        intercom: {
          name: 'Intercomunicador Calle (P1)',
          cameraIP: '192.168.1.120',
          httpPort: 80,
          httpsPort: 443,
          onvifUsername: 'ceroideas',
          onvifPassword: 'Cero21264712-',
          rtspPort: 554,
          videoProfile: 'MainStream',
          snapshotPath: 'ISAPI/Streaming/channels/101/picture',
          sipUri: '',
          sipUsername: '',
          sipPassword: '',
          sipDomain: '',
          enableOnvifEvents: true,
          enableTLS: false,
          preferredResolution: '1920x1080',
          preferredFPS: 25,
          defaultOpenTime: 5,
          doorControlUsername: 'Scati2023',
          doorControlPassword: 'Scati2023',
          doorControlPCB: 1,
          doorControlSwitch: 5,
          rtspPath: 'profile1',
          doorControlManualMode: false, // Pulso automático
          doorControlPulseTime: 1.0,
          hasAudio: true,
        }
      },
      {
        enabled: true,
        name: 'Oficina (P2)',
        ipExterior: '127.0.0.1',
        ipInterior: '',
        intercom: {
          name: 'Intercomunicador Oficina (P2)',
          cameraIP: '192.168.1.130',
          httpPort: 80,
          httpsPort: 443,
          onvifUsername: 'ceroideas',
          onvifPassword: 'Cero21264712-',
          rtspPort: 554,
          videoProfile: 'MainStream',
          snapshotPath: 'axis-cgi/jpg/image.cgi',
          sipUri: '',
          sipUsername: '',
          sipPassword: '',
          sipDomain: '',
          enableOnvifEvents: true,
          enableTLS: false,
          preferredResolution: '1920x1080',
          preferredFPS: 25,
          defaultOpenTime: 5,
          doorControlUsername: 'Scati2023',
          doorControlPassword: 'Scati2023',
          doorControlPCB: 2,
          doorControlSwitch: 10,
          rtspPath: 'axis-media/media.amp?videocodec=h264&audio=1',
          doorControlManualMode: true, // Modo manual
          doorControlPulseTime: 1.0,
          hasAudio: true,
        }
      },
      {
        enabled: false,
        name: 'Puerta 3',
        ipExterior: '127.0.0.1',
        ipInterior: '',
        intercom: {
          name: 'Intercomunicador Puerta 3',
          cameraIP: '192.168.1.120',
          httpPort: 80,
          httpsPort: 443,
          onvifUsername: 'ceroideas',
          onvifPassword: 'Cero21264712-',
          rtspPort: 554,
          videoProfile: 'MainStream',
          snapshotPath: 'cgi-bin/snapshot.cgi?channel=1',
          sipUri: '',
          sipUsername: '',
          sipPassword: '',
          sipDomain: '',
          enableOnvifEvents: true,
          enableTLS: false,
          preferredResolution: '1920x1080',
          preferredFPS: 25,
          defaultOpenTime: 5,
          doorControlUsername: 'Scati2023',
          doorControlPassword: 'Scati2023',
          doorControlPCB: 1,
          doorControlSwitch: 5,
          rtspPath: 'trackID=1',
          hasAudio: false, // Esta cámara NO tiene audio
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
          onvifUsername: 'ceroideas',
          onvifPassword: 'Cero21264712-',
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
          doorControlUsername: 'Scati2023',
          doorControlPassword: 'Scati2023',
          doorControlPCB: 1,
          doorControlSwitch: 4,
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
          onvifUsername: 'ceroideas',
          onvifPassword: 'Cero21264712-',
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
          doorControlUsername: 'Scati2023',
          doorControlPassword: 'Scati2023',
          doorControlPCB: 1,
          doorControlSwitch: 5,
        }
      }
    ],
    network: {
      consoleIP: '127.0.0.1',
      netmask: '255.255.255.0',
      gateway: '0.0.0.0',
    },
    api: {
      port: 8000,
      username: '',
      password: '',
      urlToken: '/api/v1/auth/token',
      urlGet: '/api/v1/get_mode',
      urlPost: '/api/v1/set_mode',
      urlModes: '/api/v1/modes',
    },
    schedules: {
      comercial: { ini1: '08:00', ini2: '14:00' },
      extendido: { ini1: '07:00', ini2: '22:00' },
      autoservicio: { ini1: '00:00', ini2: '23:59' },
      cerrado: { ini1: '22:00', ini2: '08:00' },
    },
    officeWithATM: false,
    emergency: {
      enabled: true,
      pcb1: 2,
      switch1: 1,
      pcb2: 3,
      switch2: 1,
    },
    modes: {
      automatico: { rule_key: 'horario_automatico', action: 'set_rule', enabled: true },
      esclusa: { rule_key: 'horario_esclusa', action: 'set_rule', enabled: true },
      extendido: { rule_key: 'horario_extendido', action: 'set_rule', enabled: true },
      autoservicio: { rule_key: 'horario_autoservicio', action: 'set_rule', enabled: true },
      oficinaCerrada: { rule_key: 'horario_cerrado', action: 'set_rule', enabled: true },
      cargaCajero: { rule_key: 'carga_cajero', action: 'set_rule', enabled: true },
      manual: { rule_key: 'manual', action: 'set_rule', enabled: true },
    },
  });

  const [connectionStatus, setConnectionStatus] = useState<{ [key: string]: 'testing' | 'success' | 'error' | null }>({});
  const [showApiResponseModal, setShowApiResponseModal] = useState(false);
  const [apiResponseData, setApiResponseData] = useState<ApiResponse | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [showIntercomModal, setShowIntercomModal] = useState(false);
  const [selectedDoorIndex, setSelectedDoorIndex] = useState<number>(0);
  const defaultConfigRef = useRef<ConfigurationData | null>(null);

  useEffect(() => {
    if (!defaultConfigRef.current) {
      defaultConfigRef.current = JSON.parse(JSON.stringify(config));
    }
  }, []);

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
        
        // Migrar configuraciones antiguas que no tienen campos SDIO12
        if (parsedConfig.doors) {
          parsedConfig.doors = parsedConfig.doors.map((door: any, index: number) => {
            if (door.intercom) {
              // Remover doorControlIP si existe (campo obsoleto)
              const { doorControlIP, ...intercomRest } = door.intercom;
              return {
                ...door,
                intercom: {
                  ...intercomRest,
                  doorControlUsername: door.intercom.doorControlUsername || 'Scati2023',
                  doorControlPassword: door.intercom.doorControlPassword || 'Scati2023',
                  doorControlPCB: door.intercom.doorControlPCB ?? 1,
                  doorControlSwitch: door.intercom.doorControlSwitch ?? (index + 1),
                }
              };
            }
            return door;
          });
        }
        
        // Cargar configuración de emergencia
        const emergencyConfig = await emergencyService.getEmergencyConfig();
        if (emergencyConfig) {
          parsedConfig.emergency = emergencyConfig;
          console.log('✅ Configuración de emergencia cargada:', emergencyConfig);
        }
        
        // Migrar configuración de modos si no existe
        if (!parsedConfig.modes) {
          parsedConfig.modes = {
            automatico: { rule_key: 'horario_automatico', action: 'set_rule', enabled: true },
            esclusa: { rule_key: 'horario_esclusa', action: 'set_rule', enabled: true },
            extendido: { rule_key: 'horario_extendido', action: 'set_rule', enabled: true },
            autoservicio: { rule_key: 'horario_autoservicio', action: 'set_rule', enabled: true },
            oficinaCerrada: { rule_key: 'horario_cerrado', action: 'set_rule', enabled: true },
            cargaCajero: { rule_key: 'carga_cajero', action: 'set_rule', enabled: true },
            manual: { rule_key: 'manual', action: 'set_rule', enabled: true },
          };
          console.log('✅ Configuración de modos inicializada con valores por defecto');
        }
        // Migrar estructura antigua de modos (pcb/relay) a nueva (rule_key/action).
        for (const [k, v] of Object.entries(parsedConfig.modes || {})) {
          if (v && typeof v === 'object' && !('rule_key' in v)) {
            const defaultRuleKeyMap: Record<string, string> = {
              automatico: 'horario_automatico',
              esclusa: 'horario_esclusa',
              extendido: 'horario_extendido',
              autoservicio: 'horario_autoservicio',
              oficinaCerrada: 'horario_cerrado',
              cargaCajero: 'carga_cajero',
              manual: 'manual',
            };
            parsedConfig.modes[k] = {
              rule_key: defaultRuleKeyMap[k] || k,
              action: 'set_rule',
              enabled: (v as any).enabled !== false,
            };
          } else if (v && typeof v === 'object' && !('action' in v)) {
            parsedConfig.modes[k] = { ...v, action: 'set_rule' };
          }
        }
        
        // Migrar configuración de API si no tiene los nuevos campos
        if (parsedConfig.api) {
          if (!parsedConfig.api.urlToken) {
            parsedConfig.api.urlToken = '/api/v1/auth/token';
          }
          if (!parsedConfig.api.urlGet) {
            parsedConfig.api.urlGet = '/api/v1/get_mode';
          }
          if (!parsedConfig.api.urlPost) {
            parsedConfig.api.urlPost = '/api/v1/set_mode';
          }
          if (!parsedConfig.api.urlModes) {
            parsedConfig.api.urlModes = '/api/v1/modes';
          }
        }
        
        // Solo cargar configuración si no tiene IPs antiguas
        if (!parsedConfig.doors?.[0]?.ipExterior?.includes('192.168.1.26')) {
          setConfig(prev => ({ ...prev, ...parsedConfig }));
          
          // Guardar la configuración migrada
          await AsyncStorage.setItem('new_door_config', JSON.stringify(parsedConfig));
          console.log('✅ Configuración migrada exitosamente');
        }
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
    try {
      await saveConfiguration(config);
      
      // Guardar configuración de emergencia
      console.log('💾 Guardando configuración de emergencia:', config.emergency);
      if (config.emergency) {
        await emergencyService.setEmergencyConfig(config.emergency);
        console.log('✅ Configuración de emergencia guardada exitosamente');
        
        // Verificar que se guardó correctamente
        const savedEmergencyConfig = await emergencyService.getEmergencyConfig();
        console.log('🔍 Verificación - Configuración guardada:', savedEmergencyConfig);
      } else {
        console.log('⚠️ No hay configuración de emergencia para guardar');
      }
      
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
    } catch (error) {
      console.error('❌ Error en handleSave:', error);
    }
  };

  const handleResetConfiguration = () => {
    Alert.alert(
      'Restablecer configuración',
      'Se eliminarán los datos guardados en la tablet y se cargarán los valores por defecto de la app. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('new_door_config');
              await AsyncStorage.removeItem('detailed_door_config');
              if (defaultConfigRef.current) {
                const resetConfig = JSON.parse(JSON.stringify(defaultConfigRef.current));
                setConfig(resetConfig);
                await emergencyService.setEmergencyConfig(resetConfig.emergency);
              }
              console.log('✅ Configuración restablecida a valores por defecto');
            } catch (error) {
              console.error('❌ Error restableciendo configuración:', error);
            }
          },
        },
      ]
    );
  };

  // Función de prueba de API deshabilitada (no usa gettags)
  // const handleTestApiConnection = async () => {
  //   setIsTestingApi(true);
  //   try {
  //     // Configurar temporalmente el servicio con los datos actuales
  //     const tempConfig = {
  //       serverIP: config.network.consoleIP,
  //       apiPort: config.api.port,
  //       apiUsername: config.api.username,
  //       apiPassword: config.api.password,
  //       username: 'admin',
  //       updateServerURL: 'http://192.168.1.200/updates',
  //       deviceId: 'device_id_placeholder',
  //     };
      
  //     await doorControlService.setConfiguration(tempConfig);
      
  //     // Realizar la prueba GET
  //     const response = await doorControlService.getTags(0, 0);
      
  //     if (response) {
  //       setApiResponseData(response);
  //       setShowApiResponseModal(true);
  //       console.log('✅ Prueba API exitosa:', response);
  //     } else {
  //       console.error('❌ No se recibieron datos de la API');
  //       // Aquí podrías mostrar un mensaje de error al usuario
  //     }
  //   } catch (error) {
  //     console.error('❌ Error en prueba API:', error);
  //     // Aquí podrías mostrar un mensaje de error al usuario
  //   } finally {
  //     setIsTestingApi(false);
  //   }
  // };

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
    sandboxModeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      paddingVertical: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      gap: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
    },
    sandboxModeText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 14 : 13,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.5,
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
    // Estilos de emergencia
    emergencyCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      borderWidth: 1,
      borderColor: '#E9ECEF',
    },
    emergencyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    emergencyLabel: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 14 : 13,
      fontWeight: '600',
      color: '#495057',
      flex: 1,
    },
    emergencyConfig: {
      marginTop: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      paddingTop: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      borderTopWidth: 1,
      borderTopColor: '#E9ECEF',
    },
    emergencySubtitle: {
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      fontWeight: '600',
      color: '#6C757D',
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
    },
    emergencyInputs: {
      gap: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
    },
    emergencyInputGroup: {
      backgroundColor: '#F8F9FA',
      borderRadius: 6,
      padding: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
    },
    emergencyInputLabel: {
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 12 : 11,
      fontWeight: '600',
      color: '#495057',
      marginBottom: isSmallTablet ? 4 : isLargeTablet ? 6 : 5,
    },
    emergencyInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
    },
    emergencyInput: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#CED4DA',
      borderRadius: 4,
      paddingHorizontal: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      paddingVertical: isSmallTablet ? 6 : isLargeTablet ? 8 : 7,
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      color: '#495057',
    },
    pickerContainer: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#CED4DA',
      borderRadius: 4,
      overflow: 'hidden',
      minHeight: 40,
    },
    picker: {
      height: 50,
      width: '100%',
      color: '#495057',
      backgroundColor: 'transparent',
    },
    emergencyNote: {
      fontSize: isSmallTablet ? 9 : isLargeTablet ? 11 : 10,
      color: '#DC3545',
      fontStyle: 'italic',
      marginTop: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
    },
    modeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
    },
    modeGridItem: {
      width: isSmallTablet ? '48%' : '32%',
      backgroundColor: '#F8F9FA',
      borderRadius: 8,
      padding: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      borderWidth: 1,
      borderColor: '#E9ECEF',
    },
    modeGridItemLast: {
      alignSelf: 'center',
    },
    modeTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    modeFieldBlock: {
      marginTop: 4,
      marginBottom: 6,
    },
    modeFieldLabel: {
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 12 : 11,
      fontWeight: '600',
      color: '#495057',
      marginBottom: 4,
    },
    modeTextInput: {
      width: '100%',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#CED4DA',
      borderRadius: 4,
      paddingHorizontal: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      paddingVertical: isSmallTablet ? 6 : isLargeTablet ? 8 : 7,
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      color: '#495057',
      minHeight: 36,
    },
    modePickerContainer: {
      width: '100%',
      height: 36,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#CED4DA',
      borderRadius: 4,
      overflow: 'hidden',
      justifyContent: 'center',
    },
    modePicker: {
      width: '100%',
      height: 36,
      color: '#495057',
      backgroundColor: 'transparent',
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
    resetButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#DC3545',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      borderRadius: 8,
      gap: isSmallTablet ? 4 : isLargeTablet ? 8 : 6,
      shadowColor: '#DC3545',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    resetButtonText: {
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
          
          {/* Toggle de sandbox deshabilitado */}
          {/* <View style={styles.sandboxModeContainer}>
            <Settings size={16} color="#FFFFFF" />
            <Text style={styles.sandboxModeText}>MODO SANDBOX</Text>
            <Switch
              value={initialSandboxMode}
              onValueChange={onToggleSandboxMode}
              trackColor={{ false: '#CED4DA', true: '#28A745' }}
              thumbColor={initialSandboxMode ? '#FFFFFF' : '#FFFFFF'}
            />
          </View> */}
          
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
                    <>
                      <View style={styles.doorDetails}>
                        <View style={styles.ipRow}>
                          <Text style={styles.ipLabel}>IP Exterior:</Text>
                          <TextInput
                            style={styles.ipInput}
                            value={door.ipExterior}
                            onChangeText={(text) => updateDoor(index, 'ipExterior', text)}
                            placeholder="0.0.0.0"
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
                            placeholder="0.0.0.0"
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
                    </>
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
                    placeholder="127.0.0.1"
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
                    placeholder="username"
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.networkRow}>
                  <Text style={styles.networkLabel}>Contraseña:</Text>
                  <TextInput
                    style={styles.networkInput}
                    value={config.api.password}
                    onChangeText={(text) => updateApi('password', text)}
                    placeholder="••••••••"
                    autoCapitalize="none"
                    secureTextEntry={true}
                  />
                </View>
                
                <View style={styles.networkRow}>
                  <Text style={styles.networkLabel}>URL TOKEN:</Text>
                  <TextInput
                    style={styles.networkInput}
                    value={config.api.urlToken}
                    onChangeText={(text) => updateApi('urlToken', text)}
                    placeholder="/api/v1/auth/token"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.networkRow}>
                  <Text style={styles.networkLabel}>URL GET:</Text>
                  <TextInput
                    style={styles.networkInput}
                    value={config.api.urlGet}
                    onChangeText={(text) => updateApi('urlGet', text)}
                    placeholder="/api/v1/get_mode"
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.networkRow}>
                  <Text style={styles.networkLabel}>URL POST:</Text>
                  <TextInput
                    style={styles.networkInput}
                    value={config.api.urlPost}
                    onChangeText={(text) => updateApi('urlPost', text)}
                    placeholder="/api/v1/set_mode"
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.networkRow}>
                  <Text style={styles.networkLabel}>URL MODES:</Text>
                  <TextInput
                    style={styles.networkInput}
                    value={config.api.urlModes}
                    onChangeText={(text) => updateApi('urlModes', text)}
                    placeholder="/api/v1/modes"
                    autoCapitalize="none"
                  />
                </View>
                
                {/* Botón de prueba de API deshabilitado */}
                {/* <TouchableOpacity 
                  style={[styles.testApiButton, isTestingApi && styles.testApiButtonDisabled]}
                  onPress={handleTestApiConnection}
                  disabled={isTestingApi}
                >
                  <RefreshCw size={16} color="#FFFFFF" />
                  <Text style={styles.testApiButtonText}>
                    {isTestingApi ? 'PROBANDO...' : 'PROBAR CONEXIÓN API'}
                  </Text>
                </TouchableOpacity> */}
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

          {/* SECCIÓN DE CONFIGURACIÓN DE MODOS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONFIGURACIÓN DE MODOS DE OPERACIÓN</Text>
            <View style={styles.emergencyCard}>
              <Text style={styles.emergencySubtitle}>
                Configure cada modo con su <Text style={{ fontWeight: '700' }}>rule_key</Text> del backend y la acción a ejecutar.
              </Text>
              
              <View style={styles.modeGrid}>
                {Object.entries({
                  automatico: 'AUTOMÁTICO',
                  esclusa: 'ESCLUSA',
                  extendido: 'EXTENDIDO',
                  autoservicio: 'AUTOSERVICIO',
                  oficinaCerrada: 'OFICINA CERRADA',
                  cargaCajero: 'CARGA DE CAJERO',
                  manual: 'MANUAL',
                }).map(([key, label], idx, arr) => (
                  <View
                    key={key}
                    style={[
                      styles.modeGridItem,
                      idx === arr.length - 1 ? styles.modeGridItemLast : null,
                    ]}
                  >
                    <View style={styles.modeTitleRow}>
                      <Text style={styles.emergencyInputLabel}>{label}</Text>
                      <Switch
                        value={config.modes[key as keyof ModesConfig].enabled}
                        onValueChange={(value) => setConfig(prev => ({
                          ...prev,
                          modes: {
                            ...prev.modes,
                            [key]: { ...prev.modes[key as keyof ModesConfig], enabled: value }
                          }
                        }))}
                        trackColor={{ false: '#CED4DA', true: '#28A745' }}
                        thumbColor={config.modes[key as keyof ModesConfig].enabled ? '#FFFFFF' : '#FFFFFF'}
                      />
                    </View>
                    {config.modes[key as keyof ModesConfig].enabled && (
                      <View style={styles.modeFieldBlock}>
                        <Text style={styles.modeFieldLabel}>rule_key:</Text>
                        <TextInput
                          style={styles.modeTextInput}
                          value={config.modes[key as keyof ModesConfig].rule_key}
                          onChangeText={(value) =>
                            setConfig(prev => ({
                              ...prev,
                              modes: {
                                ...prev.modes,
                                [key]: { ...prev.modes[key as keyof ModesConfig], rule_key: value }
                              }
                            }))
                          }
                          placeholder="ej: horario_automatico"
                          autoCapitalize="none"
                        />
                      </View>
                    )}
                    {config.modes[key as keyof ModesConfig].enabled && (
                      <View style={styles.modeFieldBlock}>
                        <Text style={styles.modeFieldLabel}>action:</Text>
                        <View style={styles.modePickerContainer}>
                          <Picker
                            selectedValue={config.modes[key as keyof ModesConfig].action}
                            onValueChange={(value) => setConfig(prev => ({
                              ...prev,
                              modes: {
                                ...prev.modes,
                                [key]: { ...prev.modes[key as keyof ModesConfig], action: value }
                              }
                            }))}
                            style={styles.modePicker}
                            mode="dropdown"
                            dropdownIconColor="#495057"
                          >
                            <Picker.Item label="set_rule" value="set_rule" />
                          </Picker>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
              
              <Text style={styles.emergencyNote}>
                ⚠️ `set_mode` enviará: {"{"}"action":"set_rule","rule_key":"...","active":true{"}"}.
              </Text>
            </View>
          </View>

          {/* SECCIÓN DE EMERGENCIA */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONFIGURACIÓN DE EMERGENCIA</Text>
            <View style={styles.emergencyCard}>
              <View style={styles.emergencyRow}>
                <Text style={styles.emergencyLabel}>Habilitar sistema de emergencia</Text>
                <Switch
                  value={config.emergency.enabled}
                  onValueChange={(value) => setConfig(prev => ({ 
                    ...prev, 
                    emergency: { ...prev.emergency, enabled: value }
                  }))}
                  trackColor={{ false: '#CED4DA', true: '#DC3545' }}
                  thumbColor={config.emergency.enabled ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
              
              {config.emergency.enabled && (
                <View style={styles.emergencyConfig}>
                  <Text style={styles.emergencySubtitle}>Configuración de salidas de emergencia</Text>
                  
                  <View style={styles.emergencyInputs}>
                    <View style={styles.emergencyInputGroup}>
                      <Text style={styles.emergencyInputLabel}>Placa 1</Text>
                      <View style={styles.emergencyInputRow}>
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={config.emergency.pcb1}
                            onValueChange={(value) => setConfig(prev => ({
                              ...prev,
                              emergency: { ...prev.emergency, pcb1: value }
                            }))}
                            style={styles.picker}
                            mode="dropdown"
                            dropdownIconColor="#495057"
                          >
                            <Picker.Item label="PCB 1" value={1} />
                            <Picker.Item label="PCB 2" value={2} />
                            <Picker.Item label="PCB 3" value={3} />
                          </Picker>
                        </View>
                        <Text style={styles.emergencyInputLabel}>Switch</Text>
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={config.emergency.switch1}
                            onValueChange={(value) => setConfig(prev => ({
                              ...prev,
                              emergency: { ...prev.emergency, switch1: value }
                            }))}
                            style={styles.picker}
                            mode="dropdown"
                            dropdownIconColor="#495057"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                              <Picker.Item key={num} label={`Switch ${num}`} value={num} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.emergencyInputGroup}>
                      <Text style={styles.emergencyInputLabel}>Placa 2</Text>
                      <View style={styles.emergencyInputRow}>
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={config.emergency.pcb2}
                            onValueChange={(value) => setConfig(prev => ({
                              ...prev,
                              emergency: { ...prev.emergency, pcb2: value }
                            }))}
                            style={styles.picker}
                            mode="dropdown"
                            dropdownIconColor="#495057"
                          >
                            <Picker.Item label="PCB 1" value={1} />
                            <Picker.Item label="PCB 2" value={2} />
                            <Picker.Item label="PCB 3" value={3} />
                          </Picker>
                        </View>
                        <Text style={styles.emergencyInputLabel}>Switch</Text>
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={config.emergency.switch2}
                            onValueChange={(value) => setConfig(prev => ({
                              ...prev,
                              emergency: { ...prev.emergency, switch2: value }
                            }))}
                            style={styles.picker}
                            mode="dropdown"
                            dropdownIconColor="#495057"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                              <Picker.Item key={num} label={`Switch ${num}`} value={num} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                    </View>
                  </View>
                  
                  <Text style={styles.emergencyNote}>
                    ⚠️ Al activar emergencia se enviará comando permanente a las salidas configuradas
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Botones */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <ArrowLeft size={20} color="#FFFFFF" />
              <Text style={styles.backButtonText}>VOLVER</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetButton} onPress={handleResetConfiguration}>
              <RefreshCw size={20} color="#FFFFFF" />
              <Text style={styles.resetButtonText}>RESET</Text>
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