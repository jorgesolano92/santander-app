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

export interface SDIO12Tag {
  tag: string;
  St: number;
  v: string;
}

export interface SDIO12Response {
  nModulos: number;
  tags: SDIO12Tag[];
}

export interface ApiResponse {
  tags: Tag[];
  Alarms: Alarm[];
  Events: Event[];
}

export interface ModeChangeRequest {
  mode: number;
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

// Mapeo de nombres de modo a números INI según especificación del cliente
const modeNameToIniMap: { [key: string]: number } = {
  'COMERCIAL AUTOMATICO': 1,      // INI1 = Automático
  'COMERCIAL AUTOMÁTICO': 1,      // Variante con acento
  'COMERCIAL ESCLUSA': 2,         // INI2 = Exclusa
  'HORARIO EXTENDIDO': 3,         // INI3 = Extendido
  'HORARIO AUTOSERVICIO': 4,      // INI4 = Autoservicio
  'OFICINA CERRADA': 5,           // INI5 = Oficina Cerrada
  'CARGA DE CAJERO': 6,           // INI6 = Carga Cajero
  'CARGA CAJERO': 6,              // Variante sin "DE"
  'MANUAL': 7,                    // INI7 = Manual
  'EMERGENCIA': 8,                // INI8 = Emergencia
};

// Mapeo inverso de números INI a nombres de modo
const iniToModeNameMap: { [key: number]: string } = {
  1: 'COMERCIAL AUTOMÁTICO',
  2: 'COMERCIAL ESCLUSA',
  3: 'HORARIO EXTENDIDO',
  4: 'HORARIO AUTOSERVICIO',
  5: 'OFICINA CERRADA',
  6: 'CARGA DE CAJERO',
  7: 'MANUAL',
  8: 'EMERGENCIA',
};

class DoorControlService {
  private baseURL: string = '';
  private apiUsername: string = '';
  private apiPassword: string = '';
  private config: ConfigurationData | null = null;
  private connectionStatus: 'online' | 'offline' = 'offline';
  private statusCheckInterval: ReturnType<typeof setInterval> | null = null;
  private sandboxMode: boolean = false; // Modo sandbox deshabilitado permanentemente
  private mockSystemStatus: SystemStatus;
  private lastEventId: number = 0;
  private lastChangeTime: number = 0;
  private statusChangeCallback: (() => void) | null = null;
  private verifyingDoors: Set<string> = new Set();

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
      
      // Verificar conexión - DESHABILITADO
      // const isConnected = await this.testConnection();
      // this.connectionStatus = isConnected ? 'online' : 'offline';
      this.connectionStatus = 'online'; // Siempre online
      
      return true; // Siempre retorna true (modo online)
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

  // Registrar callback para notificar cambios de estado
  onStatusChange(callback: () => void) {
    this.statusChangeCallback = callback;
  }

  // Notificar cambio de estado
  private notifyStatusChange() {
    if (this.statusChangeCallback) {
      this.statusChangeCallback();
    }
  }

  // Verificar si una puerta está siendo verificada
  isDoorVerifying(doorId: string): boolean {
    return this.verifyingDoors.has(doorId);
  }

