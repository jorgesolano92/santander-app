# 🎤 Envío de Audio a Cámaras Safire

Esta funcionalidad permite enviar audio desde la aplicación hacia las cámaras Safire a través del intercomunicador.

## 📋 **Requisitos de la Cámara Safire**

### **Configuración de Red Necesaria:**
1. **RTSP habilitado** - Puerto 554 (video) + Puerto 555 (audio)
2. **ONVIF habilitado** - Para autenticación y configuración
3. **P2P habilitado** - Para acceso móvil (opcional)
4. **Audio bidireccional** - Configurado en la cámara

### **Configuración en la Cámara:**
```
Network > RTSP:
- Puerto RTSP: 554
- Puerto Audio: 555
- Path Audio: /audio

Network > ONVIF:
- Usuarios ONVIF configurados
- Permisos de audio habilitados

Network > Port:
- HTTP: 80
- HTTPS: 443
- RTSP: 554
- Audio: 555
```

## 🔧 **Implementación Técnica**

### **1. Servicio de Audio (`AudioStreamService.ts`)**
- ✅ Captura de audio del micrófono
- ✅ Codificación en tiempo real
- ✅ Envío via RTSP a la cámara
- ✅ Control de calidad de audio

### **2. Configuración Safire (`SafireCameraConfig.ts`)**
- ✅ Configuraciones predefinidas por modelo
- ✅ Detección automática de modelo
- ✅ URLs RTSP específicas para audio
- ✅ Verificación de soporte de audio

### **3. Control de Audio (`AudioStreamControl.tsx`)**
- ✅ Botón de inicio/parada de audio
- ✅ Control de micrófono (mute/unmute)
- ✅ Control de altavoz
- ✅ Indicadores de estado

## 🎯 **Funcionalidades Implementadas**

### **Envío de Audio:**
- 🎤 **Captura de micrófono** - Acceso al micrófono del dispositivo
- 📡 **Streaming RTSP** - Envío en tiempo real a la cámara
- 🔊 **Control de volumen** - Ajuste de nivel de audio
- 🔇 **Silenciar micrófono** - Control de mute/unmute

### **Configuración Automática:**
- 🔍 **Detección de modelo** - Identifica automáticamente el modelo Safire
- ⚙️ **Configuración óptima** - Aplica configuración según el modelo
- ✅ **Verificación de soporte** - Comprueba si la cámara soporta audio
- 🔧 **Configuración remota** - Configura la cámara automáticamente

## 📱 **Uso en la Aplicación**

### **1. Acceso al Control de Audio:**
```
Modo Manual > Puerta con Intercomunicador > Control de Audio
```

### **2. Controles Disponibles:**
- **ENVIAR AUDIO** - Inicia el envío de audio a la cámara
- **DETENER AUDIO** - Para el envío de audio
- **MICRÓFONO** - Silencia/activa el micrófono
- **ALTAVOZ** - Controla el altavoz del dispositivo

### **3. Indicadores de Estado:**
- 🟢 **CONECTADO** - Audio enviándose correctamente
- 🟡 **ENVIANDO** - Iniciando conexión
- 🔴 **ERROR** - Problema de conexión
- ⚪ **DESCONECTADO** - No hay envío de audio

## 🔧 **Configuración Técnica**

### **Modelos Safire Soportados:**
- **Safire-IP** - Audio básico (PCMU, 8kHz)
- **Safire-HD** - Audio HD (AAC, 44.1kHz)
- **Safire-4K** - Audio 4K (AAC, 48kHz)

### **Códecs de Audio:**
- **PCMU** - G.711 μ-law (8kHz, 1 canal)
- **PCMA** - G.711 A-law (8kHz, 1 canal)
- **AAC** - Advanced Audio Coding (44.1kHz/48kHz, 2 canales)
- **G722** - G.722 (16kHz, 1 canal)

### **Configuración de Red:**
```typescript
// Ejemplo de configuración
const audioConfig = {
  cameraIP: '192.168.1.100',
  rtspPort: 554,
  username: 'admin',
  password: 'password123',
  audioCodec: 'AAC',
  sampleRate: 44100,
  channels: 2,
  bitRate: 128000
};
```

## 🚀 **Implementación en Código**

### **1. Iniciar Envío de Audio:**
```typescript
import { audioStreamService } from '../services/AudioStreamService';

const config = {
  cameraIP: '192.168.1.100',
  rtspPort: 554,
  username: 'admin',
  password: 'password123'
};

const success = await audioStreamService.startAudioStream(config);
```

### **2. Detener Envío de Audio:**
```typescript
await audioStreamService.stopAudioStream();
```

### **3. Verificar Soporte de Audio:**
```typescript
const supported = await audioStreamService.checkAudioSupport(config);
```

## 🔍 **Troubleshooting**

### **Problemas Comunes:**

#### **1. "Audio no soportado"**
- ✅ Verificar que la cámara tenga audio habilitado
- ✅ Comprobar configuración ONVIF
- ✅ Verificar puertos RTSP (554/555)

#### **2. "Error de conexión"**
- ✅ Verificar IP de la cámara
- ✅ Comprobar credenciales ONVIF
- ✅ Verificar conectividad de red

#### **3. "Sin audio"**
- ✅ Verificar permisos de micrófono
- ✅ Comprobar configuración de audio de la cámara
- ✅ Verificar códec de audio soportado

### **Logs de Debug:**
```bash
# Verificar logs en consola
🎤 Iniciando envío de audio a cámara: 192.168.1.100
✅ Cámara Safire Safire-HD soporta audio
📤 Enviando 1024 bytes de audio a 192.168.1.100
✅ Audio enviado a 192.168.1.100: 1024 bytes
```

## 📋 **Checklist de Configuración**

### **En la Cámara Safire:**
- [ ] RTSP habilitado (puerto 554)
- [ ] Audio RTSP habilitado (puerto 555)
- [ ] ONVIF habilitado con usuarios configurados
- [ ] Audio bidireccional habilitado
- [ ] Red configurada correctamente

### **En la Aplicación:**
- [ ] Permisos de micrófono otorgados
- [ ] Configuración de intercomunicador completa
- [ ] IP de cámara configurada
- [ ] Credenciales ONVIF configuradas

## 🎯 **Próximas Mejoras**

- [ ] **Grabación de audio** - Guardar conversaciones
- [ ] **Filtros de audio** - Reducción de ruido
- [ ] **Audio multicanal** - Múltiples cámaras simultáneas
- [ ] **Configuración avanzada** - Ajustes de calidad
- [ ] **Historial de audio** - Log de comunicaciones
