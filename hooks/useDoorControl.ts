import { useState, useEffect, useCallback } from 'react';
import { DoorControlService, ConfigurationData, SystemStatus } from '../services/DoorControlService';

export interface UseDoorControlReturn {
  systemStatus: SystemStatus | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  currentScheduleMode: 'automatic' | 'manual' | null;
  changeMode: (mode: 'automatic' | 'manual') => Promise<void>;
  toggleEmergency: () => Promise<void>;
  configure: (config: ConfigurationData) => void;
  validateDevice: () => Promise<boolean>;
  determineScheduleMode: () => 'automatic' | 'manual';
  controlDoor: (doorId: string, action: 'open' | 'close') => Promise<void>;
}

// Create a singleton instance
const doorControlService = new DoorControlService();

export function useDoorControl(): UseDoorControlReturn {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [currentScheduleMode, setCurrentScheduleMode] = useState<'automatic' | 'manual' | null>(null);

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

  const changeMode = useCallback(async (mode: 'automatic' | 'manual') => {
    try {
      setIsLoading(true);
      setError(null);
      
      await doorControlService.changeMode(mode);
      setCurrentScheduleMode(mode);
      
      // Refresh system status after mode change
      await updateSystemStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar modo');
    } finally {
      setIsLoading(false);
    }
  }, [updateSystemStatus]);

  const toggleEmergency = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await doorControlService.toggleEmergencyMode();
      
      // Refresh system status after emergency toggle
      await updateSystemStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en modo emergencia');
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

  const determineScheduleMode = useCallback((): 'automatic' | 'manual' => {
    if (!systemStatus) return 'manual';
    
    // Based on the API response, determine mode from system status
    // This logic should be adjusted based on how the API indicates the current mode
    return systemStatus.mode || 'manual';
  }, [systemStatus]);

  const controlDoor = useCallback(async (doorId: string, action: 'open' | 'close') => {
    try {
      setIsLoading(true);
      setError(null);
      
      await doorControlService.controlDoor(doorId, action);
      
      // Refresh system status after door control
      await updateSystemStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al controlar puerta');
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