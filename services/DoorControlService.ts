import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DoorStatus {
  id: string;
  name: string;
  status: 'open' | 'closed' | 'opening' | 'closing' | 'error';
  locked: boolean;
  sensorActive: boolean;
  lastUpdate: string;
}

export interface SystemStatus {
  mode: string;
  doors: {
    P1: DoorStatus;
    P2: DoorStatus;
    P3?: DoorStatus;
    P4?: DoorStatus;
  };
  emergencyActive: boolean;
  connectionStatus: 'online' | 'offline';
  lastSync: string;
  tags?: Tag[];
  alarms?: Alarm[];
  events?: Event[];
}

export interface Tag {
  tag: string;
  Tip: number; // 0=Entrada, 1=Salida manual, 2=Salida automática
  v: string;   // Valor actual
  St: number;  // Estado: 0=reposo, 1=alarma, 128=fallo comunicación, 1000=apagada, 1001=encendida
  Rst?: number;
  TipS?: string;
  tact?: number;
  trc?: number;
  Srv_email_body?: string;
}

export interface Alarm {
  Action: number;
  id: number;
  TAG: string;
  lap: number;
  fh: string;
  pri: number;
  cev: number;
  ac: number;
}

export interface Event {
  Fec: string;
  CE: number;
  id: number;
  tg: string;
  v: string;
  FotoJPEGBase64?: string;
}

export interface ApiResponse {
  tags: Tag[];
  Alarms: Alarm[];
  Events: Event[];
}

export interface ModeChangeRequest {
  mode: string;
  timestamp: string;
  operator?: string;
}

export interface ConfigurationData {
  serverIP: string;
  apiPort: number;
  apiUsername: string;
  apiPassword: string;
  username: string;
  updateServerURL: string;
  deviceId: string;
}

class DoorControlService {
  private baseURL: string = '';
  private apiUsername: string = '';
  private apiPassword: string = '';
  private config: ConfigurationData | null = null;
  private connectionStatus: 'online' | 'offline' = 'offline';
  private statusCheckInterval: NodeJS.Timeout | null = null;
  private sandboxMode: boolean = true; // Modo sandbox activado por defecto
  private mockSystemStatus: SystemStatus;
  private lastEventId: number = 0;
  private lastChangeTime: number = 0;

  constructor() {
    // Estado inicial simulado
    this.mockSystemStatus = {
      mode: 'COMERCIAL AUTOMATICO',
      doors: {
        P1: {
          id: 'P1',
          name: 'Puerta Calle',
          status: 'closed',
          locked: true,
          sensorActive: true,
          lastUpdate: new Date().toISOString(),
        },
        P2: {
          id: 'P2',
          name: 'Puerta Oficina',
          status: 'closed',
          locked: true,
          sensorActive: true,
          lastUpdate: new Date().toISOString(),
        },
      },
      emergencyActive: false,
      connectionStatus: 'online',
      lastSync: new Date().toISOString(),
    };
    
    // Inicializar puertas adicionales si están configuradas
    this.initializeAdditionalDoors();
    this.loadConfiguration();
  }

