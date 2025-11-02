/**
 * Utilidades para detectar y clasificar dispositivos de intercomunicación
 * 
 * Este módulo permite detectar automáticamente el tipo de dispositivo
 * basándose en su dirección IP y configuración.
 */

import { IntercomConfig } from '../components/IntercomConfigurationModal';

export type DeviceType = 'AXIS-I8116-E' | 'SAFIRE' | 'GENERIC';

/**
 * Mapa de IPs a tipos de dispositivos conocidos
 * Configura aquí las IPs específicas de tus dispositivos
 */
const KNOWN_DEVICES: Map<string, DeviceType> = new Map([
  // AXIS I8116-E - Intercomunicador con audio bidireccional
  ['192.168.1.130', 'AXIS-I8116-E'],
  
  // Safire SF-VI131-IPW-MF - Cámara con audio de un sentido
  ['192.168.1.117', 'SAFIRE'],
  
  // Añade más dispositivos aquí según sea necesario
]);

/**
 * Detecta el tipo de dispositivo basándose en la IP
 */
export function detectDeviceType(cameraIP: string): DeviceType {
  // Buscar en dispositivos conocidos
  const knownType = KNOWN_DEVICES.get(cameraIP);
  if (knownType) {
    // Solo log en modo debug o primera vez
    return knownType;
  }
  
  // Si no está en la lista, usar GENERIC
  console.log(`⚠️ Dispositivo no reconocido: ${cameraIP} -> GENERIC`);
  return 'GENERIC';
}

/**
 * Verifica si un dispositivo soporta intercomunicación bidireccional
 */
export function supportsIntercom(deviceType: DeviceType): boolean {
  switch (deviceType) {
    case 'AXIS-I8116-E':
      return true; // AXIS soporta audio bidireccional
    case 'SAFIRE':
      return false; // Safire solo audio de un sentido
    case 'GENERIC':
      return false; // Por defecto, no soporta
    default:
      return false;
  }
}

/**
 * Obtiene información detallada sobre un tipo de dispositivo
 */
export function getDeviceInfo(deviceType: DeviceType): {
  name: string;
  manufacturer: string;
  audioCapabilities: string;
  intercomSupport: boolean;
  recommendedCodec: string;
  sampleRate: number;
} {
  switch (deviceType) {
    case 'AXIS-I8116-E':
      return {
        name: 'AXIS I8116-E Network Video Intercom',
        manufacturer: 'AXIS Communications',
        audioCapabilities: 'Audio bidireccional con cancelación de eco',
        intercomSupport: true,
        recommendedCodec: 'G711',
        sampleRate: 16000,
      };
    
    case 'SAFIRE':
      return {
        name: 'Safire SF-VI131-IPW-MF',
        manufacturer: 'Safire',
        audioCapabilities: 'Audio de un sentido (escuchar desde cámara)',
        intercomSupport: false,
        recommendedCodec: 'PCMU',
        sampleRate: 8000,
      };
    
    case 'GENERIC':
      return {
        name: 'Dispositivo Genérico',
        manufacturer: 'Desconocido',
        audioCapabilities: 'Audio no verificado',
        intercomSupport: false,
        recommendedCodec: 'G711',
        sampleRate: 8000,
      };
    
    default:
      return {
        name: 'Desconocido',
        manufacturer: 'Desconocido',
        audioCapabilities: 'No disponible',
        intercomSupport: false,
        recommendedCodec: 'G711',
        sampleRate: 8000,
      };
  }
}

/**
 * Actualiza la configuración del intercomunicador con información del dispositivo detectado
 */
export function enrichIntercomConfig(config: IntercomConfig): IntercomConfig {
  const deviceType = detectDeviceType(config.cameraIP);
  const deviceInfo = getDeviceInfo(deviceType);
  
  return {
    ...config,
    deviceType,
    supportsIntercom: deviceInfo.intercomSupport,
  };
}

/**
 * Registra un nuevo dispositivo conocido
 */
export function registerKnownDevice(ip: string, deviceType: DeviceType): void {
  KNOWN_DEVICES.set(ip, deviceType);
  console.log(`📝 Dispositivo registrado: ${ip} -> ${deviceType}`);
}

/**
 * Obtiene la lista de todos los dispositivos conocidos
 */
export function getKnownDevices(): Array<{ ip: string; type: DeviceType }> {
  return Array.from(KNOWN_DEVICES.entries()).map(([ip, type]) => ({ ip, type }));
}

