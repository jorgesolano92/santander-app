import { useState, useEffect, useCallback, useRef } from 'react';
import {
  doorControlService,
  ConfigurationData,
  SystemStatus,
  type PanelApiResult,
} from '../services/DoorControlService';
import { sipService, SipCallState, SipEventType } from '../services/SipService';
import { startSipIntercom, stopSipIntercom } from '../services/intercomSip';
import { IntercomConfig } from '../components/IntercomConfigurationModal';
import { emergencyService } from '../services/EmergencyService';
import { showOperationError } from '@/utils/showOperationError';

export interface UseDoorControlReturn {
  systemStatus: SystemStatus | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  currentScheduleMode: string | null;
  changeMode: (mode: string) => Promise<PanelApiResult>;
  toggleEmergency: (newState: boolean) => Promise<PanelApiResult>;
  configure: (config: ConfigurationData) => Promise<boolean>;
  validateDevice: () => Promise<boolean>;
  determineScheduleMode: () => string;
  controlDoor: (doorId: string, action: 'open' | 'close') => Promise<boolean>;
  isDoorVerifying: (doorId: string) => boolean;
  refreshAllDoorsStatus: () => Promise<boolean>;
  testAxisIntercomConnection: (ip: string, username: string, password: string) => Promise<{
    success: boolean;
    message: string;
    deviceInfo?: any;
    error?: string;
  }>;
  // SIP functionality
  sipCallState: SipCallState | null;
  startIntercomCall: (intercomConfig: IntercomConfig) => Promise<boolean>;
  endIntercomCall: () => Promise<void>;
  muteMicrophone: (mute: boolean) => Promise<void>;
  setSpeakerphone: (enabled: boolean) => Promise<void>;
  activeSipCallDoorId: string | null;
}