  /**
   * Consultar el estado inicial de todas las puertas configuradas
   * Hace UNA SOLA petición GET que trae todos los tags
   */
  async refreshAllDoorsStatus(): Promise<boolean> {
    try {
      console.log('🔄 Consultando estado inicial de todas las puertas...');
      
      // Cargar la configuración de puertas desde AsyncStorage
      const savedConfig = await AsyncStorage.getItem('new_door_config');
      if (!savedConfig) {
        console.warn('⚠️ No hay configuración de puertas guardada');
        return false;
      }

      const config = JSON.parse(savedConfig);
      if (!config.doors) {
        console.warn('⚠️ Configuración de puertas no válida');
        return false;
      }

      // Buscar solo puertas habilitadas
      const enabledDoors = config.doors.filter((door: any) => door.enabled);
      
      if (enabledDoors.length === 0) {
        console.warn('⚠️ No hay puertas habilitadas');
        return false;
      }

      console.log(`📋 Consultando estado de ${enabledDoors.length} puertas habilitadas`);

      // Usar la configuración de la primera puerta para hacer UNA SOLA petición
      const firstDoor = enabledDoors[0];
      
      if (!firstDoor.ipExterior || 
          !firstDoor.intercom?.doorControlUsername || 
          !firstDoor.intercom?.doorControlPassword) {
        console.warn('⚠️ Configuración SDIO12 incompleta en primera puerta');
        return false;
      }

      const { doorControlUsername, doorControlPassword } = firstDoor.intercom;
      const controllerIP = firstDoor.ipExterior;

      // Hacer UNA SOLA petición GET que trae TODOS los tags
      const sdioResponse = await this.getSDIO12Status(
        controllerIP,
        doorControlUsername,
        doorControlPassword
      );

      if (!sdioResponse) {
        console.error('❌ No se pudo obtener el estado SDIO12');
        return false;
      }

      console.log(`📊 Respuesta SDIO12: ${sdioResponse.nModulos} módulos, ${sdioResponse.tags.length} tags`);

      // Filtrar solo los tags de salidas digitales (smcse_do)
      const doorTags = sdioResponse.tags.filter(tag => tag.tag.startsWith('smcse_do_'));
      console.log(`🚪 Tags de puertas encontrados: ${doorTags.length}`);

      // Actualizar el estado de cada puerta habilitada
      let updatedCount = 0;
      enabledDoors.forEach((door: any, index: number) => {
        const doorId = `P${index + 1}` as 'P1' | 'P2' | 'P3' | 'P4';
        
        if (!door.intercom?.doorControlPCB || !door.intercom?.doorControlSwitch) {
          console.warn(`⚠️ ${doorId}: PCB/Switch no configurados`);
          return;
        }

        const { doorControlPCB, doorControlSwitch } = door.intercom;
        const tag = this.buildSDIO12Tag(doorControlPCB, doorControlSwitch);
        
        // Buscar el tag correspondiente en la respuesta
        const switchTag = doorTags.find(t => t.tag === tag);
        
        if (switchTag) {
          const doorStatus = this.mockSystemStatus.doors[doorId];
          if (doorStatus) {
            const isOpen = switchTag.St === 1 || switchTag.v === '1';
            doorStatus.status = isOpen ? 'open' : 'closed';
            doorStatus.locked = !isOpen;
            doorStatus.lastUpdate = new Date().toISOString();
            
            console.log(`✅ ${doorId} (${tag}): ${doorStatus.status} (St=${switchTag.St}, v=${switchTag.v})`);
            updatedCount++;
          }
        } else {
          console.warn(`⚠️ ${doorId}: Tag ${tag} no encontrado en respuesta`);
        }
      });

      this.mockSystemStatus.lastSync = new Date().toISOString();
      this.notifyStatusChange(); // Notificar para actualizar UI
      
      console.log(`✅ Estado actualizado para ${updatedCount}/${enabledDoors.length} puertas`);
      return true;
    } catch (error) {
      console.error('❌ Error refrescando estado de puertas:', error);
      return false;
    }
  }

