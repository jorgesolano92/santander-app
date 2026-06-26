import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import axios from 'axios';
import { emergencyService, EmergencyConfig } from './EmergencyService';

/** Evita que la UI quede en "Procesando..." si el backend/panel no responde. */
const API_FETCH_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = API_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout (${timeoutMs}ms) al conectar con ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// Importar RNFetchBlob solo en React Native (no en web)
let RNFetchBlob: any = null;
if (Platform.OS !== 'web') {
  try {
    RNFetchBlob = require('rn-fetch-blob').default || require('rn-fetch-blob');
    console.log('✅ RNFetchBlob cargado correctamente');
  } catch (error) {
    console.log('⚠️ RNFetchBlob no disponible en este entorno:', error);
  }
}

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
  emergencyConfigured?: boolean;
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

// Mapeo de nombres de modo a claves de configuración
const modeNameToConfigKeyMap: { [key: string]: string } = {
  'COMERCIAL AUTOMATICO': 'automatico',
  'COMERCIAL AUTOMÁTICO': 'automatico',      // Variante con acento
  'COMERCIAL ESCLUSA': 'esclusa',            // Exclusa
  'HORARIO EXTENDIDO': 'extendido',          // Extendido
  'HORARIO AUTOSERVICIO': 'autoservicio',    // Autoservicio
  'OFICINA CERRADA': 'oficinaCerrada',       // Oficina Cerrada
  'CARGA DE CAJERO': 'cargaCajero',          // Carga Cajero
  'CARGA CAJERO': 'cargaCajero',             // Variante sin "DE"
  'MANUAL': 'manual',                        // Manual
  'EMERGENCIA': 'emergencia',                // Emergencia (no se configura aquí)
};

const TABLET_BEARER_TOKEN_KEY = 'tablet_bearer_token';

// Mapeo de nombres de modo a números INI según especificación del cliente (para compatibilidad)
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

// Mapeo de valores de modo (texto de API) a nombres de modo internos
const apiModeValueToModeNameMap: { [key: string]: string } = {
  'Automatico': 'COMERCIAL AUTOMÁTICO',
  'Automático': 'COMERCIAL AUTOMÁTICO',
  'Esclusa': 'COMERCIAL ESCLUSA',
  'Extendido': 'HORARIO EXTENDIDO',
  'Autoservicio': 'HORARIO AUTOSERVICIO',
  'Cerrado': 'OFICINA CERRADA',
  'Carga': 'CARGA DE CAJERO',
  'Carga Cajero': 'CARGA DE CAJERO',
  'Carga de Cajero': 'CARGA DE CAJERO',
  'Manual': 'MANUAL',
  'Emergencia': 'EMERGENCIA',
};

// Mapeo inverso: nombres de modo a valores de API
const modeNameToApiValueMap: { [key: string]: string } = {
  'COMERCIAL AUTOMÁTICO': 'Automatico',
  'COMERCIAL AUTOMATICO': 'Automatico',
  'COMERCIAL ESCLUSA': 'Esclusa',
  'HORARIO EXTENDIDO': 'Extendido',
  'HORARIO AUTOSERVICIO': 'Autoservicio',
  'OFICINA CERRADA': 'Cerrado',
  'CARGA DE CAJERO': 'Carga',
  'CARGA CAJERO': 'Carga',
  'MANUAL': 'Manual',
  'EMERGENCIA': 'Emergencia',
};

// Mapeo de nombres de modo a valores numéricos para el tag Srv_Horario_2
const modeNameToNumericValueMap: { [key: string]: string } = {
  'COMERCIAL AUTOMÁTICO': '1',
  'COMERCIAL AUTOMATICO': '1',
  'COMERCIAL ESCLUSA': '2',
  'HORARIO EXTENDIDO': '3',
  'HORARIO AUTOSERVICIO': '4',
  'OFICINA CERRADA': '5',
  'CARGA DE CAJERO': '6',
  'CARGA CAJERO': '6',
  'MANUAL': '7',
  'EMERGENCIA': '8',
};

/** Resultado de operaciones contra el API del panel para mostrar feedback al usuario. */
export type PanelApiResult =
  | { ok: true; queued?: false }
  | {
      ok: true;
      queued: true;
      pendingRuleKey: string;
      blockedInputs?: string[];
      queueMessage?: string;
    }
  | { ok: false; errorMessage: string };

export type PanelModeStatus = {
  currentRuleKey: string | null;
  pendingRuleKey: string | null;
};

class DoorControlService {
  private baseURL: string = '';
  private apiUsername: string = '';
  private apiPassword: string = '';
  private config: ConfigurationData | null = null;
  private connectionStatus: 'online' | 'offline' = 'offline';
  private statusCheckInterval: ReturnType<typeof setInterval> | null = null;
  private sandboxMode: boolean = false; // Modo sandbox deshabilitado - conexión real al servidor
  private mockSystemStatus: SystemStatus;
  private lastEventId: number = 0;
  private lastChangeTime: number = 0;
  private statusChangeCallback: (() => void) | null = null;
  private verifyingDoors: Set<string> = new Set();
  private bearerToken: string | null = null;

  /** Interpreta cuerpo JSON de error de FastAPI u otros formatos habituales. */
  private formatPanelApiErrorMessage(status: number, bodyText: string): string {
    const fallback =
      (bodyText && bodyText.trim()) || `Error del servidor (${status}).`;
    try {
      const json = JSON.parse(bodyText) as Record<string, unknown>;
      const raw =
        json.detail !== undefined && typeof json.detail === 'object' && json.detail !== null
          ? (json.detail as Record<string, unknown>)
          : json;
      if (typeof raw === 'string') {
        return raw;
      }
      if (raw && typeof raw === 'object') {
        const reason = raw.reason != null ? String(raw.reason) : '';
        const message = raw.message != null ? String(raw.message) : '';
        const blocked = Array.isArray(raw.blocked_inputs)
          ? (raw.blocked_inputs as unknown[]).map(String).filter(Boolean).join(', ')
          : '';
        const parts: string[] = [];
        if (message) {
          parts.push(String(message));
        }
        if (reason && reason !== message) {
          parts.push(reason);
        } else if (!message && reason) {
          parts.push(reason);
        }
        if (blocked) {
          const combined = `${message} ${reason}`;
          const codes = blocked.split(',').map((s) => s.trim()).filter(Boolean);
          const anyMissing = codes.some((c) => !combined.includes(c));
          if (anyMissing) {
            parts.push(`Entradas activas: ${blocked}`);
          }
        }
        if (parts.length) {
          return parts.join('\n\n');
        }
      }
    } catch {
      /* texto no JSON */
    }
    return fallback;
  }

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
      // Fuerza regenerar token con la nueva configuración API.
      await this.clearBearerToken();
      
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

  private normalizeApiPath(path: string): string {
    const p = String(path || '').trim();
    if (!p) return '';
    if (p.startsWith('http://') || p.startsWith('https://')) {
      try {
        const u = new URL(p);
        u.pathname = u.pathname.replace(/\/{2,}/g, '/');
        return u.toString();
      } catch {
        return p;
      }
    }
    const withSlash = p.startsWith('/') ? p : `/${p}`;
    return withSlash.replace(/\/{2,}/g, '/');
  }

