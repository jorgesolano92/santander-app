# Configuración de Audio Bidireccional para AXIS I8116-E

## 🎯 Descripción General

Este documento describe cómo configurar y usar la comunicación de audio bidireccional con el **AXIS I8116-E Network Video Intercom**.

---

## 📋 Especificaciones Técnicas

### Modelo Soportado
- **AXIS I8116-E Network Video Intercom**

### Características de Audio
- ✅ **Audio bidireccional de alta calidad**
- ✅ **Cancelación de eco integrada**
- ✅ **Reducción de ruido**
- ✅ **Micrófono y altavoz integrados**
- ✅ **Soporte SIP (Session Initiation Protocol)**
- ✅ **API VAPIX para control de audio**
- ✅ **Compatible con ONVIF (perfiles G, M, S, T)**

### Protocolos Soportados
1. **VAPIX API** (Recomendado)
   - Endpoint: `/axis-cgi/audio/transmit.cgi`
   - Método: POST con audio en formato básico
   - Autenticación: Basic Auth

2. **SIP (Session Initiation Protocol)**
   - Puerto: 5060 (UDP/TCP)
   - Codecs: G.711, G.722, AAC, OPUS

3. **ONVIF**
   - Perfiles: G, M, S, T
   - Audio Input/Output Services

---

## 🔧 Configuración del Dispositivo AXIS

### 1. Acceder a la Interfaz Web

```
http://[IP_DEL_AXIS]
```

**Credenciales por defecto:**
- Usuario: `root`
- Contraseña: `pass` (cambiar en primera configuración)

### 2. Habilitar Audio Bidireccional

1. Ir a **System > Audio**
2. Habilitar:
   - ✅ **Audio Input** (Micrófono)
   - ✅ **Audio Output** (Altavoz)
   - ✅ **Echo Cancellation**
   - ✅ **Noise Reduction**

3. Configurar niveles:
   - **Input Gain**: 70-80%
   - **Output Gain**: 70-80%

### 3. Configurar VAPIX API

1. Ir a **System > Security > Users**
2. Crear/Verificar usuario con permisos:
   - ✅ **Viewer**
   - ✅ **Operator**
   - ✅ **Administrator** (para audio)

### 4. Configurar Red

1. Ir a **System > Network > TCP/IP**
2. Configurar IP estática (recomendado):
   ```
   IP: 192.168.1.XXX
   Máscara: 255.255.255.0
   Gateway: 192.168.1.1
   ```

3. Verificar conectividad:
   ```bash
   ping [IP_DEL_AXIS]
   ```

---

## 💻 Integración con la Aplicación

### Uso del Componente AxisAudioControl

```typescript
import AxisAudioControl from '../components/AxisAudioControl';
import { IntercomConfig } from '../components/IntercomConfigurationModal';

// Configuración del intercomunicador AXIS
const axisConfig: IntercomConfig = {
  cameraIP: '192.168.1.XXX',
  rtspPort: 554,
  onvifUsername: 'root',
  onvifPassword: 'tu_contraseña',
  // ... otros campos
};

// Uso en tu componente
<AxisAudioControl 
  intercomConfig={axisConfig}
  doorName="Puerta Principal"
  isVisible={true}
/>
```

### Arquitectura de Audio

#### Modo Web (via Proxy)
```
[Navegador Web] 
    ↓ (getUserMedia)
[Micrófono del PC]
    ↓ (WebAudio API)
[Procesamiento de Audio]
    ↓ (HTTP POST)
[Proxy Node.js:3001]
    ↓ (VAPIX API)
[AXIS I8116-E]
```

#### Modo Android (Directo)
```
[App Android]
    ↓ (getUserMedia)
[Micrófono del Teléfono]
    ↓ (WebAudio API)
[Procesamiento de Audio]
    ↓ (HTTP POST directo)
[AXIS I8116-E]
```

---

## 🔌 Endpoints del Proxy

### 1. Enviar Audio a AXIS

**POST** `/axis/audio/transmit`

**Body:**
```json
{
  "device_ip": "192.168.1.XXX",
  "username": "root",
  "password": "tu_contraseña",
  "audio_data": "base64_encoded_audio_data",
  "codec": "G711",
  "sample_rate": 16000,
  "channels": 1
}
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "message": "Audio enviado correctamente a AXIS",
  "device_ip": "192.168.1.XXX",
  "bytes_sent": 8192,
  "method": "VAPIX"
}
```

### 2. Verificar Capacidades de Audio

**GET** `/axis/audio/capabilities/:device_ip?username=root&password=pass`

