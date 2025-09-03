import { useState, useEffect, useCallback, useRef } from 'react';
import { doorControlService, SystemStatus, ConfigurationData } from '@/services/DoorControlService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ScheduleConfig {
  ini1: string;
  ini2: string;
}

interface SavedConfiguration {
  schedules: {
    comercial: ScheduleConfig;
    extendido: ScheduleConfig;
    autoservicio: ScheduleConfig;
    cerrado: ScheduleConfig;
  };
  officeWithATM: boolean;
}
export function useDoorControl() {
  const isMounted = useRef(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('offline');
  const [currentScheduleMode, setCurrentScheduleMode] = useState<string | null>(null);

  // Función para determinar el modo según el horario actual
  const determineScheduleMode = useCallback(async (): Promise<string | null> => {
    try {
      const savedConfig = await AsyncStorage.getItem('new_door_config');
      if (!savedConfig) return null;
      
      const config: SavedConfiguration = JSON.parse(savedConfig);
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      // Función helper para verificar si la hora actual está en el rango
      const isTimeInRange = (ini1: string, ini2: string): boolean => {
        const [h1, m1] = ini1.split(':').map(Number);
        const [h2, m2] = ini2.split(':').map(Number);
        const [hNow, mNow] = currentTime.split(':').map(Number);
        
        const timeNow = hNow * 60 + mNow;
        const time1 = h1 * 60 + m1;
        const time2 = h2 * 60 + m2;
        
        if (time1 <= time2) {
          // Rango normal (ej: 08:00 - 14:00)
          return timeNow >= time1 && timeNow <= time2;
        } else {
          // Rango que cruza medianoche (ej: 22:00 - 08:00)
          return timeNow >= time1 || timeNow <= time2;
        }
      };
      
      // Verificar horarios en orden de prioridad
      if (isTimeInRange(config.schedules.comercial.ini1, config.schedules.comercial.ini2)) {
        return 'COMERCIAL AUTOMÁTICO';
      }
      
      if (isTimeInRange(config.schedules.extendido.ini1, config.schedules.extendido.ini2)) {
        return 'HORARIO EXTENDIDO';
      }
      
      if (isTimeInRange(config.schedules.autoservicio.ini1, config.schedules.autoservicio.ini2)) {
        return 'AUTOSERVICIO';
      }
      
      if (isTimeInRange(config.schedules.cerrado.ini1, config.schedules.cerrado.ini2)) {
        return 'OFICINA CERRADA';
      }
      
      // Por defecto, oficina cerrada
      return 'OFICINA CERRADA';
      
    } catch (error) {
      console.error('Error determining schedule mode:', error);
      return null;
    }
  }, []);

  // Verificar y aplicar modo automático según horario
  const checkAndApplyScheduleMode = useCallback(async (changeModeFunction?: (mode: string) => Promise<boolean>) => {
    const scheduledMode = await determineScheduleMode();
    if (scheduledMode && scheduledMode !== currentScheduleMode && isMounted.current) {
      console.log(`🕐 Modo automático por horario: ${scheduledMode}`);
      setCurrentScheduleMode(scheduledMode);
      
      // Solo aplicar si no hay modo de emergencia activo
      if (!systemStatus?.emergencyActive && changeModeFunction) {
        await changeModeFunction(scheduledMode);
      }
    }
  }, [currentScheduleMode, systemStatus?.emergencyActive, determineScheduleMode]);

  // Obtener estado del sistema
  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const status = await doorControlService.getSystemStatus();
      if (status) {
        if (isMounted.current) {
          setSystemStatus(status);
          setConnectionStatus(status.connectionStatus);
        }
      } else {
        if (isMounted.current) {
          setConnectionStatus('offline');
          setError('No se pudo obtener el estado del sistema');
        }
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setConnectionStatus('offline');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Cambiar modo de operación
  const changeMode = useCallback(async (mode: string): Promise<boolean> => {
    try {
      if (isMounted.current) {
        setIsLoading(true);
        setError(null);
      }
      
      const success = await doorControlService.changeMode(mode);
      if (success) {
        // Actualizar estado después del cambio
        await refreshStatus();
        return true;
      } else {
        if (isMounted.current) {
          setError('Error al cambiar el modo de operación');
        }
        return false;
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error al cambiar modo');
      }
      return false;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [refreshStatus]);

  // Activar/Desactivar emergencia
  const toggleEmergency = useCallback(async (activate: boolean): Promise<boolean> => {
    try {
      if (isMounted.current) {
        setIsLoading(true);
        setError(null);
      }
      
      const success = await doorControlService.toggleEmergencyMode(activate);
      if (success) {
        // Actualizar estado después del cambio
        await refreshStatus();
        return true;
      } else {
        if (isMounted.current) {
          setError(`Error al ${activate ? 'activar' : 'desactivar'} modo emergencia`);
        }
        return false;
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error en modo emergencia');
      }
      return false;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [refreshStatus]);

  // Control manual de puertas
  const controlDoor = useCallback(async (doorId: 'P1' | 'P2' | 'P3' | 'P4', action: 'open' | 'close'): Promise<boolean> => {
    try {
      if (isMounted.current) {
        setIsLoading(true);
        setError(null);
      }
      
      const success = await doorControlService.controlDoor(doorId, action);
      if (success) {
        // Actualizar estado después del control
        await refreshStatus();
        return true;
      } else {
        if (isMounted.current) {
          setError(`Error al ${action === 'open' ? 'abrir' : 'cerrar'} la puerta ${doorId}`);
        }
        return false;
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error controlando puerta');
      }
      return false;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [refreshStatus]);

  // Configurar sistema
  const configure = useCallback(async (config: ConfigurationData): Promise<boolean> => {
    try {
      if (isMounted.current) {
        setIsLoading(true);
        setError(null);
      }
      
      const success = await doorControlService.setConfiguration(config);
      if (success) {
        await refreshStatus();
        return true;
      } else {
        if (isMounted.current) {
          setError('Error al configurar la conexión');
        }
        return false;
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error de configuración');
      }
      return false;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [refreshStatus]);

  // Verificar actualizaciones
  const checkUpdates = useCallback(async () => {
    try {
      return await doorControlService.checkForUpdates();
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error verificando actualizaciones');
      }
      return { hasUpdate: false };
    }
  }, []);

  // Validar dispositivo
  const validateDevice = useCallback(async (): Promise<boolean> => {
    try {
      return await doorControlService.validateDevice();
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error validando dispositivo');
      }
      return false;
    }
  }, []);

  // Efecto para cargar estado inicial
  useEffect(() => {
    isMounted.current = true;
    
    refreshStatus();
    
    // Actualizar estado cada 10 segundos
    const interval = setInterval(refreshStatus, 10000);
    
    // Verificar horarios cada minuto
    const scheduleInterval = setInterval(() => checkAndApplyScheduleMode(changeMode), 60000);
    
    return () => {
      isMounted.current = false;
      clearInterval(interval);
      clearInterval(scheduleInterval);
    };
  }, [refreshStatus, changeMode, checkAndApplyScheduleMode]);

  // Efecto separado para la verificación inicial de horarios
  useEffect(() => {
    if (isMounted.current) {
      checkAndApplyScheduleMode(changeMode);
    }
  }, [checkAndApplyScheduleMode, changeMode]);

  return {
    systemStatus,
    isLoading,
    error,
    connectionStatus,
    currentScheduleMode,
    refreshStatus,
    changeMode,
    toggleEmergency,
    controlDoor,
    configure,
    checkUpdates,
    validateDevice,
    determineScheduleMode,
  };
}