  /**
   * Probar conexión al intercomunicador (Axis o IDIS)
   * @param ip IP del intercomunicador
   * @param username Usuario de acceso
   * @param password Contraseña
   * @param deviceType Tipo de dispositivo ('axis' o 'idis')
   */
  async testAxisIntercomConnection(ip: string, username: string, password: string, deviceType: 'axis' | 'idis' = 'idis'): Promise<{
    success: boolean;
    message: string;
    deviceInfo?: any;
    error?: string;
  }> {
    try {
      console.log(`🔍 Probando conexión al intercomunicador ${deviceType.toUpperCase()} en ${ip}...`);
      console.log(`👤 Usuario: ${username}`);
      console.log(`🔐 Contraseña: ${password.substring(0, 3)}***`);
      console.log(`🏷️ Tipo: ${deviceType}`);
      
      // Primero probar sin autenticación para ver si el dispositivo responde
      console.log(`🌐 Probando conectividad básica...`);
      try {
        const isWeb = typeof window !== 'undefined';
        const basicUrl = isWeb 
          ? `http://localhost:3001/${deviceType}/${ip}/`
          : `https://${ip}/`;
        
        const basicResponse = await fetch(basicUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          ...(isWeb && { mode: 'cors' })
        });
        
        console.log(`📡 Conectividad básica: ${basicResponse.status} ${basicResponse.statusText}`);
      } catch (basicError) {
        console.log(`❌ Sin conectividad básica: ${basicError}`);
      }
      
      // Crear headers de autenticación básica
      const authHeader = this.getSDIO12AuthHeader(username, password);
      console.log(`🔑 Auth header generado: ${authHeader.substring(0, 20)}...`);
      
      // Verificar que las credenciales sean correctas
      const expectedAuth = `Basic ${btoa(`${username}:${password}`)}`;
      console.log(`🔍 Auth esperado: ${expectedAuth.substring(0, 20)}...`);
      console.log(`✅ Auth coincide: ${authHeader === expectedAuth}`);
      
      // Probar diferentes endpoints según el tipo de dispositivo
      const testEndpoints = deviceType === 'axis' ? [
        '/',                                    // Página principal (sin auth)
        '/index.html',                          // Página de inicio
        '/axis-cgi/param.cgi?action=list&group=Properties', // Información básica Axis
        '/axis-cgi/param.cgi?action=list&group=System',     // Sistema
        '/axis-cgi/param.cgi?action=list&group=Network',    // Red
        '/axis-cgi/param.cgi?action=list&group=IO',         // Entradas/Salidas
      ] : [
        '/',                           // Página principal (sin auth)
        '/index.html',                 // Página de inicio
        '/cgi-bin/admin/getparam.cgi', // Información básica IDIS
        '/cgi-bin/admin/status.cgi',   // Estado del sistema
        '/cgi-bin/admin/version.cgi',  // Versión del firmware
        '/cgi-bin/admin/network.cgi',  // Configuración de red
      ];

      const results = [];
      
      for (const endpoint of testEndpoints) {
        try {
          // Para desarrollo web, usar proxy para evitar CORS
          const isWeb = typeof window !== 'undefined';
          const url = isWeb 
            ? `http://localhost:3001/${deviceType}/${ip}${endpoint}`
            : `https://${ip}${endpoint}`;
          
          console.log(`📡 Probando: ${url}`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            // Para desarrollo web, usar proxy si es necesario
            ...(isWeb && {
              mode: 'cors',
            })
          });

          if (response.ok) {
            const data = await response.text();
            console.log(`✅ ${endpoint}: OK`);
            results.push({
              endpoint,
              status: response.status,
              data: data.substring(0, 200) + '...' // Solo primeros 200 caracteres
            });
          } else {
            console.log(`❌ ${endpoint}: ${response.status} ${response.statusText}`);
            results.push({
              endpoint,
              status: response.status,
              error: response.statusText
            });
          }
        } catch (error) {
          console.log(`❌ ${endpoint}: Error - ${error}`);
          results.push({
            endpoint,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }

      // Si al menos un endpoint funcionó, consideramos la conexión exitosa
      const successfulEndpoints = results.filter(r => r.status && r.status < 400);
      
      if (successfulEndpoints.length > 0) {
        console.log(`✅ Conexión exitosa: ${successfulEndpoints.length}/${testEndpoints.length} endpoints respondieron`);
        
        return {
          success: true,
          message: `Conexión exitosa al intercomunicador Axis I8116-E en ${ip}`,
          deviceInfo: {
            ip,
            username,
            endpointsTested: testEndpoints.length,
            successfulEndpoints: successfulEndpoints.length,
            results
          }
        };
      } else {
        return {
          success: false,
          message: `No se pudo conectar al intercomunicador Axis en ${ip}`,
          error: 'Todos los endpoints fallaron'
        };
      }
      
    } catch (error) {
      console.error('❌ Error probando conexión Axis:', error);
      return {
        success: false,
        message: `Error conectando al intercomunicador Axis en ${ip}`,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Obtener estado actual del sistema - MODO ONLINE PERMANENTE
  async getSystemStatus(): Promise<SystemStatus | null> {
    try {
      // Siempre devolver estado simulado (modo online permanente)
      console.log('🔧 Sistema en modo ONLINE permanente - usando datos simulados');
      return { ...this.mockSystemStatus }; // Retornar copia para evitar mutaciones
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

  // Obtener tags específicos - DESHABILITADO
  // async getTags(mSecCambio: number = 0, eventId: number = 0): Promise<ApiResponse | null> {
  //   try {
  //     if (this.sandboxMode) {
  //       // En sandbox, devolver datos simulados
  //       return {
  //         tags: [],
  //         Alarms: [],
  //         Events: [],
  //       };
  //     }

  //     if (!this.baseURL) {
  //       return null;
  //     }

  //     const apiUrl = `${this.baseURL}/gettags?mSecCambio=${mSecCambio}&id=${eventId}`;
      
  //     const response = await fetch(apiUrl, {
  //       method: 'GET',
  //       headers: {
  //         'Authorization': this.getBasicAuthHeader(),
  //         'Content-Type': 'application/json',
  //       },
  //     });

  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }

  //     return await response.json();
  //   } catch (error) {
  //     console.error('Error getting tags:', error);
  //     return null;
  //   }
  // }

  // Cambiar modo de operación
  async changeMode(mode: string): Promise<boolean> {
    try {
      // Obtener el número INI correspondiente al modo
      const iniNumber = modeNameToIniMap[mode.toUpperCase()];
      
      if (iniNumber === undefined) {
        console.error(`❌ Modo no válido: ${mode}. Modos disponibles:`, Object.keys(modeNameToIniMap));
        return false;
      }
      
      // Modo sandbox: simular cambio de modo
      if (this.sandboxMode) {
        console.log(`🔧 SANDBOX MODE: Changing mode to ${mode} (INI${iniNumber})`);
        
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Actualizar estado simulado
        this.mockSystemStatus.mode = iniToModeNameMap[iniNumber] || mode;
        this.mockSystemStatus.lastSync = new Date().toISOString();
        
        // Simular lógica específica por modo
        if (iniNumber === 8) { // INI8 = EMERGENCIA
          this.mockSystemStatus.emergencyActive = true;
          this.mockSystemStatus.doors.P1.locked = false;
          this.mockSystemStatus.doors.P2.locked = false;
          this.mockSystemStatus.doors.P1.status = 'open';
          this.mockSystemStatus.doors.P2.status = 'open';
        } else if (iniNumber === 5) { // INI5 = OFICINA CERRADA
          this.mockSystemStatus.doors.P1.locked = true;
          this.mockSystemStatus.doors.P2.locked = true;
          this.mockSystemStatus.doors.P1.status = 'closed';
          this.mockSystemStatus.doors.P2.status = 'closed';
        } else if (iniNumber === 6) { // INI6 = CARGA CAJERO
          this.mockSystemStatus.doors.P1.locked = true;
          this.mockSystemStatus.doors.P1.status = 'closed';
          this.mockSystemStatus.doors.P2.locked = false;
          this.mockSystemStatus.doors.P2.status = 'open';
        } else {
          // Restablecer emergencia para otros modos
          this.mockSystemStatus.emergencyActive = false;
        }
        
        console.log(`✅ SANDBOX: Mode changed successfully to ${mode} (INI${iniNumber})`);
        return true;
      }

      if (!this.baseURL) {
        console.warn('BaseURL not configured, cannot change mode');
        return false;
      }

      const modeRequest: ModeChangeRequest = {
        mode: iniNumber,
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
      
      return status?.mode === iniToModeNameMap[iniNumber];
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

  // Control manual de puertas usando SDIO12
  async controlDoor(doorId: 'P1' | 'P2' | 'P3' | 'P4', action: 'open' | 'close'): Promise<boolean> {
    try {
      console.log(`🚪 Intentando ${action === 'open' ? 'abrir' : 'cerrar'} ${doorId}`);
      
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

      // Cargar la configuración de puertas desde AsyncStorage
      const savedConfig = await AsyncStorage.getItem('new_door_config');
      if (!savedConfig) {
        console.error('❌ No hay configuración de puertas guardada');
        return false;
      }

      const config = JSON.parse(savedConfig);
      if (!config.doors) {
        console.error('❌ Configuración de puertas no válida');
        return false;
      }

      // Obtener índice de puerta (P1 = 0, P2 = 1, etc.)
      const doorIndex = parseInt(doorId.replace('P', '')) - 1;
      
      // Buscar solo entre las puertas habilitadas
      const enabledDoors = config.doors.filter((door: any) => door.enabled);
      const doorConfig = enabledDoors[doorIndex];

      if (!doorConfig) {
        console.error(`❌ Configuración no encontrada para puerta habilitada ${doorId}`);
        return false;
      }

      // Verificar que tenga configuración SDIO12
      if (!doorConfig.ipExterior || 
          !doorConfig.intercom?.doorControlUsername || 
          !doorConfig.intercom?.doorControlPassword) {
        console.error(`❌ Configuración SDIO12 incompleta para ${doorId}`);
        return false;
      }

      const { doorControlUsername, doorControlPassword, doorControlPCB, doorControlSwitch } = doorConfig.intercom;
      const controllerIP = doorConfig.ipExterior; // Usar la IP Exterior de la puerta

      console.log(`🔧 Usando configuración SDIO12:`, {
        ip: controllerIP,
        pcb: doorControlPCB,
        switch: doorControlSwitch,
        tag: this.buildSDIO12Tag(doorControlPCB, doorControlSwitch)
      });

      // Llamar al método SDIO12
      const success = await this.controlSDIO12Switch(
        controllerIP,
        doorControlUsername,
        doorControlPassword,
        doorControlPCB,
        doorControlSwitch,
        action
      );

      if (success) {
        console.log(`✅ Puerta ${doorId} ${action === 'open' ? 'abierta' : 'cerrada'} exitosamente`);
        
        // Marcar que se está verificando el estado
        this.verifyingDoors.add(doorId);
        this.notifyStatusChange(); // Notificar para mostrar loader
        
        // Consultar el estado real desde SDIO12 después de 1 segundo
        setTimeout(async () => {
          try {
            const realStatus = await this.getSDIO12SwitchStatus(
              controllerIP,
              doorControlUsername,
              doorControlPassword,
              doorControlPCB,
              doorControlSwitch
            );
            
            if (realStatus) {
              const door = this.mockSystemStatus.doors[doorId];
              if (door) {
                door.status = realStatus.isOpen ? 'open' : 'closed';
                door.locked = !realStatus.isOpen;
                door.lastUpdate = new Date().toISOString();
                this.mockSystemStatus.lastSync = new Date().toISOString();
                
                console.log(`🔄 Estado real actualizado para ${doorId}:`, {
                  status: door.status,
                  locked: door.locked,
                  St: realStatus.St,
                  v: realStatus.v
                });
              }
            }
          } catch (error) {
            console.error(`❌ Error consultando estado real de ${doorId}:`, error);
          } finally {
            // Remover de la lista de verificación
            this.verifyingDoors.delete(doorId);
            this.notifyStatusChange(); // Notificar para ocultar loader
          }
        }, 1000);
      }

      return success;
    } catch (error) {
      console.error(`❌ Error controlando puerta ${doorId}:`, error);
      return false;
    }
  }

  // ========== MÉTODOS PARA CONTROL DE PUERTAS SDIO12 ==========
  
  /**
   * Construir el tag SDIO12 basado en PCB y Switch
   * Formato: smcse_do_01_{PCB}_{SWITCH}
   */
  private buildSDIO12Tag(pcb: number, switchNum: number): string {
    const pcbStr = pcb.toString().padStart(2, '0');
    const switchStr = switchNum.toString().padStart(2, '0');
    return `smcse_do_01_${pcbStr}_${switchStr}`;
  }

  /**
   * Generar header de autenticación BASIC para SDIO12
   */
  private getSDIO12AuthHeader(username: string, password: string): string {
    const credentials = `${username}:${password}`;
    // Usar btoa en navegador (disponible globalmente)
    const encoded = btoa(credentials);
    return `Basic ${encoded}`;
  }

  /**
   * Obtener el estado actual de todos los switches SDIO12
   * GET https://{ip}/sdio12
   */
  async getSDIO12Status(ip: string, username: string, password: string): Promise<SDIO12Response | null> {
    try {
      // Usar proxy en desarrollo web para evitar CORS
      const isWeb = typeof window !== 'undefined' && window.location?.protocol === 'http:';
      const url = isWeb 
        ? `http://localhost:3001/sdio12/${ip}` 
        : `https://${ip}/sdio12`;
      
      console.log(`🔍 Consultando estado SDIO12: ${url}${isWeb ? ' (vía proxy)' : ''}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getSDIO12AuthHeader(username, password),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SDIO12Response = await response.json();
      console.log(`✅ Estado SDIO12 obtenido: ${data.nModulos} módulos, ${data.tags.length} tags`);
      
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo estado SDIO12:', error);
      return null;
    }
  }

  /**
   * Obtener el estado de un switch específico
   * Retorna: { St: number, v: string, isOpen: boolean }
   */
  async getSDIO12SwitchStatus(
    ip: string, 
    username: string, 
    password: string,
    pcb: number, 
    switchNum: number
  ): Promise<{ St: number; v: string; isOpen: boolean } | null> {
    try {
      const data = await this.getSDIO12Status(ip, username, password);
      if (!data) return null;

      const tag = this.buildSDIO12Tag(pcb, switchNum);
      const switchTag = data.tags.find(t => t.tag === tag);

      if (!switchTag) {
        console.warn(`⚠️ Switch no encontrado: ${tag}`);
        return null;
      }

      const isOpen = switchTag.St === 1 || switchTag.v === '1';
      
      console.log(`🔍 Estado del switch ${tag}: St=${switchTag.St}, v=${switchTag.v}, isOpen=${isOpen}`);
      
      return {
        St: switchTag.St,
        v: switchTag.v,
        isOpen
      };
    } catch (error) {
      console.error('❌ Error obteniendo estado del switch:', error);
      return null;
    }
  }

  /**
   * Controlar un switch SDIO12 específico (abrir/cerrar puerta)
   * POST https://{ip}/sdio12
   * St: 1001 = activar (abrir), 1000 = desactivar (cerrar)
   */
  async controlSDIO12Switch(
    ip: string,
    username: string,
    password: string,
    pcb: number,
    switchNum: number,
    action: 'open' | 'close'
  ): Promise<boolean> {
    try {
      // Usar proxy en desarrollo web para evitar CORS
      const isWeb = typeof window !== 'undefined' && window.location?.protocol === 'http:';
      const url = isWeb 
        ? `http://localhost:3001/sdio12/${ip}` 
        : `https://${ip}/sdio12`;
      
      const tag = this.buildSDIO12Tag(pcb, switchNum);
      const St = action === 'open' ? 1001 : 1000;
      const v = action === 'open' ? '1' : '0';

      const requestBody = {
        tags: [
          {
            tag,
            St,
            v
          }
        ]
      };

      const bodyString = JSON.stringify(requestBody);
      
      console.log(`🚪 ${action === 'open' ? 'Abriendo' : 'Cerrando'} puerta${isWeb ? ' (vía proxy)' : ''}:`, {
        url,
        tag,
        St,
        v,
        body: bodyString
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.getSDIO12AuthHeader(username, password),
          'Content-Type': 'application/json', // Intentar con application/json
        },
        body: bodyString,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Comando SDIO12 ejecutado exitosamente:`, result);
      
      return true;
    } catch (error) {
      console.error('❌ Error controlando switch SDIO12:', error);
      return false;
    }
  }

  /**
   * Obtener todos los switches SDIO de tipo "smcse_do" (digital outputs)
   * Filtra solo los tags que controlan puertas
   */
  async getSDIO12DoorSwitches(ip: string, username: string, password: string): Promise<SDIO12Tag[]> {
    try {
      const data = await this.getSDIO12Status(ip, username, password);
      if (!data) return [];

      // Filtrar solo los tags de salida digital (smcse_do)
      const doorSwitches = data.tags.filter(tag => tag.tag.startsWith('smcse_do_'));
      
      console.log(`🔍 Switches de puertas encontrados: ${doorSwitches.length}`);
      
      return doorSwitches;
    } catch (error) {
      console.error('❌ Error obteniendo switches de puertas:', error);
      return [];
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
      // Always authorize in development mode
      if (__DEV__) {
        console.log('🔧 DEV MODE: Device validation bypassed - AUTHORIZED');
        return true;
      }

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

  // Función de ping deshabilitada
  // private async testConnection(): Promise<boolean> {
  //   try {
  //     if (!this.baseURL) {
  //       return false;
  //     }

  //     const response = await fetch(`${this.baseURL}/api/ping`, {
  //       method: 'GET',
  //       headers: {
  //         'Authorization': this.getBasicAuthHeader(),
  //       },
  //     });
  //     return response.ok;
  //   } catch (error) {
  //     return false;
  //   }
  // }

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

  // Método para alternar entre modo sandbox y producción - DESHABILITADO
  // setSandboxMode(enabled: boolean): void {
  //   this.sandboxMode = enabled;
  //   console.log(`🔧 Sandbox mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
  //   
  //   if (enabled) {
  //     this.connectionStatus = 'online';
  //   }
  // }

  // Cleanup
  destroy(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
  }
}

// Create and export singleton instance
const doorControlService = new DoorControlService();

// Export both the class and singleton instance
export { DoorControlService, doorControlService };