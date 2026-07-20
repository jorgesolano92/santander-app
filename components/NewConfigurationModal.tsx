import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, Switch, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Save, X, RefreshCw, Settings } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doorControlService, ApiResponse } from '@/services/DoorControlService';
import ApiResponseDisplayModal from './ApiResponseDisplayModal';
import IntercomConfigurationModal, { IntercomConfig } from './IntercomConfigurationModal';
import ActionSelector from './ActionSelector';
import ConfirmDialogModal from './ConfirmDialogModal';
import { emergencyService } from '@/services/EmergencyService';
import { fireService } from '@/services/FireService';
import {
  markLocalConfigOverrides,
  restorePanelDefaultsOnDevice,
} from '@/services/tabletPanelConfigService';
import { cloneDefaultDoorAppConfig } from '@/config/defaultDoorAppConfig';
import { INTERCOM_BRIDGE_ONLY } from '@/config/intercomFeatures';
import { showOperationError, showOperationInfo } from '@/utils/showOperationError';
import type { ConfigurationData, ModeConfig, ModesConfig } from '@/types/configurationData';

type ConfigConfirmAction = 'reset_app' | 'panel_defaults';

export type { ConfigurationData, ModeConfig, DoorConfig, ModesConfig } from '@/types/configurationData';

interface NewConfigurationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (config: ConfigurationData) => void;
  initialSandboxMode: boolean;
  onToggleSandboxMode: (isSandbox: boolean) => void;
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

  const [config, setConfig] = useState<ConfigurationData>(cloneDefaultDoorAppConfig);

  const [showApiResponseModal, setShowApiResponseModal] = useState(false);
  const [apiResponseData, setApiResponseData] = useState<ApiResponse | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [showIntercomModal, setShowIntercomModal] = useState(false);
  const [selectedDoorIndex, setSelectedDoorIndex] = useState<number>(0);
  const [confirmAction, setConfirmAction] = useState<ConfigConfirmAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const defaultConfigRef = useRef<ConfigurationData>(cloneDefaultDoorAppConfig());

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
                  doorControlAction: door.intercom.doorControlAction || 'set_output',
                  doorControlRuleKey: door.intercom.doorControlRuleKey || '',
                  doorControlEndpoint: door.intercom.doorControlEndpoint ?? '',
                  doorOutputMode: door.intercom.doorOutputMode || 'auto',
                  doorControlPulseTime:
                    typeof door.intercom.doorControlPulseTime === 'number'
                      ? door.intercom.doorControlPulseTime
                      : 1.0,
                  sdkPort:
                    door.intercom.sdkPort === 6036 || door.intercom.sdkPort == null
                      ? 9008
                      : door.intercom.sdkPort,
                  sdkUsername: door.intercom.sdkUsername ?? 'admin',
                  sdkPassword: door.intercom.sdkPassword ?? '',
                  voiceChannel: door.intercom.voiceChannel ?? -1,
                  intercomMode: INTERCOM_BRIDGE_ONLY ? 'bridge' : (door.intercom.intercomMode ?? 'bridge'),
                  bridgeUrl: door.intercom.bridgeUrl ?? 'ws://192.168.1.10:8765',
                  sipServer: door.intercom.sipServer ?? '',
                  sipCallDestination: door.intercom.sipCallDestination ?? '',
                  csipApiHost: door.intercom.csipApiHost ?? '',
                  csipApiUseHttps: door.intercom.csipApiUseHttps ?? false,
                  csipApiKey: door.intercom.csipApiKey ?? '',
                  csipBearerToken: door.intercom.csipBearerToken ?? '',
                  csipCallTargetType: door.intercom.csipCallTargetType ?? 'default',
                  csipCallTarget: door.intercom.csipCallTarget ?? '',
                  csipCallUser: door.intercom.csipCallUser ?? '',
                  csipCallRecording: door.intercom.csipCallRecording ?? false,
                  csipButtonId:
                    door.intercom.csipButtonId ?? (index === 1 ? 'p2' : 'p1'),
                }
              };
            }
            return door;
          });
        }
        
        const emergencyConfig = await emergencyService.getEmergencyConfig();
        parsedConfig.emergency = {
          enabled: true,
          rule_key: '',
          action: 'set_rule',
          output_code: '',
          output_on: true,
          ...parsedConfig.emergency,
          ...(emergencyConfig ? emergencyConfig : {}),
        };
        const leg = parsedConfig.emergency as Record<string, unknown>;
        delete leg.source;
        delete leg.pcb1;
        delete leg.switch1;
        delete leg.pcb2;
        delete leg.switch2;
        if (!parsedConfig.emergency.action) {
          parsedConfig.emergency.action = 'set_rule';
        }
        console.log('✅ Emergencia tras migración:', parsedConfig.emergency);

        const configDefaults = cloneDefaultDoorAppConfig();
        if (!parsedConfig.fireSignal) {
          parsedConfig.fireSignal = { ...configDefaults.fireSignal };
        }
        if (parsedConfig.emergency?.rule_key === 'senal_de_incendio_activada') {
          parsedConfig.fireSignal = {
            ...configDefaults.fireSignal,
            ...parsedConfig.fireSignal,
            enabled: parsedConfig.emergency.enabled !== false,
            rule_key: 'senal_de_incendio_activada',
            action: parsedConfig.emergency.action || 'set_rule',
            output_code: parsedConfig.emergency.output_code || '',
            output_on: parsedConfig.emergency.output_on !== false,
          };
          parsedConfig.emergency.rule_key = configDefaults.emergency.rule_key;
          console.log('✅ Migrada rule_key de incendio desde emergencia a fireSignal');
        }
        const fireConfig = await fireService.getFireConfig();
        parsedConfig.fireSignal = {
          ...configDefaults.fireSignal,
          ...parsedConfig.fireSignal,
          ...(fireConfig ? fireConfig : {}),
        };
        if (!parsedConfig.fireSignal.action) {
          parsedConfig.fireSignal.action = 'set_rule';
        }
        console.log('✅ Incendio tras migración:', parsedConfig.fireSignal);
        
        // Migrar configuración de modos si no existe
        if (!parsedConfig.modes) {
          const def = { action: 'set_rule' as const, enabled: true, output_code: '', output_on: true };
          parsedConfig.modes = {
            automatico: { ...def, rule_key: 'horario_automatico' },
            esclusa: { ...def, rule_key: 'horario_esclusa' },
            extendido: { ...def, rule_key: 'horario_extendido' },
            autoservicio: { ...def, rule_key: 'horario_autoservicio' },
            oficinaCerrada: { ...def, rule_key: 'horario_cerrado' },
            cargaCajero: { ...def, rule_key: 'horario_carga_cajero' },
            manual: { ...def, rule_key: 'horario_manual' },
            incendio: { ...def, rule_key: 'senal_de_incendio_activada' },
          };
          console.log('✅ Configuración de modos inicializada con valores por defecto');
        }
        if (!parsedConfig.modes.incendio) {
          const def = { action: 'set_rule' as const, enabled: true, output_code: '', output_on: true };
          parsedConfig.modes.incendio = {
            ...def,
            ...(parsedConfig.fireSignal || {}),
            rule_key:
              parsedConfig.fireSignal?.rule_key ||
              parsedConfig.modes.incendio?.rule_key ||
              'senal_de_incendio_activada',
          };
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
              cargaCajero: 'horario_carga_cajero',
              manual: 'horario_manual',
              incendio: 'senal_de_incendio_activada',
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
        for (const k of Object.keys(parsedConfig.modes || {})) {
          const v = parsedConfig.modes[k];
          if (!v || typeof v !== 'object') continue;
          parsedConfig.modes[k] = {
            ...v,
            output_code: typeof (v as ModeConfig).output_code === 'string' ? (v as ModeConfig).output_code : '',
            output_on: (v as ModeConfig).output_on !== false,
          };
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
      } else {
        const defaults = cloneDefaultDoorAppConfig();
        setConfig(defaults);
        await AsyncStorage.setItem('new_door_config', JSON.stringify(defaults));
        await emergencyService.setEmergencyConfig(defaults.emergency);
        await fireService.setFireConfig(defaults.fireSignal);
        console.log('✅ Configuración por defecto aplicada (primera instalación)');
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
      await markLocalConfigOverrides();
      
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

      if (config.modes?.incendio) {
        const fireFromMode = {
          enabled: config.modes.incendio.enabled,
          rule_key: config.modes.incendio.rule_key,
          action: config.modes.incendio.action,
          output_code: config.modes.incendio.output_code || '',
          output_on: config.modes.incendio.output_on !== false,
        };
        await fireService.setFireConfig(fireFromMode);
        console.log('✅ Configuración de incendio guardada exitosamente');
      } else if (config.fireSignal) {
        await fireService.setFireConfig(config.fireSignal);
        console.log('✅ Configuración de incendio guardada exitosamente');
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
    setConfirmAction('reset_app');
  };

  const handleRestorePanelDefaults = () => {
    setConfirmAction('panel_defaults');
  };

  const runConfirmedConfigAction = async () => {
    if (!confirmAction || confirmBusy) return;
    setConfirmBusy(true);
    try {
      if (confirmAction === 'reset_app') {
        await AsyncStorage.removeItem('new_door_config');
        await AsyncStorage.removeItem('detailed_door_config');
        const resetConfig = cloneDefaultDoorAppConfig();
        defaultConfigRef.current = resetConfig;
        setConfig(resetConfig);
        await AsyncStorage.setItem('new_door_config', JSON.stringify(resetConfig));
        await emergencyService.setEmergencyConfig(resetConfig.emergency);
        await fireService.setFireConfig(resetConfig.fireSignal);
        await markLocalConfigOverrides();
        onSave(resetConfig);
        showOperationInfo(
          'Configuración restablecida',
          'Se cargaron los valores de fábrica embebidos en la app.',
        );
      } else {
        const restored = await restorePanelDefaultsOnDevice();
        if (!restored) {
          showOperationError(
            'Error al importar',
            'No se pudo obtener la configuración del panel. Comprueba red, IP de consola y credenciales API.',
          );
          return;
        }
        setConfig(restored);
        defaultConfigRef.current = restored;
        await emergencyService.setEmergencyConfig(restored.emergency);
        await fireService.setFireConfig(restored.fireSignal);
        onSave(restored);
        showOperationInfo(
          'Datos del panel importados',
          'La configuración por defecto de la sucursal se aplicó en esta tablet.',
        );
      }
    } catch (error) {
      console.error('❌ Error en acción de configuración:', error);
      showOperationError(
        'Error',
        confirmAction === 'reset_app'
          ? 'No se pudo restablecer la configuración local.'
          : 'No se pudo restaurar la configuración del panel.',
      );
    } finally {
      setConfirmBusy(false);
      setConfirmAction(null);
    }
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
      flex: 1,
      flexShrink: 1,
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.5,
      marginRight: 8,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    headerIconButton: {
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
    actionToggleRow: {
      flexDirection: 'row',
      gap: isSmallTablet ? 4 : 6,
    },
    actionToggleBtn: {
      flex: 1,
      paddingVertical: isSmallTablet ? 6 : 8,
      paddingHorizontal: isSmallTablet ? 4 : 6,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#CED4DA',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionToggleBtnActive: {
      backgroundColor: '#E7F1FF',
      borderColor: '#0D6EFD',
    },
    actionToggleText: {
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 12 : 11,
      color: '#495057',
      fontWeight: '500',
    },
    actionToggleTextActive: {
      color: '#0D6EFD',
      fontWeight: '700',
    },
    bottomButtons: {
      flexDirection: 'row',
      gap: isSmallTablet ? 8 : isLargeTablet ? 16 : 12,
    },
    footer: {
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingTop: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      paddingBottom: Platform.OS === 'android' ? 20 : 16,
      borderTopWidth: 1,
      borderTopColor: '#DEE2E6',
      backgroundColor: '#F8F9FA',
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
    panelDefaultsButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0D6EFD',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      borderRadius: 8,
      gap: isSmallTablet ? 4 : isLargeTablet ? 8 : 6,
      shadowColor: '#0D6EFD',
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
      statusBarTranslucent
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
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconButton} onPress={handleSave}>
              <Save size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
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
                            placeholder="192.168.1.200"
                          />
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
                </View>
              </View>
            </View>

            {/* Columna Derecha - Configuración API */}
            <View style={styles.rightColumn}>
              <Text style={styles.sectionTitle}>CONFIGURACIÓN API</Text>
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
                  manual: 'BLOQUEO OFICINA',
                  incendio: 'SEÑAL DE INCENDIO',
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
                        <ActionSelector
                          value={config.modes[key as keyof ModesConfig].action}
                          onChange={(action) =>
                            setConfig((prev) => ({
                              ...prev,
                              modes: {
                                ...prev.modes,
                                [key]: {
                                  ...prev.modes[key as keyof ModesConfig],
                                  action,
                                },
                              },
                            }))
                          }
                          styles={styles}
                        />
                      </View>
                    )}
                    {config.modes[key as keyof ModesConfig].enabled &&
                      config.modes[key as keyof ModesConfig].action === 'set_output' && (
                        <View style={styles.modeFieldBlock}>
                          <Text style={styles.modeFieldLabel}>Código salida:</Text>
                          <TextInput
                            style={styles.modeTextInput}
                            value={config.modes[key as keyof ModesConfig].output_code || ''}
                            onChangeText={(value) =>
                              setConfig((prev) => ({
                                ...prev,
                                modes: {
                                  ...prev.modes,
                                  [key]: {
                                    ...prev.modes[key as keyof ModesConfig],
                                    output_code: value,
                                  },
                                },
                              }))
                            }
                            placeholder="ej: OUT_02_06"
                            autoCapitalize="none"
                          />
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
                            <Text style={styles.modeFieldLabel}>ON al activar</Text>
                            <Switch
                              value={config.modes[key as keyof ModesConfig].output_on !== false}
                              onValueChange={(value) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  modes: {
                                    ...prev.modes,
                                    [key]: {
                                      ...prev.modes[key as keyof ModesConfig],
                                      output_on: value,
                                    },
                                  },
                                }))
                              }
                              trackColor={{ false: '#CED4DA', true: '#28A745' }}
                            />
                          </View>
                        </View>
                      )}
                  </View>
                ))}
              </View>
              
              <Text style={styles.emergencyNote}>
                set_rule: rule_key y active. set_output: code y on. El backend puede responder 409 al activar
                set_rule.
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
                  <Text style={styles.emergencySubtitle}>API del panel vía set_mode</Text>
                  <Text style={styles.modeFieldLabel}>rule_key</Text>
                  <TextInput
                    style={styles.modeTextInput}
                    value={config.emergency.rule_key || ''}
                    onChangeText={(value) =>
                      setConfig((prev) => ({
                        ...prev,
                        emergency: { ...prev.emergency, rule_key: value },
                      }))
                    }
                    placeholder="ej: pulsador_emergencia_verde_puerta_oficina"
                    autoCapitalize="none"
                  />
                  <Text style={[styles.modeFieldLabel, { marginTop: 10 }]}>action</Text>
                  <ActionSelector
                    value={config.emergency.action}
                    onChange={(action) =>
                      setConfig((prev) => ({
                        ...prev,
                        emergency: {
                          ...prev.emergency,
                          action,
                        },
                      }))
                    }
                    styles={styles}
                  />
                  {config.emergency.action === 'set_output' && (
                    <>
                      <Text style={[styles.modeFieldLabel, { marginTop: 10 }]}>Código salida</Text>
                      <TextInput
                        style={styles.modeTextInput}
                        value={config.emergency.output_code || ''}
                        onChangeText={(value) =>
                          setConfig((prev) => ({
                            ...prev,
                            emergency: { ...prev.emergency, output_code: value },
                          }))
                        }
                        placeholder="OUT_02_03"
                        autoCapitalize="none"
                      />
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
                        <Text style={styles.modeFieldLabel}>ON al activar</Text>
                        <Switch
                          value={config.emergency.output_on !== false}
                          onValueChange={(value) =>
                            setConfig((prev) => ({
                              ...prev,
                              emergency: { ...prev.emergency, output_on: value },
                            }))
                          }
                          trackColor={{ false: '#CED4DA', true: '#28A745' }}
                        />
                      </View>
                    </>
                  )}
                  <Text style={styles.emergencyNote}>
                    Titilado rojo cuando el pulsador de emergencia está activo en el panel o tras activar desde la tablet.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.panelDefaultsButton} onPress={handleRestorePanelDefaults}>
              <RefreshCw size={20} color="#FFFFFF" />
              <Text style={styles.resetButtonText}>DATOS PANEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={handleResetConfiguration}>
              <RefreshCw size={20} color="#FFFFFF" />
              <Text style={styles.resetButtonText}>RESET APP</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ConfirmDialogModal
          visible={confirmAction !== null}
          title={
            confirmAction === 'reset_app'
              ? 'Restablecer configuración local'
              : 'Restaurar datos del panel'
          }
          message={
            confirmAction === 'reset_app'
              ? 'Se eliminarán los datos guardados en esta tablet y se cargarán los valores de fábrica embebidos en la app. ¿Continuar?'
              : 'Se descartarán los cambios locales y se importará la configuración por defecto de la sucursal desde el panel. ¿Continuar?'
          }
          confirmText={confirmAction === 'reset_app' ? 'Restablecer' : 'Restaurar'}
          confirmColor={confirmAction === 'reset_app' ? '#DC3545' : '#0D6EFD'}
          loading={confirmBusy}
          onCancel={() => {
            if (!confirmBusy) setConfirmAction(null);
          }}
          onConfirm={runConfirmedConfigAction}
        />
        
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