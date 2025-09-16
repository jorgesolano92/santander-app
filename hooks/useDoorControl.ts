import { useState, useEffect, useCallback, useRef } from 'react';
import { doorControlService, ConfigurationData, SystemStatus } from '../services/DoorControlService';

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
}

export function useDoorControl(): UseDoorControlReturn {
  const isMountedRef = useRef(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [currentScheduleMode, setCurrentScheduleMode] = useState<string | null>(null);

  // Initialize sandbox mode on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
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
  };
}