  private buildBackendBaseUrl(consoleIP: string, port: number): string {
    const host = String(consoleIP || '').trim();
    const p = Number(port || 8000);
    // Para backend FastAPI local normalmente HTTP.
    return `http://${host}:${p}`;
  }

  private async getSavedAppConfig(): Promise<any | null> {
    try {
      const savedConfig = await AsyncStorage.getItem('new_door_config');
      return savedConfig ? JSON.parse(savedConfig) : null;
    } catch (error) {
      console.error('❌ Error leyendo configuración guardada:', error);
      return null;
    }
  }

  private async getBearerToken(): Promise<string | null> {
    if (this.bearerToken) return this.bearerToken;
    try {
      const token = await AsyncStorage.getItem(TABLET_BEARER_TOKEN_KEY);
      this.bearerToken = token || null;
      return this.bearerToken;
    } catch (error) {
      console.error('❌ Error leyendo bearer token:', error);
      return null;
    }
  }

  private async saveBearerToken(token: string): Promise<void> {
    this.bearerToken = token;
    await AsyncStorage.setItem(TABLET_BEARER_TOKEN_KEY, token);
  }

  private async clearBearerToken(): Promise<void> {
    this.bearerToken = null;
    await AsyncStorage.removeItem(TABLET_BEARER_TOKEN_KEY);
  }

  private async authenticateWithConfiguredCredentials(config: any): Promise<string | null> {
    try {
      const consoleIP = config?.network?.consoleIP;
      const port = Number(config?.api?.port || 8000);
      const username = String(config?.api?.username || '').trim();
      const password = String(config?.api?.password || '').trim();
      const tokenPath = this.normalizeApiPath(config?.api?.urlToken || '/api/v1/auth/token');

      if (!consoleIP || !username || !password) {
        console.warn('⚠️ No se puede obtener token: falta IP/usuario/contraseña en configuración');
        return null;
      }

      const baseUrl = this.buildBackendBaseUrl(consoleIP, port);
      const tokenUrl =
        tokenPath.startsWith('http://') || tokenPath.startsWith('https://')
          ? tokenPath
          : `${baseUrl}${tokenPath}`;
      const body = new URLSearchParams();
      body.append('username', username);
      body.append('password', password);

      const response = await fetchWithTimeout(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(`❌ Error obteniendo token (${response.status}): ${errText}`);
        return null;
      }

      const data = await response.json();
      const token = data?.access_token;
      if (!token) {
        console.error('❌ Respuesta de token sin access_token');
        return null;
      }
      await this.saveBearerToken(token);
      console.log('✅ Bearer token obtenido y guardado');
      return token;
    } catch (error) {
      console.error('❌ Error autenticando contra backend:', error);
      return null;
    }
  }