**Respuesta Exitosa:**
```json
{
  "success": true,
  "message": "Capacidades de audio obtenidas",
  "device_ip": "192.168.1.XXX",
  "capabilities": "audio_input=yes\naudio_output=yes\n..."
}
```

---

## 🧪 Pruebas y Verificación

### 1. Verificar Conectividad

```bash
# Windows PowerShell
Invoke-WebRequest -Uri "http://192.168.1.XXX/axis-cgi/audio/capabilities.cgi" `
  -Headers @{Authorization="Basic $(
    [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes('root:pass'))
  )"}
```

### 2. Probar Endpoint del Proxy

```bash
# Windows PowerShell
$body = @{
  device_ip = "192.168.1.XXX"
  username = "root"
  password = "tu_contraseña"
  audio_data = "dGVzdA=="
  codec = "G711"
  sample_rate = 16000
  channels = 1
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/axis/audio/transmit" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

### 3. Verificar Audio en la Aplicación

1. Abrir la aplicación
2. Ir a **Modo Manual**
3. Seleccionar puerta con AXIS I8116-E
4. Presionar **"INICIAR LLAMADA"**
5. Hablar por el micrófono
6. Verificar que el audio se escucha en el AXIS

---

## 📊 Calidad de Audio

### Configuraciones Recomendadas

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| Codec | G711 | Alta calidad, baja latencia |
| Sample Rate | 16000 Hz | Calidad telefónica |
| Channels | 1 (Mono) | Suficiente para voz |
| Bit Rate | 128 kbps | Óptimo para voz |
| Echo Cancellation | Habilitado | Reduce retroalimentación |
| Noise Reduction | Habilitado | Mejora claridad |

### Latencia Esperada

| Modo | Latencia |
|------|----------|
| Android (Directo) | 100-200 ms |
| Web (Proxy) | 200-400 ms |

---

## 🔒 Seguridad

### Recomendaciones

1. **Cambiar contraseña por defecto**
   ```
   Usuario: root
   Contraseña: [contraseña_segura]
   ```

2. **Usar HTTPS** (si el AXIS lo soporta)
   ```
   https://[IP_DEL_AXIS]
   ```

3. **Configurar firewall**
   - Permitir solo IPs autorizadas
   - Bloquear acceso desde internet público

4. **Actualizar firmware**
   - Ir a **System > Maintenance > Firmware Upgrade**
   - Descargar última versión desde axis.com

---

## 🐛 Solución de Problemas

### Problema 1: No se escucha audio

**Posibles causas:**
- Audio Input/Output deshabilitado
- Volumen muy bajo
- Credenciales incorrectas

**Solución:**
1. Verificar configuración de audio en AXIS
2. Aumentar Input/Output Gain
3. Verificar usuario y contraseña

### Problema 2: Mucho eco

**Posibles causas:**
- Echo Cancellation deshabilitado
- Volumen de salida muy alto

**Solución:**
1. Habilitar **Echo Cancellation**
2. Reducir **Output Gain** a 60-70%
3. Activar **Noise Reduction**

### Problema 3: Error de conectividad

**Posibles causas:**
- IP incorrecta
- Firewall bloqueando
- Dispositivo apagado

**Solución:**
1. Verificar ping al dispositivo
2. Revisar configuración de red
3. Verificar firewall/router

### Problema 4: Latencia alta

**Posibles causas:**
- Red congestionada
- Codec pesado (AAC, OPUS)
- Proxy lento

**Solución:**
1. Usar codec G711 (más ligero)
2. Verificar ancho de banda
3. Usar modo directo (Android)

---

## 📚 Referencias

- [AXIS VAPIX Documentation](https://www.axis.com/vapix-library/)
- [AXIS I8116-E Product Page](https://www.axis.com/products/axis-i8116-e)
- [ONVIF Specifications](https://www.onvif.org/specs/)
- [SIP Protocol RFC 3261](https://www.rfc-editor.org/rfc/rfc3261)

---

## ✅ Checklist de Configuración

- [ ] AXIS I8116-E conectado a la red
- [ ] IP estática configurada
- [ ] Audio Input/Output habilitado
- [ ] Echo Cancellation activado
- [ ] Noise Reduction activado
- [ ] Usuario con permisos creado
- [ ] Contraseña segura configurada
- [ ] Conectividad verificada (ping)
- [ ] Endpoint VAPIX probado
- [ ] Proxy Node.js ejecutándose
- [ ] Componente AxisAudioControl integrado
- [ ] Prueba de audio exitosa

---

**Última actualización:** 18 de Octubre, 2025  
**Versión:** 1.0.0