export function useDoorControl(): UseDoorControlReturn {
  const isMountedRef = useRef(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [currentScheduleMode, setCurrentScheduleMode] = useState<string | null>(null);
  const [sipCallState, setSipCallState] = useState<SipCallState | null>(null);
  const [activeSipCallDoorId, setActiveSipCallDoorId] = useState<string | null>(null);
  const isUpdatingStatusRef = useRef<boolean>(false);

  const updateSystemStatus = useCallback(async (showLoader: boolean = false) => {
    // Evitar llamadas concurrentes
    if (isUpdatingStatusRef.current) {
      console.log('⚠️ updateSystemStatus ya en ejecución - omitiendo llamada');
      return;
    }

    try {
      if (!isMountedRef.current) return;
      
      isUpdatingStatusRef.current = true;
      
      if (showLoader) {
        setIsLoading(true);
      }
      setError(null);
      setConnectionStatus('connecting');
      
      const status = await doorControlService.getSystemStatus();
      
      if (!isMountedRef.current) return;
      
      // Verificar el estado de emergencia desde AsyncStorage (rápido, sin petición al servidor)
      const emergencyState = await emergencyService.getEmergencyState();
      const isEmergencyActiveLocal = emergencyState?.isActive || false;
      const emergencyConfig = await emergencyService.getEmergencyConfig();

      const panelRuleKey = await doorControlService.getPanelCurrentModeRuleKey();
      const emergRule = String(emergencyConfig?.rule_key || '').trim();
      const emergencyActive =
        !!emergencyConfig?.enabled &&
        ((!!panelRuleKey && !!emergRule && panelRuleKey === emergRule) || isEmergencyActiveLocal);

      const updatedStatus = {
        ...status,
        emergencyActive,
        emergencyConfigured: emergencyConfig?.enabled || false,
      };
      
      setSystemStatus(updatedStatus);
      setConnectionStatus('connected');
      
      // Determine current mode from system status
      const mode = determineScheduleMode();
      if (isMountedRef.current) {
        setCurrentScheduleMode(mode);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setConnectionStatus('disconnected');
      }
    } finally {
      isUpdatingStatusRef.current = false;
      if (isMountedRef.current && showLoader) {
        setIsLoading(false);
      }
    }
  }, []);

  const changeMode = useCallback(async (mode: string): Promise<PanelApiResult> => {
    try {
      if (!isMountedRef.current) return { ok: false, errorMessage: 'Operación cancelada.' };

      setIsLoading(true);
      setError(null);

      const result = await doorControlService.changeMode(mode);
      if (!isMountedRef.current) return { ok: false, errorMessage: 'Operación cancelada.' };
      if (!result.ok) {
        return result;
      }
      if ('queued' in result && result.queued) {
        return result;
      }

      setCurrentScheduleMode(mode);

      await updateSystemStatus(false);
      return { ok: true };
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error al cambiar modo');
      }
      return {
        ok: false,
        errorMessage: err instanceof Error ? err.message : 'Error al cambiar modo',
      };
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [updateSystemStatus]);

  const toggleEmergency = useCallback(async (newState: boolean): Promise<PanelApiResult> => {
    try {
      if (!isMountedRef.current) return { ok: false, errorMessage: 'Operación cancelada.' };

      setIsLoading(true);
      setError(null);

      console.log('🚨 toggleEmergency:', newState ? 'ACTIVANDO' : 'DESACTIVANDO');

      let result: PanelApiResult = { ok: false, errorMessage: 'Error desconocido.' };
      try {
        if (newState) {
          result = await doorControlService.activateEmergency();
        } else {
          result = await doorControlService.deactivateEmergency();
        }
      } catch (emergencyError) {
        console.error('❌ Error en activateEmergency/deactivateEmergency:', emergencyError);
        result = {
          ok: false,
          errorMessage:
            emergencyError instanceof Error
              ? emergencyError.message
              : String(emergencyError),
        };
      }

      if (!isMountedRef.current) return { ok: false, errorMessage: 'Operación cancelada.' };

      if (result.ok) {
        console.log('✅ Emergencia:', newState ? 'ACTIVADA' : 'DESACTIVADA');
        await updateSystemStatus(false);
        return { ok: true };
      }
      console.error('❌ Error en toggleEmergency:', result.errorMessage);
      return result;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error en modo emergencia');
      }
      return {
        ok: false,
        errorMessage: err instanceof Error ? err.message : 'Error en modo emergencia',
      };
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [updateSystemStatus]);

  const configure = useCallback(async (config: ConfigurationData): Promise<boolean> => {
    try {
      if (!isMountedRef.current) return false;
    
      setIsLoading(true);
      setError(null);
      
      await doorControlService.setConfiguration(config);
      
      if (!isMountedRef.current) return false;
      
      setConnectionStatus('disconnected');
      setSystemStatus(null);
      setCurrentScheduleMode(null);
      
      return true;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error aplicando configuración');
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refreshAllDoorsStatus = useCallback(async (): Promise<boolean> => {
    try {
      if (!isMountedRef.current) return false;
      
      const success = await doorControlService.refreshAllDoorsStatus();
      
      if (!isMountedRef.current) return false;
      
      // Actualizar el estado después de refrescar (sin loader, ya está el de refreshing)
      await updateSystemStatus(false);
      
      return success;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error refrescando estado de puertas');
      }
      return false;
    }
  }, [updateSystemStatus]);

  const validateDevice = useCallback(async (): Promise<boolean> => {
    try {
      if (!isMountedRef.current) return false;
      
      setIsLoading(true);
      setError(null);
      setConnectionStatus('connecting');
      
      const isValid = await doorControlService.validateDevice();
      
      if (!isMountedRef.current) return false;
      
      if (isValid) {
        setConnectionStatus('connected');
        // Estado local rápido; no bloquear la pantalla principal
        await updateSystemStatus(false);
        void refreshAllDoorsStatus().catch((err) => {
          console.warn('⚠️ Refresco inicial del panel en segundo plano:', err);
        });
      } else {
        setConnectionStatus('disconnected');
        setError('Dispositivo no válido o no accesible');
      }
      
      return isValid;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error de validación');
        setConnectionStatus('disconnected');
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [updateSystemStatus, refreshAllDoorsStatus]);

  const determineScheduleMode = useCallback((): string => {
    if (!systemStatus) return 'MANUAL';
    
    // Based on the API response, determine mode from system status
    // This logic should be adjusted based on how the API indicates the current mode
    return systemStatus.mode || 'MANUAL';
  }, [systemStatus]);

  const controlDoor = useCallback(async (doorId: string, action: 'open' | 'close'): Promise<boolean> => {
    try {
      if (!isMountedRef.current) return false;
      
      setIsLoading(true);
      setError(null);
      
      // Actualizar estado inmediatamente para mostrar el estado de transición
      if (isMountedRef.current && systemStatus?.doors[doorId as keyof typeof systemStatus.doors]) {
        const door = systemStatus.doors[doorId as keyof typeof systemStatus.doors];
        if (door) {
          door.status = action === 'open' ? 'opening' : 'closing';
          door.lastUpdate = new Date().toISOString();
        }
      }
      
      const result = await doorControlService.controlDoor(
        doorId as 'P1' | 'P2' | 'P3' | 'P4',
        action,
      );
      
      if (!isMountedRef.current) return false;

      if (!result.ok) {
        showOperationError(
          action === 'open' ? 'No se pudo abrir la puerta' : 'No se pudo cerrar la puerta',
          result.errorMessage,
        );
        await updateSystemStatus(false);
        return false;
      }
      
      // Refresh system status after door control (sin loader, la acción de puerta ya tiene feedback)
      await updateSystemStatus(false);
      return true;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error al controlar puerta');
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [updateSystemStatus]);

  const startIntercomCall = useCallback(async (intercomConfig: IntercomConfig): Promise<boolean> => {
    try {
      if (!isMountedRef.current) return false;

      setIsLoading(true);
      setError(null);

      const doorId =
        intercomConfig.name.includes('P1') || intercomConfig.name.includes('Calle') ? 'P1' : 'P2';

      const ok = await startSipIntercom(doorId, intercomConfig);
      if (ok && isMountedRef.current) {
        setActiveSipCallDoorId(doorId);
        setSipCallState(sipService.getCallState());
      }
      return ok;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error iniciando llamada SIP');
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const endIntercomCall = useCallback(async (): Promise<void> => {
    try {
      if (!isMountedRef.current) return;

      setIsLoading(true);
      setError(null);

      await stopSipIntercom();

      if (isMountedRef.current) {
        setSipCallState(null);
        setActiveSipCallDoorId(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error finalizando llamada SIP');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const muteMicrophone = useCallback(async (mute: boolean): Promise<void> => {
    try {
      if (!isMountedRef.current) return;
      
      await sipService.muteMicrophone(mute);
      
      if (isMountedRef.current) {
        setSipCallState(sipService.getCallState());
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error controlando micrófono');
      }
    }
  }, []);

  const setSpeakerphone = useCallback(async (enabled: boolean): Promise<void> => {
    try {
      if (!isMountedRef.current) return;
      
      await sipService.setSpeakerphone(enabled);
      
      if (isMountedRef.current) {
        setSipCallState(sipService.getCallState());
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error controlando altavoz');
      }
    }
  }, []);

  // Initialize sandbox mode on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    // Set up SIP service event listeners
    const handleSipEvent = (eventType: SipEventType, data?: any) => {
      if (!isMountedRef.current) return;
      
      console.log(`🔊 SIP Event: ${eventType}`, data);
      
      switch (eventType) {
        case 'callStarted':
          setSipCallState(sipService.getCallState());
          break;
        case 'callConnected':
          setSipCallState(sipService.getCallState());
          break;
        case 'callEnded':
          setSipCallState(null);
          setActiveSipCallDoorId(null);
          break;
        case 'callFailed':
          setSipCallState(null);
          setActiveSipCallDoorId(null);
          setError('Error en la llamada SIP: ' + (data?.message || 'Error desconocido'));
          break;
        case 'error':
          setError('Error SIP: ' + (data?.message || 'Error desconocido'));
          break;
      }
    };

    // Add SIP event listeners
    sipService.on('callStarted', (data) => handleSipEvent('callStarted', data));
    sipService.on('callConnected', (data) => handleSipEvent('callConnected', data));
    sipService.on('callEnded', (data) => handleSipEvent('callEnded', data));
    sipService.on('callFailed', (data) => handleSipEvent('callFailed', data));
    sipService.on('error', (data) => handleSipEvent('error', data));
    
    // Suscribirse a cambios de estado del servicio de puertas
    doorControlService.onStatusChange(() => {
      if (isMountedRef.current) {
        updateSystemStatus(false); // NO mostrar loader en cambios de estado
      }
    });
    
    return () => {
      isMountedRef.current = false;
      // Clean up SIP service listeners
      sipService.removeAllListeners();
    };
  }, [updateSystemStatus]);

  // Auto-refresh system status periodically when connected
  // TEMPORALMENTE DESHABILITADO para evitar interferencia con streams de video
  useEffect(() => {
    // let interval: NodeJS.Timeout;
    
    // if (connectionStatus === 'connected') {
    //   console.log('🔄 Iniciando intervalo de actualización cada 5 segundos');
    //   interval = setInterval(() => {
    //     // console.log('⏰ Ejecutando actualización periódica del sistema');
    //     updateSystemStatus(false); // NO mostrar loader en actualizaciones periódicas
    //   }, 5000); // Refresh every 5 seconds
    // }
    
    // return () => {
    //   if (interval) {
    //     console.log('🛑 Deteniendo intervalo de actualización');
    //     clearInterval(interval);
    //   }
    // };
  }, [connectionStatus, updateSystemStatus]);

  const isDoorVerifying = useCallback((doorId: string): boolean => {
    return doorControlService.isDoorVerifying(doorId);
  }, []);

  return {
    systemStatus,
    isLoading,
    error,
    connectionStatus,
    currentScheduleMode,
    changeMode,
    toggleEmergency,
    configure,
    validateDevice,
    determineScheduleMode,
    controlDoor,
    isDoorVerifying,
    refreshAllDoorsStatus,
    testAxisIntercomConnection: doorControlService.testAxisIntercomConnection.bind(doorControlService),
    sipCallState,
    startIntercomCall,
    endIntercomCall,
    muteMicrophone,
    setSpeakerphone,
    activeSipCallDoorId,
  };
}