  private async authenticatedRequest(
    config: any,
    method: 'GET' | 'POST',
    endpointPath: string,
    jsonBody?: any
  ): Promise<Response | null> {
    const baseUrl = this.buildBackendBaseUrl(config?.network?.consoleIP, Number(config?.api?.port || 8000));
    const endpoint = this.normalizeApiPath(endpointPath);
    const requestUrl =
      endpoint.startsWith('http://') || endpoint.startsWith('https://')
        ? endpoint
        : `${baseUrl}${endpoint}`;

    let token = await this.getBearerToken();
    if (!token) {
      token = await this.authenticateWithConfiguredCredentials(config);
      if (!token) return null;
    }

    const makeCall = async (bearer: string) => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${bearer}`,
      };
      if (jsonBody !== undefined) {
        headers['Content-Type'] = 'application/json';
      }
      return fetchWithTimeout(requestUrl, {
        method,
        headers,
        ...(jsonBody !== undefined ? { body: JSON.stringify(jsonBody) } : {}),
      });
    };

    let response = await makeCall(token);
    if (response.status === 401) {
      await this.clearBearerToken();
      const renewed = await this.authenticateWithConfiguredCredentials(config);
      if (!renewed) return null;
      response = await makeCall(renewed);
    }
    return response;
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
   * Consultar el estado inicial del sistema
   * Obtiene el modo actual usando API2/gettags (ya no usa SDIO12)
   */
  async refreshAllDoorsStatus(): Promise<boolean> {
    try {
      console.log('🔄 Consultando estado inicial del sistema...');
      
      // Cargar la configuración desde AsyncStorage
      const savedConfig = await AsyncStorage.getItem('new_door_config');
      if (!savedConfig) {
        console.warn('⚠️ No hay configuración guardada');
        return false;
      }

      const config = JSON.parse(savedConfig);
      
      // Verificar que tenemos la configuración de API
      if (!config.network?.consoleIP || !config.api?.port || !config.api?.username || !config.api?.password) {
        console.error('❌ Configuración de API incompleta');
        return false;
      }

      this.mockSystemStatus.lastSync = new Date().toISOString();
      
      // Obtener el modo actual usando API2/gettags (la única petición necesaria)
      const currentMode = await this.getCurrentModeFromAPI2();
      if (currentMode) {
        this.mockSystemStatus.mode = currentMode;
        console.log(`✅ Modo actual actualizado desde API2: ${currentMode}`);
      } else {
        console.warn('⚠️ No se pudo obtener el modo desde API2, manteniendo modo actual');
      }
      
      this.notifyStatusChange(); // Notificar para actualizar UI
      
      console.log(`✅ Estado del sistema actualizado`);
      return true;
    } catch (error) {
      console.error('❌ Error refrescando estado del sistema:', error);
      return false;
    }
  }

  /**
   * Detectar el modo actual del sistema desde una respuesta SDIO12 ya obtenida
   * (para evitar hacer una segunda petición)
   */
  private detectCurrentModeFromResponse(sdioResponse: SDIO12Response): void {
    try {
      console.log('🔍 Detectando modo actual desde respuesta SDIO12...');
      
      // Mapeo de tags a modos
      const modeTagsMap: { [key: string]: string } = {
        'smcse_di_01_01_01': 'COMERCIAL AUTOMÁTICO',  // Modo 1
        'smcse_di_01_01_02': 'COMERCIAL ESCLUSA',      // Modo 2
        'smcse_di_01_01_03': 'HORARIO EXTENDIDO',      // Modo 3
        'smcse_di_01_01_04': 'HORARIO AUTOSERVICIO',   // Modo 4
        'smcse_di_01_01_05': 'OFICINA CERRADA',        // Modo 5
        'smcse_di_01_01_06': 'CARGA DE CAJERO',        // Modo 6
        'smcse_di_01_01_07': 'MANUAL',                 // Modo 7
      };

      // Buscar los tags de modo (entradas digitales)
      const modeTags = Object.keys(modeTagsMap);
      let activeMode: string | null = null;
      
      for (const tag of modeTags) {
        const tagData = sdioResponse.tags.find(t => t.tag === tag);
        if (tagData) {
          // Para entradas digitales, verificar si v === '1' (activo)
          const isActive = tagData.v === '1';
          console.log(`🔍 ${tag}: v=${tagData.v}, St=${tagData.St}, activo=${isActive}`);
          
          if (isActive) {
            activeMode = modeTagsMap[tag];
            console.log(`✅ Modo detectado: ${activeMode} (${tag})`);
            break; // Solo un modo puede estar activo a la vez
          }
        } else {
          console.warn(`⚠️ Tag ${tag} no encontrado en respuesta SDIO12`);
        }
      }

      // Actualizar el modo en el estado del sistema
      if (activeMode) {
        this.mockSystemStatus.mode = activeMode;
        console.log(`✅ Modo actual actualizado: ${activeMode}`);
      } else {
        console.warn('⚠️ No se detectó ningún modo activo, manteniendo modo actual:', this.mockSystemStatus.mode);
      }
    } catch (error) {
      console.error('❌ Error detectando modo actual:', error);
    }
  }

  /**
   * Detectar el modo actual del sistema leyendo los relés smcse_di_01_01_01 a smcse_di_01_01_07
   * desde el servidor SCATI (hace una petición nueva)
   */
  async detectCurrentMode(ip: string, username: string, password: string, port?: number): Promise<void> {
    try {
      console.log('🔍 Detectando modo actual desde servidor SCATI...');
      
      // Obtener estado SDIO12
      const sdioResponse = await this.getSDIO12Status(ip, username, password, port);
      
      if (!sdioResponse) {
        console.warn('⚠️ No se pudo obtener estado SDIO12 para detectar modo');
        return;
      }

      // Usar el método que procesa la respuesta
      this.detectCurrentModeFromResponse(sdioResponse);
    } catch (error) {
      console.error('❌ Error detectando modo actual:', error);
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
        const basicUrl = `https://${ip}/`;

        const basicResponse = await fetch(basicUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log(`📡 Conectividad básica: ${basicResponse.status} ${basicResponse.statusText}`);
      } catch (basicError) {
        console.log(`❌ Sin conectividad básica: ${basicError}`);
      }
      
      // Crear headers de autenticación básica
      const authHeader = this.getSDIO12AuthHeader(username, password);
      console.log(`🔑 Auth header generado: ${authHeader.substring(0, 20)}...`);
      
      // Verificar que las credenciales sean correctas (usando el mismo método)
      const expectedAuth = this.getSDIO12AuthHeader(username, password);
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
          const url = `https://${ip}${endpoint}`;

          console.log(`📡 Probando: ${url}`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
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

  async getPanelCurrentModeRuleKey(): Promise<string | null> {
    const status = await this.getPanelModeStatus();
    return status.currentRuleKey;
  }

  /** Modo activo y modo en cola (esperando liberar entradas de bloqueo). */
  async getPanelModeStatus(): Promise<PanelModeStatus> {
    try {
      const config = await this.getSavedAppConfig();
      if (!config) return { currentRuleKey: null, pendingRuleKey: null };
      const endpoint = config?.api?.urlGet || '/api/v1/get_mode';
      const response = await this.authenticatedRequest(config, 'GET', endpoint);
      if (!response?.ok) return { currentRuleKey: null, pendingRuleKey: null };
      const data = await response.json();
      const current = data?.current_mode;
      const pending = data?.pending_mode;
      return {
        currentRuleKey: typeof current === 'string' && current.trim() ? current.trim() : null,
        pendingRuleKey: typeof pending === 'string' && pending.trim() ? pending.trim() : null,
      };
    } catch {
      return { currentRuleKey: null, pendingRuleKey: null };
    }
  }

  /**
   * Mapea rule_key del panel al nombre de modo mostrado en la app.
   */
  async mapRuleKeyToAppModeName(ruleKey: string): Promise<string | null> {
    const key = String(ruleKey || '').trim();
    if (!key) return null;
    try {
      const config = await this.getSavedAppConfig();
      if (!config) return key;
      const configuredModes = config?.modes || {};
      const modeEntry = Object.entries(configuredModes).find(
        ([, v]: [string, unknown]) =>
          (v as { rule_key?: string })?.rule_key === key,
      );
      if (modeEntry) {
        const configKey = modeEntry[0];
        const configKeyToModeName: Record<string, string> = {
          automatico: 'COMERCIAL AUTOMÁTICO',
          esclusa: 'COMERCIAL ESCLUSA',
          extendido: 'HORARIO EXTENDIDO',
          autoservicio: 'HORARIO AUTOSERVICIO',
          oficinaCerrada: 'OFICINA CERRADA',
          cargaCajero: 'CARGA DE CAJERO',
          manual: 'MANUAL',
        };
        return configKeyToModeName[configKey] || key;
      }
      return key;
    } catch {
      return key;
    }
  }

  /** Actualiza el modo mostrado tras broadcast WS de otra tablet o del panel. */
  async syncModeFromPanelRuleKey(ruleKey: string | null): Promise<void> {
    if (!ruleKey) return;
    const label = await this.mapRuleKeyToAppModeName(ruleKey);
    if (!label || this.mockSystemStatus.mode === label) return;
    this.mockSystemStatus.mode = label;
    this.mockSystemStatus.lastSync = new Date().toISOString();
    this.notifyStatusChange();
  }

  /**
   * Obtener modo actual desde backend Python (`GET /api/v1/get_mode`).
   * Mapea `current_mode` (rule_key) al nombre de modo de la app.
   */
  async getCurrentModeFromAPI2(): Promise<string | null> {
    try {
      const config = await this.getSavedAppConfig();
      if (!config) {
        console.error('❌ No hay configuración guardada');
        return null;
      }

      const endpoint = config?.api?.urlGet || '/api/v1/get_mode';
      const response = await this.authenticatedRequest(config, 'GET', endpoint);
      if (!response) return null;
      if (!response.ok) {
        const t = await response.text().catch(() => '');
        console.error(`❌ Error obteniendo modo (${response.status}): ${t}`);
        return null;
      }

      const data = await response.json();
      const currentRuleKey = data?.current_mode;
      if (!currentRuleKey || typeof currentRuleKey !== 'string') {
        return null;
      }

      const configuredModes = config?.modes || {};
      const modeEntry = Object.entries(configuredModes).find(
        ([, v]: any) => v?.rule_key === currentRuleKey
      );
      if (modeEntry) {
        const configKey = modeEntry[0];
        const configKeyToModeName: Record<string, string> = {
          automatico: 'COMERCIAL AUTOMÁTICO',
          esclusa: 'COMERCIAL ESCLUSA',
          extendido: 'HORARIO EXTENDIDO',
          autoservicio: 'HORARIO AUTOSERVICIO',
          oficinaCerrada: 'OFICINA CERRADA',
          cargaCajero: 'CARGA DE CAJERO',
          manual: 'MANUAL',
        };
        return configKeyToModeName[configKey] || currentRuleKey;
      }
      return currentRuleKey;
    } catch (error) {
      console.error('❌ Error obteniendo modo actual:', error);
      return null;
    }
  }

  /**
   * Generar header de autenticación BASIC para la API
   */
  private getBasicAuthHeaderForAPI(username: string, password: string): string {
    const credentials = `${username}:${password}`;
    
    // React Native compatible base64 encoding
    let encoded: string;
    try {
      // Intentar con btoa si está disponible (web)
      if (typeof btoa !== 'undefined') {
        encoded = btoa(credentials);
      } else {
        // Fallback para React Native: usar Buffer
        encoded = Buffer.from(credentials, 'utf-8').toString('base64');
      }
    } catch (error) {
      console.error('❌ Error encoding credentials:', error);
      // Fallback manual si todo falla
      encoded = this.base64Encode(credentials);
    }
    
    return `Basic ${encoded}`;
  }

  /**
   * Cambiar modo usando backend Python (`POST /api/v1/set_mode`).
   * set_rule: rule_key y active. set_output: code y on.
   */
  async changeModeWithAPI2(mode: string): Promise<PanelApiResult> {
    try {
      const config = await this.getSavedAppConfig();
      if (!config) {
        console.error('❌ No hay configuración guardada');
        return { ok: false, errorMessage: 'No hay configuración guardada en la tablet.' };
      }

      const configKey = modeNameToConfigKeyMap[mode.toUpperCase()];
      if (!configKey) {
        console.error(`❌ Modo no reconocido: ${mode}`);
        return { ok: false, errorMessage: `Modo no reconocido: ${mode}` };
      }
      const modeConfig = config?.modes?.[configKey] as {
        rule_key?: string;
        action?: string;
        enabled?: boolean;
        output_code?: string;
        output_on?: boolean;
      };
      if (!modeConfig || modeConfig.enabled === false) {
        console.error(`❌ Configuración de modo inválida o deshabilitada para ${mode}`);
        return {
          ok: false,
          errorMessage: 'Este modo está deshabilitado o mal configurado en ajustes.',
        };
      }

      const endpoint = config?.api?.urlPost || '/api/v1/set_mode';
      const useOutput = modeConfig.action === 'set_output';
      let payload: Record<string, unknown>;
      if (useOutput) {
        const code = String(modeConfig.output_code || '').trim();
        if (!code) {
          console.error(`❌ Modo ${configKey}: action set_output requiere output_code`);
          return {
            ok: false,
            errorMessage: 'Falta el código de salida para set_output. Revísalo en configuración.',
          };
        }
        const on = modeConfig.output_on !== false;
        payload = { action: 'set_output', code, on };
      } else {
        const rk = String(modeConfig.rule_key || '').trim();
        if (!rk) {
          console.error(`❌ Modo ${configKey}: falta rule_key para set_rule`);
          return {
            ok: false,
            errorMessage: 'Falta la clave de regla (rule_key) para set_rule. Revísalo en configuración.',
          };
        }
        payload = { action: 'set_rule', rule_key: rk, active: true };
      }

      const response = await this.authenticatedRequest(config, 'POST', endpoint, payload);
      if (!response) {
        return {
          ok: false,
          errorMessage: 'No se pudo conectar con el panel. Comprueba red y credenciales.',
        };
      }
      if (!response.ok) {
        const t = await response.text().catch(() => '');
        if (response.status === 409) {
          console.warn(`⚠️ Modo bloqueado por el panel (409): ${t}`);
        } else {
          console.error(`❌ Error cambiando modo (${response.status}): ${t}`);
        }
        return {
          ok: false,
          errorMessage: this.formatPanelApiErrorMessage(response.status, t),
        };
      }

      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (data.queued === true) {
        const result = (data.result || {}) as Record<string, unknown>;
        const pendingRuleKey = String(
          result.pending_manual_mode || result.rule || payload.rule_key || '',
        ).trim();
        const blockedInputs = Array.isArray(result.blocked_inputs)
          ? result.blocked_inputs.map((c) => String(c))
          : [];
        const queueMessage =
          typeof result.reason === 'string' ? result.reason : undefined;
        console.log('[Tablet] Modo en cola:', pendingRuleKey, blockedInputs);
        return {
          ok: true,
          queued: true,
          pendingRuleKey: pendingRuleKey || String(payload.rule_key || ''),
          blockedInputs,
          queueMessage,
        };
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      const currentMode = await this.getCurrentModeFromAPI2();
      if (currentMode) {
        this.mockSystemStatus.mode = currentMode;
      }
      this.mockSystemStatus.lastSync = new Date().toISOString();
      this.notifyStatusChange();
      return { ok: true };
    } catch (error) {
      console.error('❌ Error cambiando modo:', error);
      return {
        ok: false,
        errorMessage:
          error instanceof Error ? error.message : 'Error inesperado al cambiar de modo.',
      };
    }
  }

  async changeMode(mode: string): Promise<PanelApiResult> {
    return await this.changeModeWithAPI2(mode);
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

  // Control de puertas vía panel (`POST /api/v1/set_mode` + `action=set_output`)
  async controlDoor(doorId: 'P1' | 'P2' | 'P3' | 'P4', action: 'open' | 'close'): Promise<PanelApiResult> {
    try {
      console.log(`🚪 Intentando ${action === 'open' ? 'abrir' : 'cerrar'} ${doorId}`);

      // Cargar la configuración desde AsyncStorage
      const savedConfig = await AsyncStorage.getItem('new_door_config');
      if (!savedConfig) {
        console.error('❌ No hay configuración guardada');
        return { ok: false, errorMessage: 'No hay configuración guardada en la tablet.' };
      }

      const config = JSON.parse(savedConfig);
      
      // Verificar configuración de API global
      if (!config.network?.consoleIP || !config.api?.port || !config.api?.username || !config.api?.password) {
        console.error('❌ Configuración de API global incompleta');
        return { ok: false, errorMessage: 'Configuración de API incompleta (IP, puerto o credenciales).' };
      }

      if (!config.doors) {
        console.error('❌ Configuración de puertas no válida');
        return { ok: false, errorMessage: 'Configuración de puertas no válida.' };
      }

      // Obtener índice de puerta (P1 = 0, P2 = 1, etc.)
      const doorIndex = parseInt(doorId.replace('P', ''), 10) - 1;
      
      // Buscar solo entre las puertas habilitadas
      const enabledDoors = config.doors.filter((door: any) => door.enabled);
      const doorConfig = enabledDoors[doorIndex];

      if (!doorConfig) {
        console.error(`❌ Configuración no encontrada para puerta habilitada ${doorId}`);
        return { ok: false, errorMessage: `No hay configuración para la puerta ${doorId}.` };
      }

      const endpoint = config?.api?.urlPost || '/api/v1/set_mode';
      const intercom = doorConfig.intercom || {};
      const controlAction = intercom.doorControlAction || 'set_output';

      if (controlAction === 'door_endpoint') {
        if (action === 'close') {
          console.warn(`⚠️ door_endpoint no soporta cerrar puerta (${doorId})`);
          return { ok: false, errorMessage: 'Este tipo de apertura no permite cerrar la puerta desde la tablet.' };
        }
        let path = String(intercom.doorControlEndpoint || '').trim();
        if (!path) {
          path = `/api/v1/door/open/p${doorId.replace('P', '').toLowerCase()}`;
        }
        if (!path.startsWith('/')) {
          path = `/${path}`;
        }
        console.log(`🔧 Apertura ${doorId} vía endpoint pulsadores:`, path);
        const response = await this.authenticatedRequest(config, 'POST', path, {});
        if (!response) {
          console.error('❌ Sin respuesta del panel al llamar endpoint pulsadores');
          return { ok: false, errorMessage: 'No se pudo conectar con el panel.' };
        }
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const errorMessage = this.formatPanelApiErrorMessage(response.status, errorText);
          if (response.status === 409) {
            console.warn(`⚠️ Conflicto abriendo puerta (409): ${errorText}`);
          } else {
            console.error(`❌ Error HTTP ${response.status} en endpoint pulsadores: ${errorText}`);
          }
          return { ok: false, errorMessage };
        }
        await response.json().catch(() => ({}));
        this.notifyStatusChange();
        return { ok: true };
      }

      if (controlAction === 'set_rule') {
        const ruleKey = String(intercom.doorControlRuleKey || '').trim();
        if (!ruleKey) {
          console.error(`❌ Falta doorControlRuleKey para ${doorId} (set_rule)`);
          return { ok: false, errorMessage: `Falta la regla de apertura configurada para ${doorId}.` };
        }
        const payload = {
          action: 'set_rule',
          rule_key: ruleKey,
          active: action === 'open',
        };
        console.log(`🔧 Control de puerta ${doorId} usando set_mode/set_rule:`, {
          endpoint,
          payload,
        });
        const response = await this.authenticatedRequest(config, 'POST', endpoint, payload);
        if (!response) {
          console.error('❌ Sin respuesta del panel al ejecutar regla');
          return { ok: false, errorMessage: 'No se pudo conectar con el panel.' };
        }
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const errorMessage = this.formatPanelApiErrorMessage(response.status, errorText);
          console.error(`❌ Error HTTP ${response.status} ejecutando regla: ${errorText}`);
          return { ok: false, errorMessage };
        }
        await response.json().catch(() => ({}));
        this.notifyStatusChange();
        return { ok: true };
      }

      // set_output: puede ser auto (pulso) o manual (queda ON hasta "cerrar puerta")
      if (!intercom?.doorControlPCB || !intercom?.doorControlSwitch) {
        console.error(`❌ Configuración de PCB/Switch incompleta para ${doorId}`);
        return { ok: false, errorMessage: `Falta PCB/Switch de control para ${doorId}.` };
      }
      const outputCode = `OUT_${String(intercom.doorControlPCB).padStart(2, '0')}_${String(
        intercom.doorControlSwitch
      ).padStart(2, '0')}`;
      const outputMode = intercom.doorOutputMode || 'auto';
      const pulseSecondsRaw = Number(intercom.doorControlPulseTime ?? 1.0);
      const pulseSeconds = Number.isFinite(pulseSecondsRaw)
        ? Math.max(0.1, Math.min(30, pulseSecondsRaw))
        : 1.0;

      const sendSetOutput = async (on: boolean): Promise<PanelApiResult> => {
        const payload = { action: 'set_output', code: outputCode, on };
        const response = await this.authenticatedRequest(config, 'POST', endpoint, payload);
        if (!response) {
          console.error('❌ Sin respuesta del panel al controlar salida');
          return { ok: false, errorMessage: 'No se pudo conectar con el panel.' };
        }
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          console.error(`❌ Error HTTP ${response.status} controlando salida: ${errorText}`);
          return {
            ok: false,
            errorMessage: this.formatPanelApiErrorMessage(response.status, errorText),
          };
        }
        await response.json().catch(() => ({}));
        return { ok: true };
      };

      if (action === 'close') {
        const result = await sendSetOutput(false);
        if (!result.ok) return result;
        console.log(`✅ Puerta ${doorId} cerrada vía set_output`);
      } else if (outputMode === 'manual') {
        const result = await sendSetOutput(true);
        if (!result.ok) return result;
        console.log(`✅ Puerta ${doorId} abierta en modo manual (queda ON)`);
      } else {
        // Auto: abre y apaga automáticamente tras doorControlPulseTime segundos.
        const opened = await sendSetOutput(true);
        if (!opened.ok) return opened;
        console.log(`✅ Puerta ${doorId} abierta (auto), esperando ${pulseSeconds}s`);
        await new Promise((resolve) => setTimeout(resolve, pulseSeconds * 1000));
        const closed = await sendSetOutput(false);
        if (!closed.ok) return closed;
        console.log(`✅ Puerta ${doorId} cerrada automáticamente`);
      }

      this.notifyStatusChange();
      return { ok: true };
    } catch (error) {
      console.error(`❌ Error controlando puerta ${doorId}:`, error);
      return {
        ok: false,
        errorMessage:
          error instanceof Error ? error.message : 'Error inesperado al controlar la puerta.',
      };
    }
  }

  // ========== MÉTODOS PARA CONTROL DE PUERTAS SDIO12 ==========
  
  /**
   * Construir el tag SDIO12 basado en PCB y Switch
   * Formato: smcse_do_01_{PCB}_{SWITCH} o smcse_di_01_{PCB}_{SWITCH}
   * @param pcb Número de placa
   * @param switchNum Número de switch/relé
   * @param useDI Si es true, usa "di" (entradas digitales), si es false usa "do" (salidas digitales)
   */
  private buildSDIO12Tag(pcb: number, switchNum: number, useDI: boolean = false): string {
    const pcbStr = pcb.toString().padStart(2, '0');
    const switchStr = switchNum.toString().padStart(2, '0');
    const type = useDI ? 'di' : 'do';
    return `smcse_${type}_01_${pcbStr}_${switchStr}`;
  }

  /**
   * Generar header de autenticación BASIC para SDIO12
   */
  private getSDIO12AuthHeader(username: string, password: string): string {
    const credentials = `${username}:${password}`;
    
    // React Native compatible base64 encoding
    let encoded: string;
    try {
      // Intentar con btoa si está disponible (web)
      if (typeof btoa !== 'undefined') {
        encoded = btoa(credentials);
      } else {
        // Fallback para React Native: usar Buffer
        encoded = Buffer.from(credentials, 'utf-8').toString('base64');
      }
    } catch (error) {
      console.error('❌ Error encoding credentials:', error);
      // Fallback manual si todo falla
      encoded = this.base64Encode(credentials);
    }
    
    console.log('🔑 Authorization header creado correctamente');
    return `Basic ${encoded}`;
  }

  /**
   * Fallback manual de base64 encoding
   */
  private base64Encode(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let i = 0;
    
    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      output += chars.charAt((bitmap >> 18) & 63);
      output += chars.charAt((bitmap >> 12) & 63);
      output += chars.charAt(i - 2 < str.length ? (bitmap >> 6) & 63 : 64);
      output += chars.charAt(i - 1 < str.length ? bitmap & 63 : 64);
    }
    
    return output;
  }