  private async initializeAdditionalDoors(): Promise<void> {
    try {
      // Primero intentar cargar la nueva configuración
      let savedConfig = await AsyncStorage.getItem('new_door_config');
      
      // Si no existe, intentar cargar la configuración antigua
      if (!savedConfig) {
        savedConfig = await AsyncStorage.getItem('detailed_door_config');
      }
      
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        
        // Manejar nueva configuración
        if (config.doors) {
          const enabledDoors = config.doors.filter((door: any) => door.enabled);
          
          // Agregar puertas adicionales basadas en las habilitadas
          enabledDoors.forEach((door: any, index: number) => {
            if (index >= 2) { // P3, P4, etc.
              const doorId = `P${index + 1}` as 'P3' | 'P4';
              this.mockSystemStatus.doors[doorId] = {
                id: doorId,
                name: door.name || `Puerta ${index + 1}`,
                status: 'closed',
                locked: true,
                sensorActive: true,
                lastUpdate: new Date().toISOString(),
              };
            }
          });
        }
        // Manejar configuración antigua
        else if (config.direccionIP3) {
          this.mockSystemStatus.doors.P3 = {
            id: 'P3',
            name: 'Puerta Lateral',
            status: 'closed',
            locked: true,
            sensorActive: true,
            lastUpdate: new Date().toISOString(),
          };
        }
        
        if (config.direccionIP4) {
          this.mockSystemStatus.doors.P4 = {
            id: 'P4',
            name: 'Puerta Trasera',
            status: 'closed',
            locked: true,
            sensorActive: true,
            lastUpdate: new Date().toISOString(),
          };
        }
      }
    } catch (error) {
      console.error('Error initializing additional doors:', error);
    }
  }
  // Configuración del servicio
  async setConfiguration(config: ConfigurationData): Promise<boolean> {
    try {
      // En modo sandbox, simular configuración exitosa
      if (this.sandboxMode) {
        console.log('🔧 SANDBOX MODE: Simulating configuration setup');
        this.config = config;
        this.connectionStatus = 'online';
        
        // Simular delay de configuración
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('✅ SANDBOX: Configuration applied successfully');
        return true;
      }

      this.config = config;
      this.baseURL = `https://${config.serverIP}:${config.apiPort}`;
      this.apiUsername = config.apiUsername;
      this.apiPassword = config.apiPassword;
      
      // Guardar configuración localmente
      await this.saveConfiguration(config);
      
      // Verificar conexión
      const isConnected = await this.testConnection();
      this.connectionStatus = isConnected ? 'online' : 'offline';
      
      return isConnected;
    } catch (error) {
      console.error('Error setting configuration:', error);
      return false;
    }
  }

  // Generar header de autenticación BASIC
  private getBasicAuthHeader(): string {
    const credentials = `${this.apiUsername}:${this.apiPassword}`;
    const encoded = btoa(credentials); // Base64 encoding
    return `Basic ${encoded}`;
  }

  // Obtener estado actual del sistema
  async getSystemStatus(): Promise<SystemStatus | null> {
    try {
      // En modo sandbox, devolver el estado simulado
      if (this.sandboxMode) {
        return this.mockSystemStatus;
      }

      if (!this.baseURL) {
        console.warn('BaseURL not configured, skipping API call');
        return null;
      }

      // Usar la API real del cliente
      const mSecCambio = Date.now() - this.lastChangeTime;
      const apiUrl = `${this.baseURL}/gettags?mSecCambio=${mSecCambio}&id=${this.lastEventId}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': this.getBasicAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      this.connectionStatus = 'online';
      this.lastChangeTime = Date.now();
      
      // Actualizar último ID de evento
      if (data.Events && data.Events.length > 0) {
        this.lastEventId = Math.max(...data.Events.map(e => e.id));
      }
      
      // Procesar tags para determinar estado de puertas
      const processedStatus = this.processApiResponse(data);
      
      return processedStatus;
    } catch (error) {
      console.error('Error getting system status:', error);
      this.connectionStatus = 'offline';
      return null;
    }
  }

  // Procesar respuesta de la API real
  private processApiResponse(data: ApiResponse): SystemStatus {
    // Buscar modo de funcionamiento
    const modeTag = data.tags.find(tag => tag.tag === 'Srv_modo_funcionamiento_esclusa');
    let currentMode = 'COMERCIAL AUTOMÁTICO';
    
    if (modeTag) {
      switch (modeTag.v) {
        case '0':
          currentMode = 'OFICINA CERRADA';
          break;
        case '1':
          currentMode = 'COMERCIAL AUTOMÁTICO';
          break;
        case '2':
          currentMode = 'COMERCIAL ESCLUSA';
          break;
        case '3':
          currentMode = 'HORARIO EXTENDIDO';
          break;
        case '4':
          currentMode = 'CARGA DE CAJERO';
          break;
        case '5':
          currentMode = 'EMERGENCIA';
          break;
        default:
          currentMode = 'COMERCIAL AUTOMÁTICO';
      }
    }

    // Procesar estado de puertas basado en las salidas digitales
    const doors = this.processDoorStatus(data.tags);
    
    // Detectar emergencia
    const emergencyActive = currentMode === 'EMERGENCIA' || 
                           data.Alarms.some(alarm => alarm.pri === 0); // Prioridad 0 = emergencia

    return {
      mode: currentMode,
      doors,
      emergencyActive,
      connectionStatus: this.connectionStatus,
      lastSync: new Date().toISOString(),
      tags: data.tags,
      alarms: data.Alarms,
      events: data.Events,
    };
  }

  // Procesar estado de puertas desde tags
  private processDoorStatus(tags: Tag[]): SystemStatus['doors'] {
    const doors: SystemStatus['doors'] = {
      P1: {
        id: 'P1',
        name: 'Puerta Calle',
        status: 'closed',
        locked: true,
        sensorActive: true,
        lastUpdate: new Date().toISOString(),
      },
      P2: {
        id: 'P2',
        name: 'Puerta Oficina',
        status: 'closed',
        locked: true,
        sensorActive: true,
        lastUpdate: new Date().toISOString(),
      },
    };

    // Mapeo de salidas digitales a puertas
    // Basado en el ejemplo de respuesta de la API
    const doorOutputs = {
      P1: ['smcse_do_01_01_01', 'smcse_do_01_01_02'], // Puerta Calle
      P2: ['smcse_do_01_01_03', 'smcse_do_01_01_04'], // Puerta Oficina
    };

    Object.entries(doorOutputs).forEach(([doorId, outputTags]) => {
      const doorKey = doorId as 'P1' | 'P2';
      
      // Buscar tags de salida para esta puerta
      const doorTags = tags.filter(tag => outputTags.includes(tag.tag));
      
      if (doorTags.length > 0) {
        // Determinar estado basado en las salidas
        const hasActiveOutput = doorTags.some(tag => tag.St === 1); // 1 = activo
        const hasOpenCommand = doorTags.some(tag => tag.v === '1'); // '1' = comando activo
        
        if (hasActiveOutput || hasOpenCommand) {
          doors[doorKey].status = 'open';
          doors[doorKey].locked = false;
        } else {
          doors[doorKey].status = 'closed';
          doors[doorKey].locked = true;
        }
      }
      
      // Verificar sensores (entradas digitales)
      const sensorTags = tags.filter(tag => 
        tag.tag.includes('smcse_di_') && tag.Tip === 0
      );
      
      doors[doorKey].sensorActive = sensorTags.some(tag => tag.St !== 128); // 128 = fallo comunicación
    });

    return doors;
  }

  // Obtener tags específicos
  async getTags(mSecCambio: number = 0, eventId: number = 0): Promise<ApiResponse | null> {
    try {
      if (this.sandboxMode) {
        // En sandbox, devolver datos simulados
        return {
          tags: [],
          Alarms: [],
          Events: [],
        };
      }

      if (!this.baseURL) {
        return null;
      }

      const apiUrl = `${this.baseURL}/gettags?mSecCambio=${mSecCambio}&id=${eventId}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': this.getBasicAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting tags:', error);
      return null;
    }
  }

  // Cambiar modo de operación
  async changeMode(mode: string): Promise<boolean> {
    try {
      // Modo sandbox: simular cambio de modo
      if (this.sandboxMode) {
        console.log(`🔧 SANDBOX MODE: Changing mode to ${mode}`);
        
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Actualizar estado simulado
        this.mockSystemStatus.mode = mode;
        this.mockSystemStatus.lastSync = new Date().toISOString();
        
        // Simular lógica específica por modo
        if (mode.includes('EMERGENCIA')) {
          this.mockSystemStatus.emergencyActive = true;
          this.mockSystemStatus.doors.P1.locked = false;
          this.mockSystemStatus.doors.P2.locked = false;
          this.mockSystemStatus.doors.P1.status = 'open';
          this.mockSystemStatus.doors.P2.status = 'open';
        } else if (mode.includes('CERRADO')) {
          this.mockSystemStatus.doors.P1.locked = true;
          this.mockSystemStatus.doors.P2.locked = true;
          this.mockSystemStatus.doors.P1.status = 'closed';
          this.mockSystemStatus.doors.P2.status = 'closed';
        } else if (mode.includes('CARGA CAJERO')) {
          this.mockSystemStatus.doors.P1.locked = true;
          this.mockSystemStatus.doors.P1.status = 'closed';
          this.mockSystemStatus.doors.P2.locked = false;
          this.mockSystemStatus.doors.P2.status = 'open';
        }
        
        console.log(`✅ SANDBOX: Mode changed successfully to ${mode}`);
        return true;
      }

      if (!this.baseURL) {
        console.warn('BaseURL not configured, cannot change mode');
        return false;
      }

      const modeRequest: ModeChangeRequest = {
        mode: mode,
        timestamp: new Date().toISOString(),
        operator: 'tablet-app',
      };

      const response = await fetch(`${this.baseURL}/api/modo`, {
        method: 'POST',
        headers: {
          'Authorization': this.getBasicAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modeRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Mode change result:', result);
      
      // Verificar que el cambio se aplicó correctamente
      await new Promise(resolve => setTimeout(resolve, 1000));
      const status = await this.getSystemStatus();
      
      return status?.mode === mode;
    } catch (error) {
      console.error('Error changing mode:', error);
      return false;
    }
  }

  // Activar/Desactivar modo emergencia
  async toggleEmergencyMode(activate: boolean): Promise<boolean> {
    try {
      // Modo sandbox: simular toggle emergencia
      if (this.sandboxMode) {
        console.log(`🔧 SANDBOX MODE: ${activate ? 'Activating' : 'Deactivating'} emergency mode`);
        
        // Simular delay de operación crítica
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Actualizar estado simulado
        this.mockSystemStatus.emergencyActive = activate;
        this.mockSystemStatus.lastSync = new Date().toISOString();
        
        if (activate) {
          // Modo emergencia: desbloquear todo
          this.mockSystemStatus.mode = 'EMERGENCIA';
          this.mockSystemStatus.doors.P1.locked = false;
          this.mockSystemStatus.doors.P2.locked = false;
          this.mockSystemStatus.doors.P1.status = 'open';
          this.mockSystemStatus.doors.P2.status = 'open';
          console.log('🚨 SANDBOX: Emergency mode ACTIVATED - All doors unlocked');
        } else {
          // Desactivar emergencia: volver a modo anterior
          this.mockSystemStatus.mode = 'COMERCIAL AUTOMATICO';
          this.mockSystemStatus.doors.P1.locked = true;
          this.mockSystemStatus.doors.P2.locked = true;
          this.mockSystemStatus.doors.P1.status = 'closed';
          this.mockSystemStatus.doors.P2.status = 'closed';
          console.log('✅ SANDBOX: Emergency mode DEACTIVATED - Doors secured');
        }
        
        return true;
      }

      if (!this.baseURL) {
        console.warn('BaseURL not configured, cannot toggle emergency mode');
        return false;
      }

      const emergencyRequest = {
        emergency: activate,
        timestamp: new Date().toISOString(),
        operator: 'tablet-app',
        reason: activate ? 'Manual activation from tablet' : 'Manual deactivation from tablet',
      };

      const response = await fetch(`${this.baseURL}/api/emergencia`, {
        method: 'POST',
        headers: {
          'Authorization': this.getBasicAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emergencyRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Emergency mode result:', result);
      
      return true;
    } catch (error) {
      console.error('Error toggling emergency mode:', error);
      return false;
    }
  }

  // Control manual de puertas
  async controlDoor(doorId: 'P1' | 'P2' | 'P3' | 'P4', action: 'open' | 'close'): Promise<boolean> {
    try {
      // Modo sandbox: simular control de puerta
      if (this.sandboxMode) {
        console.log(`🔧 SANDBOX MODE: ${action}ing door ${doorId}`);
        
        // Simular delay de operación mecánica
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Actualizar estado de la puerta específica
        const door = this.mockSystemStatus.doors[doorId];
        if (door) {
          if (action === 'open') {
            door.status = 'opening';
            door.locked = false;
            
            // Simular apertura completa después de un delay
            setTimeout(() => {
              door.status = 'open';
              door.lastUpdate = new Date().toISOString();
            }, 2000);
          } else {
            door.status = 'closing';
            
            // Simular cierre completo después de un delay
            setTimeout(() => {
              door.status = 'closed';
              door.locked = true;
              door.lastUpdate = new Date().toISOString();
            }, 2000);
          }
        }
        
        this.mockSystemStatus.lastSync = new Date().toISOString();
        console.log(`✅ SANDBOX: Door ${doorId} ${action} command executed`);
        return true;
      }

      if (!this.baseURL) {
        console.warn('BaseURL not configured, cannot control door');
        return false;
      }

      const controlRequest = {
        door: doorId,
        action: action,
        timestamp: new Date().toISOString(),
        operator: 'tablet-app',
      };

      const response = await fetch(`${this.baseURL}/api/control`, {
        method: 'POST',
        headers: {
          'Authorization': this.getBasicAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(controlRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success === true;
    } catch (error) {
      console.error('Error controlling door:', error);
      return false;
    }
  }

  // Verificar actualizaciones
  async checkForUpdates(): Promise<{ hasUpdate: boolean; version?: string; downloadUrl?: string }> {
    try {
      // Modo sandbox: simular verificación de actualizaciones
      if (this.sandboxMode) {
        console.log('🔧 SANDBOX MODE: Checking for updates');
        
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simular que hay una actualización disponible (50% de probabilidad)
        const hasUpdate = Math.random() > 0.5;
        
        if (hasUpdate) {
          console.log('📦 SANDBOX: Update available - v2.1.0');
          return {
            hasUpdate: true,
            version: '2.1.0',
            downloadUrl: 'http://192.168.1.100/updates/nueva_version.apk'
          };
        } else {
          console.log('✅ SANDBOX: No updates available');
          return { hasUpdate: false };
        }
      }

      if (!this.config?.updateServerURL) {
        return { hasUpdate: false };
      }

      if (!this.baseURL) {
        console.warn('BaseURL not configured, cannot check for updates');
        return { hasUpdate: false };
      }

      const response = await fetch(`${this.config.updateServerURL}/version.json`, {
        method: 'GET',
        timeout: 5000,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const versionInfo = await response.json();
      const currentVersion = await this.getCurrentVersion();
      
      const hasUpdate = versionInfo.version !== currentVersion;
      
      return {
        hasUpdate,
        version: versionInfo.version,
        downloadUrl: hasUpdate ? `${this.config.updateServerURL}/nueva_version.apk` : undefined,
      };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { hasUpdate: false };
    }
  }

  // Validación de dispositivo (Device Binding)
  async validateDevice(): Promise<boolean> {
    try {
      // En modo sandbox, siempre validar como autorizado
      if (this.sandboxMode) {
        console.log('🔧 SANDBOX MODE: Device validation - AUTHORIZED');
        return true;
      }

      // Allow access during initial setup or development
      if (!this.config || this.config.deviceId === 'device_id_placeholder') {
        return true;
      }

      // En un entorno real, esto obtendría el ID del dispositivo Android
      const deviceId = await this.getDeviceId();
      
      // Allow access if device ID is placeholder (development/sandbox)
      if (deviceId === 'device_id_placeholder') {
        return true;
      }
      
      if (!this.config?.deviceId) {
        return false;
      }

      return deviceId === this.config.deviceId;
    } catch (error) {
      console.error('Error validating device:', error);
      return false;
    }
  }

  // Métodos privados
  private async loadConfiguration(): Promise<void> {
    try {
      const configStr = await AsyncStorage.getItem('door_control_config');
      if (configStr) {
        this.config = JSON.parse(configStr);
        if (this.config) {
          this.baseURL = `https://${this.config.serverIP}:${this.config.apiPort}`;
          this.apiUsername = this.config.apiUsername;
          this.apiPassword = this.config.apiPassword;
        }
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  }

  private async saveConfiguration(config: ConfigurationData): Promise<void> {
    try {
      await AsyncStorage.setItem('door_control_config', JSON.stringify(config));
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  }

  private async testConnection(): Promise<boolean> {
    try {
      if (!this.baseURL) {
        return false;
      }

      const response = await fetch(`${this.baseURL}/api/ping`, {
        method: 'GET',
        headers: {
          'Authorization': this.getBasicAuthHeader(),
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private startStatusMonitoring(): void {
    // Monitoreo cada 5 segundos
    this.statusCheckInterval = setInterval(async () => {
      await this.getSystemStatus();
    }, 5000);
  }

  private async getCurrentVersion(): Promise<string> {
    // Versión actual de la app
    return this.sandboxMode ? '2.0.0-sandbox' : '1.0.0';
  }

  private async getDeviceId(): Promise<string> {
    // ID del dispositivo
    return this.sandboxMode ? 'sandbox_device_001' : 'device_id_placeholder';
  }

  // Método para alternar entre modo sandbox y producción
  setSandboxMode(enabled: boolean): void {
    this.sandboxMode = enabled;
    console.log(`🔧 Sandbox mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    if (enabled) {
      this.connectionStatus = 'online';
    }
  }

  // Cleanup
  destroy(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
  }
}

// Export the class for instantiation
export { DoorControlService };