import { useState, useEffect, useCallback } from 'react';
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
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [currentScheduleMode, setCurrentScheduleMode] = useState<string | null>(null);

  // Initialize sandbox mode on mount
  useEffect(() => {
    doorControlService.setSandboxMode(true);
  }, []);

  const updateSystemStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setConnectionStatus('connecting');
      
      const status = await doorControlService.getSystemStatus();
      setSystemStatus(status);
      setConnectionStatus('connected');
      
      // Determine current mode from system status
      const mode = determineScheduleMode();
      setCurrentScheduleMode(mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changeMode = useCallback(async (mode: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await doorControlService.changeMode(mode);
      setCurrentScheduleMode(mode);
      
      // Refresh system status after mode change
      await updateSystemStatus();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar modo');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [updateSystemStatus]);

  const toggleEmergency = useCallback(async (newState: boolean): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await doorControlService.toggleEmergencyMode(newState);
      
      // Refresh system status after emergency toggle
      await updateSystemStatus();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en modo emergencia');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [updateSystemStatus]);

  const configure = useCallback((config: ConfigurationData) => {
    doorControlService.setConfiguration(config);
    setError(null);
    setConnectionStatus('disconnected');
    setSystemStatus(null);
    setCurrentScheduleMode(null);
  }, []);

  const validateDevice = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      setConnectionStatus('connecting');
      
      const isValid = await doorControlService.validateDevice();
      
      if (isValid) {
        setConnectionStatus('connected');
        await updateSystemStatus();
      } else {
        setConnectionStatus('disconnected');
        setError('Dispositivo no válido o no accesible');
      }
      
      return isValid;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de validación');
      setConnectionStatus('disconnected');
      return false;
    } finally {
      setIsLoading(false);
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
      setIsLoading(true);
      setError(null);
      
      // Actualizar estado inmediatamente para mostrar el estado de transición
      if (systemStatus?.doors[doorId as keyof typeof systemStatus.doors]) {
        const door = systemStatus.doors[doorId as keyof typeof systemStatus.doors];
        if (door) {
          door.status = action === 'open' ? 'opening' : 'closing';
          door.lastUpdate = new Date().toISOString();
        }
      }
      
      await doorControlService.controlDoor(doorId, action);
      
      // Refresh system status after door control
      await updateSystemStatus();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al controlar puerta');
      return false;
    } finally {
      setIsLoading(false);
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