  /**
   * Probar diferentes configuraciones de conexión para SCATI
   * @param ip Puede ser "ip" o "ip:port"
   */
  private async tryDirectConnection(ip: string, username: string, password: string, isPost: boolean = false, body?: any): Promise<any> {
    // Si la IP ya incluye el puerto (formato ip:port), usarla directamente
    // Si no, usar puerto por defecto 4436 (puerto del servidor SCATI)
    // Agregar parámetro para deshabilitar Sentry
    const url = ip.includes(':') 
      ? `https://${ip}/sdio12?sentry=0`
      : `https://${ip}:4436/sdio12?sentry=0`;
    
    try {
      console.log(`🔍 Conectando directamente a: ${url}`);
      console.log(`🔑 Authorization: ${this.getSDIO12AuthHeader(username, password).substring(0, 30)}...`);
      
      // Verificar si RNFetchBlob está disponible (solo en React Native)
      console.log(`🔍 Platform.OS: ${Platform.OS}`);
      console.log(`🔍 RNFetchBlob disponible: ${!!RNFetchBlob}`);
      console.log(`🔍 RNFetchBlob.config: ${!!(RNFetchBlob && RNFetchBlob.config)}`);
      
      if (Platform.OS !== 'web' && RNFetchBlob && RNFetchBlob.config) {
        console.log(`📱 Usando RNFetchBlob (React Native)`);
        
        // Headers para evitar bloqueo de Sentry/Cloudflare
        const browserHeaders = {
          'Authorization': this.getSDIO12AuthHeader(username, password),
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Referer': url.replace('/sdio12', '/'),
          'Origin': url.replace('/sdio12', ''),
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'X-Disable-Sentry': '1',
          'X-Sentry-Enabled': '0'
        };

        // Configuración para aceptar certificados SSL no confiables (autofirmados)
        const rnFetchConfig = {
          trusty: true, // Acepta certificados SSL autofirmados/no confiables
          timeout: 10000
        };

        const response = isPost 
          ? await RNFetchBlob.config(rnFetchConfig).fetch('POST', url, browserHeaders, JSON.stringify(body))
          : await RNFetchBlob.config(rnFetchConfig).fetch('GET', url, browserHeaders);

        const status = response.info().status;
        console.log(`📊 Respuesta directa: ${status}`);

        if (status >= 200 && status < 300) {
          console.log(`✅ Conexión directa exitosa: ${url}`);
          
          // Obtener el texto de la respuesta primero
          const responseText = response.text();
          console.log(`📄 Respuesta del servidor: "${responseText}"`);
          
          // Verificar si la respuesta está vacía
          if (!responseText || responseText.trim() === '') {
            console.log(`⚠️ Respuesta vacía del servidor SCATI`);
            return { response: { status, data: { success: true, message: 'Comando ejecutado' } }, endpoint: url };
          }
          
          // Intentar parsear JSON
          try {
            const data = JSON.parse(responseText);
            console.log(`📊 JSON parseado correctamente:`, data);
            return { response: { status, data }, endpoint: url };
          } catch (jsonError) {
            console.log(`⚠️ No es JSON válido, tratando como texto plano`);
            return { response: { status, data: { success: true, message: responseText } }, endpoint: url };
          }
        } else {
          const errorText = response.text();
          console.log(`⚠️ Respuesta no exitosa: ${status} - ${errorText}`);
          throw new Error(`HTTP ${status}: ${errorText}`);
        }
      } else {
        // En web, el modo directo no es posible debido a restricciones de seguridad del navegador
        // que bloquean certificados SSL no confiables. Debe usarse el proxy.
        if (Platform.OS === 'web') {
          console.error(`🌐 ERROR: En web, el modo directo no es compatible con certificados SSL no confiables.`);
          console.error(`💡 SOLUCIÓN: Habilita el modo proxy en la configuración de la aplicación.`);
          throw new Error('En web, el modo directo no es compatible. Por favor, habilita el modo proxy en la configuración para usar servidores con certificados SSL no confiables.');
        } else {
          // Para otras plataformas (iOS, etc.)
          console.log(`🌐 RNFetchBlob no disponible en este entorno`);
          throw new Error('RNFetchBlob no disponible en este entorno');
        }
      }
    } catch (error) {
      console.log(`❌ Conexión directa falló: ${url}`);
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      
      if (error instanceof Error) {
        console.log(`❌ Tipo de error: ${error.constructor.name}`);
        if ('code' in error) {
          console.log(`❌ Código de error: ${(error as any).code}`);
        }
        
        // Detectar errores de certificado SSL específicamente
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('cert') || errorMessage.includes('ssl') || errorMessage.includes('tls') || 
            errorMessage.includes('err_cert_authority_invalid') || errorMessage.includes('handshake')) {
          console.error(`🔒 Error de certificado SSL detectado. Verifica el certificado del servidor SCATI o RNFetchBlob (trusty).`);
          console.error(`💡 Solución: Verifica que RNFetchBlob esté correctamente configurado con trusty:true`);
        }
      }
      throw error;
    }
  }

  /**
   * Obtener el estado actual de todos los switches SDIO12
   * GET https://{ip}:{port}/sdio12
   * @param port Puerto opcional (por defecto 443 para HTTPS o se infiere de la URL)
   */
  async getSDIO12Status(ip: string, username: string, password: string, port?: number): Promise<SDIO12Response | null> {
    try {
      const portSuffix = port ? `:${port}` : '';
      console.log(`🔍 Consultando estado SDIO12: ${ip}${portSuffix}`);

      const directIP = port ? `${ip}:${port}` : ip;
      const { response, endpoint } = await this.tryDirectConnection(directIP, username, password, false);

      console.log('📥 Respuesta recibida:', response.status);
      console.log(`✅ Endpoint funcional: ${endpoint}`);

      const data: SDIO12Response = response.data;
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
    switchNum: number,
    port?: number
  ): Promise<{ St: number; v: string; isOpen: boolean } | null> {
    try {
      const data = await this.getSDIO12Status(ip, username, password, port);
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
   * Controlar un switch SDIO12 específico (abrir/cerrar puerta o cambiar modo)
   * POST https://{ip}:{port}/sdio12
   * St: 1001 = activar (abrir), 1000 = desactivar (cerrar)
   * @param useDI Si es true, usa "di" (entradas digitales) para modos, si es false usa "do" (salidas digitales) para puertas/emergencia
   * @param port Puerto opcional (por defecto 443 para HTTPS o se infiere de la URL)
   */
  async controlSDIO12Switch(
    ip: string,
    username: string,
    password: string,
    pcb: number,
    switchNum: number,
    action: 'open' | 'close',
    useDI: boolean = false,
    port?: number
  ): Promise<boolean> {
    try {
      const portSuffix = port ? `:${port}` : '';
      const url = `https://${ip}${portSuffix}/sdio12?sentry=0`;
      
      const tag = this.buildSDIO12Tag(pcb, switchNum, useDI);
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
      
      const actionType = useDI ? 'modo' : 'puerta';
      console.log(`🚪 ${action === 'open' ? 'Activando' : 'Desactivando'} ${actionType}:`, {
        url,
        tag,
        St,
        v,
        body: bodyString,
        type: useDI ? 'DI (entradas)' : 'DO (salidas)'
      });

      console.log('📡 [controlSDIO12Switch] Puerto recibido:', port);
      console.log('📡 [controlSDIO12Switch] IP recibida:', ip);
      console.log('📡 [controlSDIO12Switch] URL construida:', url);
      console.log('🔑 Authorization:', this.getSDIO12AuthHeader(username, password).substring(0, 30) + '...');
      console.log('📦 Body:', bodyString);

      const directIP = port ? `${ip}:${port}` : ip;
      const { response, endpoint } = await this.tryDirectConnection(directIP, username, password, true, requestBody);

      console.log('📥 Respuesta POST recibida:', response.status);
      console.log(`✅ Endpoint funcional: ${endpoint}`);

      const result = response.data;
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

  /**
   * ===== MÉTODOS DE CONTROL DE PUERTA CON PULSO =====
   */

  /**
   * Abrir puerta con control automático o manual
   * - Modo Manual (manualMode = true): Envía comando y mantiene estado
   * - Modo Automático (manualMode = false): Envía pulso temporal (abre y cierra)
   */
  async openDoorWithPulse(
    ip: string,
    username: string,
    password: string,
    pcb: number,
    switchNum: number,
    manualMode: boolean = false,
    pulseTime: number = 1.0,
    port?: number
  ): Promise<boolean> {
    try {
      console.log(`🚪 Control de puerta - Modo: ${manualMode ? 'Manual (permanente)' : 'Automático (pulso)'}`);
      console.log(`🔧 PCB: ${pcb}, Switch: ${switchNum}, Tiempo: ${pulseTime}s, Puerto: ${port || 'default'}`);

      // Enviar comando de apertura (activar relé)
      console.log('🔓 Enviando comando de apertura (St: 1001)...');
      const openSuccess = await this.controlSDIO12Switch(
        ip, username, password,
        pcb, switchNum, 'open',
        false, // Usar "do" (salidas digitales) para control de puertas
        port // Puerto específico
      );

      if (!openSuccess) {
        console.error('❌ Error - comando de apertura falló');
        return false;
      }

      console.log('✅ Comando de apertura enviado');

      // Si es modo AUTOMÁTICO (pulso temporal), esperar y cerrar
      if (!manualMode) {
        console.log(`⏳ Modo automático - Esperando ${pulseTime}s para cerrar...`);
        
        // Esperar el tiempo configurado
        await new Promise(resolve => setTimeout(resolve, pulseTime * 1000));
        
        console.log('🔒 Enviando comando de cierre automático (St: 1000)...');
        
        // Enviar comando de cierre (desactivar relé)
        const closeSuccess = await this.controlSDIO12Switch(
          ip, username, password,
          pcb, switchNum, 'close',
          false, // Usar "do" (salidas digitales) para control de puertas
          port // Puerto específico
        );

        if (closeSuccess) {
          console.log('✅ Puerta cerrada automáticamente');
        } else {
          console.error('⚠️ Error cerrando puerta automáticamente');
        }

        return closeSuccess;
      } else {
        // Modo MANUAL - mantener estado abierto
        console.log('ℹ️ Modo manual - Puerta permanece abierta hasta cerrar manualmente');
        return true;
      }
    } catch (error) {
      console.error('❌ Error en openDoorWithPulse:', error);
      return false;
    }
  }

  /**
   * ===== MÉTODOS DE EMERGENCIA =====
   * Emergencia solo vía API del panel set_mode.
   */

  /**
   * Activar emergencia contra el backend del panel.
   */
  async activateEmergency(): Promise<PanelApiResult> {
    try {
      console.log('🚨 ACTIVANDO SISTEMA DE EMERGENCIA');
      
      const config = await emergencyService.getEmergencyConfig();
      console.log('🔍 Configuración de emergencia obtenida:', config);
      
      if (!config || !config.enabled) {
        console.error('❌ Configuración de emergencia no habilitada');
        return {
          ok: false,
          errorMessage: 'La emergencia no está habilitada en la configuración de la tablet.',
        };
      }

      const saved = await this.getSavedAppConfig();
      if (!saved) {
        console.error('❌ No hay new_door_config para emergencia');
        return { ok: false, errorMessage: 'Falta la configuración de la tablet.' };
      }
      const endpoint = saved.api?.urlPost || '/api/v1/set_mode';
      const useOut = config.action === 'set_output';
      const body: Record<string, unknown> = useOut
        ? {
            action: 'set_output',
            code: String(config.output_code || '').trim(),
            on: config.output_on !== false,
          }
        : {
            action: 'set_rule',
            rule_key: String(config.rule_key || '').trim(),
            active: true,
          };
      if (useOut && !(body.code as string)) {
        console.error('❌ Emergencia set_output: falta output_code');
        return { ok: false, errorMessage: 'Falta el código de salida para emergencia set_output.' };
      }
      if (!useOut && !(body.rule_key as string)) {
        console.error('❌ Emergencia set_rule: falta rule_key');
        return { ok: false, errorMessage: 'Falta la clave de regla para emergencia set_rule.' };
      }

      const emergRuleForUi = String(config.rule_key || '').trim();
      const currentKey = await this.getPanelCurrentModeRuleKey();
      const alreadyEmergency =
        !useOut && !!emergRuleForUi && !!currentKey && currentKey === emergRuleForUi;
      if (alreadyEmergency) {
        await emergencyService.clearPreviousPanelModeRuleKey();
      } else if (currentKey) {
        await emergencyService.setPreviousPanelModeRuleKey(currentKey);
      } else {
        await emergencyService.clearPreviousPanelModeRuleKey();
      }

      const response = await this.authenticatedRequest(saved, 'POST', endpoint, body);
      if (!response) {
        return {
          ok: false,
          errorMessage: 'No se pudo conectar con el panel. Comprueba red y credenciales.',
        };
      }
      if (!response.ok) {
        const t = await response.text().catch(() => '');
        await emergencyService.clearPreviousPanelModeRuleKey();
        if (response.status === 409) {
          console.warn(`⚠️ Emergencia bloqueada (409): ${t}`);
        } else {
          console.error(`❌ Emergencia (${response.status}): ${t}`);
        }
        return {
          ok: false,
          errorMessage: this.formatPanelApiErrorMessage(response.status, t),
        };
      }
      await emergencyService.activateEmergency();
      const m = await this.getCurrentModeFromAPI2();
      if (m) this.mockSystemStatus.mode = m;
      this.mockSystemStatus.emergencyActive = true;
      this.mockSystemStatus.lastSync = new Date().toISOString();
      this.notifyStatusChange();
      return { ok: true };
    } catch (error) {
      console.error('❌ Error activando emergencia:', error);
      return {
        ok: false,
        errorMessage:
          error instanceof Error ? error.message : 'Error inesperado al activar emergencia.',
      };
    }
  }

  /** Desactivar emergencia vía set_mode en el panel. */
  async deactivateEmergency(): Promise<PanelApiResult> {
    try {
      console.log('✅ DESACTIVANDO SISTEMA DE EMERGENCIA');
      
      const config = await emergencyService.getEmergencyConfig();
      if (!config || !config.enabled) {
        console.error('❌ Configuración de emergencia no habilitada');
        return {
          ok: false,
          errorMessage: 'La emergencia no está habilitada en la configuración de la tablet.',
        };
      }

      const saved = await this.getSavedAppConfig();
      if (!saved) {
        console.error('❌ No hay new_door_config para emergencia');
        return { ok: false, errorMessage: 'Falta la configuración de la tablet.' };
      }
      const endpoint = saved.api?.urlPost || '/api/v1/set_mode';
      const useOut = config.action === 'set_output';
      const body: Record<string, unknown> = useOut
        ? {
            action: 'set_output',
            code: String(config.output_code || '').trim(),
            on: false,
          }
        : {
            action: 'set_rule',
            rule_key: String(config.rule_key || '').trim(),
            active: false,
          };
      if (useOut && !(body.code as string)) {
        console.error('❌ Emergencia set_output: falta output_code para desactivar');
        return { ok: false, errorMessage: 'Falta el código de salida para desactivar emergencia.' };
      }
      if (!useOut && !(body.rule_key as string)) {
        console.error('❌ Emergencia set_rule: falta rule_key');
        return { ok: false, errorMessage: 'Falta la clave de regla para desactivar emergencia.' };
      }
      const response = await this.authenticatedRequest(saved, 'POST', endpoint, body);
      if (!response) {
        return {
          ok: false,
          errorMessage: 'No se pudo conectar con el panel. Comprueba red y credenciales.',
        };
      }
      if (!response.ok) {
        const t = await response.text().catch(() => '');
        console.error(`❌ Error desactivando emergencia (${response.status}): ${t}`);
        return {
          ok: false,
          errorMessage: this.formatPanelApiErrorMessage(response.status, t),
        };
      }
      await emergencyService.deactivateEmergency();

      const prevRule = await emergencyService.getPreviousPanelModeRuleKey();
      if (prevRule) {
        const restoreResp = await this.authenticatedRequest(saved, 'POST', endpoint, {
          action: 'set_rule',
          rule_key: prevRule,
          active: true,
        });
        if (!restoreResp?.ok) {
          const txt = restoreResp ? await restoreResp.text().catch(() => '') : '';
          console.warn(
            'No se pudo restaurar el modo anterior del panel:',
            restoreResp
              ? this.formatPanelApiErrorMessage(restoreResp.status, txt)
              : 'sin respuesta',
          );
        }
      }
      await emergencyService.clearPreviousPanelModeRuleKey();

      const m = await this.getCurrentModeFromAPI2();
      if (m) this.mockSystemStatus.mode = m;
      this.mockSystemStatus.emergencyActive = false;
      this.mockSystemStatus.lastSync = new Date().toISOString();
      this.notifyStatusChange();
      return { ok: true };
    } catch (error) {
      console.error('❌ Error desactivando emergencia:', error);
      return {
        ok: false,
        errorMessage:
          error instanceof Error ? error.message : 'Error inesperado al desactivar emergencia.',
      };
    }
  }

  /**
   * Compatibilidad: delega en getEmergencyStatus.
   */
  async checkEmergencyStatus(): Promise<boolean> {
    const s = await this.getEmergencyStatus();
    return s.isActive;
  }

  /**
   * Estado de emergencia vía panel get_mode y estado local.
   */
  async getEmergencyStatus(): Promise<{
    isConfigured: boolean;
    isActive: boolean;
    switchesStatus: {
      switch1: { active: boolean; tag: string };
      switch2: { active: boolean; tag: string };
    };
  }> {
    const emptySwitches = {
      switch1: { active: false, tag: '' },
      switch2: { active: false, tag: '' },
    };
    try {
      const config = await emergencyService.getEmergencyConfig();
      if (!config?.enabled) {
        return { isConfigured: false, isActive: false, switchesStatus: emptySwitches };
      }

      const panelKey = await this.getPanelCurrentModeRuleKey();
      const rk = String(config.rule_key || '').trim();
      const fromPanel = !!rk && !!panelKey && panelKey === rk;
      const local = await emergencyService.getEmergencyState();
      const isActive = fromPanel || !!local?.isActive;

      return {
        isConfigured: true,
        isActive,
        switchesStatus: emptySwitches,
      };
    } catch (error) {
      console.error('❌ Error obteniendo estado de emergencia:', error);
      return { isConfigured: false, isActive: false, switchesStatus: emptySwitches };
    }
  }

  /** Token JWT para WebSocket de llamadas (autentica si hace falta). */
  async getAuthTokenForCalls(): Promise<string | null> {
    const config = await this.getSavedAppConfig();
    let token = await this.getBearerToken();
    if (!token && config) {
      token = await this.authenticateWithConfiguredCredentials(config);
    }
    return token;
  }

  /** URL ws://…/api/v1/ws/calls?token=… */
  async buildCallsWebSocketUrl(): Promise<string | null> {
    const config = await this.getSavedAppConfig();
    const host = String(config?.network?.consoleIP || '').trim();
    if (!host) return null;
    const token = await this.getAuthTokenForCalls();
    if (!token) return null;
    const port = Number(config?.api?.port || 8000);
    const path = this.normalizeApiPath('/api/v1/ws/calls');
    const wsHost = `ws://${host}:${port}`;
    return `${wsHost}${path}?token=${encodeURIComponent(token)}`;
  }

  /** Defaults de sucursal configurados en el panel web. */
  async fetchTabletPanelConfig(sourceConfig?: any): Promise<{
    revision: string;
    updated_at: string | null;
    config: any;
  } | null> {
    const config = sourceConfig ?? (await this.getSavedAppConfig());
    if (!config?.network?.consoleIP) {
      console.warn('⚠️ fetchTabletPanelConfig: sin consoleIP');
      return null;
    }
    const response = await this.authenticatedRequest(config, 'GET', '/api/v1/tablet-config');
    if (!response?.ok) {
      const errText = await response?.text().catch(() => '');
      console.error(`❌ fetchTabletPanelConfig (${response?.status}): ${errText}`);
      return null;
    }
    const data = await response.json();
    if (!data?.config) {
      console.error('❌ fetchTabletPanelConfig: respuesta sin config');
      return null;
    }
    return {
      revision: String(data.revision ?? 'unknown'),
      updated_at: data.updated_at ?? null,
      config: data.config,
    };
  }
}

// Create and export singleton instance
const doorControlService = new DoorControlService();

// Export both the class and singleton instance
export { DoorControlService, doorControlService };