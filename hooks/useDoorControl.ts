import { useState, useEffect, useCallback, useRef } from 'react';
import { doorControlService, ConfigurationData, SystemStatus } from '../services/DoorControlService';
import { sipService, SipConfig, SipCallState, SipEventType } from '../services/SipService';
import { IntercomConfig } from '../components/IntercomConfigurationModal';

export interface UseDoorControlReturn {
  systemStatus: SystemStatus | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  currentScheduleMode: string | null;
  changeMode: (mode: string) => Promise<boolean>;
  toggleEmergency: (newState: boolean) => Promise<boolean>;
  configure: (config: ConfigurationData) => void;
  validateDevice: () => Promise<boolean>;
  determineScheduleMode: () => string;
  controlDoor: (doorId: string, action: 'open' | 'close') => Promise<boolean>;
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
    
    return () => {
      isMountedRef.current = false;
      // Clean up SIP service listeners
      sipService.removeAllListeners();
    };
  }, []);

  const updateSystemStatus = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      
      setIsLoading(true);
      setError(null);
      setConnectionStatus('connecting');
      
      const status = await doorControlService.getSystemStatus();
      
      if (!isMountedRef.current) return;
      
      setSystemStatus(status);
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
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const changeMode = useCallback(async (mode: string): Promise<boolean> => {
    try {
      if (!isMountedRef.current) return false;
      
      setIsLoading(true);
      setError(null);
      
      await doorControlService.changeMode(mode);
      
      if (!isMountedRef.current) return false;
      
      setCurrentScheduleMode(mode);
      
      // Refresh system status after mode change
      await updateSystemStatus();
      return true;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error al cambiar modo');
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [updateSystemStatus]);

  const toggleEmergency = useCallback(async (newState: boolean): Promise<boolean> => {
    try {
      if (!isMountedRef.current) return false;
      
      setIsLoading(true);
      setError(null);
      
      await doorControlService.toggleEmergencyMode(newState);
      
      if (!isMountedRef.current) return false;
      
      // Refresh system status after emergency toggle
      await updateSystemStatus();
      return true;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error en modo emergencia');
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [updateSystemStatus]);

  const configure = useCallback((config: ConfigurationData) => {
    if (!isMountedRef.current) return;
    
    doorControlService.setConfiguration(config);
    setError(null);
    setConnectionStatus('disconnected');
    setSystemStatus(null);
    setCurrentScheduleMode(null);
  }, []);

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
        await updateSystemStatus();
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
  }, [updateSystemStatus]);

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
      
      await doorControlService.controlDoor(doorId, action);
      
      if (!isMountedRef.current) return false;
      
      // Refresh system status after door control
      await updateSystemStatus();
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
      
      // Check if SIP is configured
      if (!intercomConfig.sipUri || !intercomConfig.sipUsername || !intercomConfig.sipPassword) {
        setError('Configuración SIP incompleta para este intercomunicador');
        return false;
      }
      
      // Prepare SIP configuration
      const sipConfig: SipConfig = {
        sipUri: intercomConfig.sipUri,
        sipUsername: intercomConfig.sipUsername,
        sipPassword: intercomConfig.sipPassword,
        sipDomain: intercomConfig.sipDomain || 'localhost',
        enableTLS: intercomConfig.enableTLS || false,
      };
      
      // Initialize SIP service if not already initialized
      if (!sipService.isServiceInitialized()) {
        const initialized = await sipService.initialize(sipConfig);
        if (!initialized) {
          setError('Error inicializando servicio SIP');
          return false;
        }
      }
      
      // Start the call
      const callStarted = await sipService.startCall(intercomConfig.sipUri);
      
      if (callStarted && isMountedRef.current) {
        // Determine door ID from intercom name
        const doorId = intercomConfig.name.includes('P1') || intercomConfig.name.includes('Calle') ? 'P1' : 'P2';
        setActiveSipCallDoorId(doorId);
        setSipCallState(sipService.getCallState());
      }
      
      return callStarted;
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
      
      await sipService.endCall();
      
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

  // Auto-refresh system status periodically when connected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (connectionStatus === 'connected') {
      interval = setInterval(() => {
        updateSystemStatus();
      }, 5000); // Refresh every 5 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [connectionStatus, updateSystemStatus]);

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
    sipCallState,
    startIntercomCall,
    endIntercomCall,
    muteMicrophone,
    setSpeakerphone,
    activeSipCallDoorId,
  };
}