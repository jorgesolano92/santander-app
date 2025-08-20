import { useState, useEffect, useCallback } from 'react';
import { doorControlService, SystemStatus, ConfigurationData } from '@/services/DoorControlService';

export function useDoorControl() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('offline');

  // Obtener estado del sistema
  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const status = await doorControlService.getSystemStatus();
      if (status) {
        setSystemStatus(status);
        setConnectionStatus(status.connectionStatus);
      } else {
        setConnectionStatus('offline');
        setError('No se pudo obtener el estado del sistema');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setConnectionStatus('offline');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cambiar modo de operación
  const changeMode = useCallback(async (mode: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await doorControlService.changeMode(mode);
      if (success) {
        // Actualizar estado después del cambio
        await refreshStatus();
        return true;
      } else {
        setError('Error al cambiar el modo de operación');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar modo');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  // Activar/Desactivar emergencia
  const toggleEmergency = useCallback(async (activate: boolean): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await doorControlService.toggleEmergencyMode(activate);
      if (success) {
        // Actualizar estado después del cambio
        await refreshStatus();
        return true;
      } else {
        setError(`Error al ${activate ? 'activar' : 'desactivar'} modo emergencia`);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en modo emergencia');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  // Control manual de puertas
  const controlDoor = useCallback(async (doorId: 'P1' | 'P2' | 'P3' | 'P4', action: 'open' | 'close'): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await doorControlService.controlDoor(doorId, action);
      if (success) {
        // Actualizar estado después del control
        await refreshStatus();
        return true;
      } else {
        setError(`Error al ${action === 'open' ? 'abrir' : 'cerrar'} la puerta ${doorId}`);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error controlando puerta');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  // Configurar sistema
  const configure = useCallback(async (config: ConfigurationData): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await doorControlService.setConfiguration(config);
      if (success) {
        await refreshStatus();
        return true;
      } else {
        setError('Error al configurar la conexión');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de configuración');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  // Verificar actualizaciones
  const checkUpdates = useCallback(async () => {
    try {
      return await doorControlService.checkForUpdates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error verificando actualizaciones');
      return { hasUpdate: false };
    }
  }, []);

  // Validar dispositivo
  const validateDevice = useCallback(async (): Promise<boolean> => {
    try {
      return await doorControlService.validateDevice();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error validando dispositivo');
      return false;
    }
  }, []);

  // Efecto para cargar estado inicial
  useEffect(() => {
    refreshStatus();
    
    // Actualizar cada 10 segundos
    const interval = setInterval(refreshStatus, 10000);
    
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return {
    systemStatus,
    isLoading,
    error,
    connectionStatus,
    refreshStatus,
    changeMode,
    toggleEmergency,
    controlDoor,
    configure,
    checkUpdates,
    validateDevice,
  };
}