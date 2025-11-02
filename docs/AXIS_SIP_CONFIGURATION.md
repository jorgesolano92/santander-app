# Configuración SIP para AXIS I8116-E

## 📞 Descripción General

El AXIS I8116-E soporta comunicación SIP (Session Initiation Protocol) en modo **peer-to-peer**, lo que permite realizar llamadas directas sin necesidad de un servidor SIP central (PBX).

---

## 🔧 Configuración Actual del AXIS

### Cuenta SIP Configurada

```json
{
  "axcall:SetSIPAccount": {
    "SIPAccount": {
      "Name": "tests",
      "UserId": "ceroideas",
      "Attribute": [],
      "Enabled": true,
      "IsDefault": false,
      "SIPProxies": [],
      "SecondarySIPProxies": [],
      "DTMFConfigurationId": "dtmf_config_default",
      "PublicDomain": null,
      "Password": null,
      "Id": "sip_account_1"
    }
  }
}
```

#### Parámetros Clave:
- **Nombre de cuenta**: `tests`
- **Usuario SIP**: `ceroideas`
- **Modo**: Peer-to-peer (sin proxy SIP)
- **Estado**: Habilitado
- **Contraseña**: No configurada (conexión local)

### Configuración DTMF

```json
{
  "axcall:SetDTMFConfiguration": {
    "DTMFConfiguration": {
      "Id": "dtmf_config_default",
      "Name": "Peer-to-peer accounts",
      "RFC2833": true,
      "RFC2976": true,
      "DTMFTriggerId": []
    }
  }
}
```

#### Parámetros Clave:
- **RFC2833**: ✅ Habilitado (DTMF en RTP)
- **RFC2976**: ✅ Habilitado (INFO method)
- **Uso**: Tonos DTMF para apertura de puertas

---

## 🎯 Ventajas de SIP vs VAPIX

| Característica | SIP | VAPIX (HTTP POST) |
|----------------|-----|-------------------|
| **Latencia** | ~100-200ms | ~300-500ms |
| **Calidad** | Alta (G.711, G.722) | Media (compresión) |
| **Bidireccional** | Nativo | Requiere polling |
| **Echo Cancellation** | Hardware | Software |
| **Estandarización** | RFC 3261 | Propietario AXIS |
| **Compatibilidad** | Universal | Solo AXIS |
| **Complejidad** | Media | Baja |

---

## 🔌 Puertos y Protocolos

### Puertos Requeridos

| Puerto | Protocolo | Uso |
|--------|-----------|-----|
| **5060** | UDP/TCP | SIP Signaling |
| **10000-20000** | UDP | RTP (Audio Stream) |
| **80** | TCP | AXIS Web UI |
| **554** | TCP | RTSP (Video) |

### Configuración de Firewall

```powershell
# Windows PowerShell - Abrir puertos SIP
New-NetFirewallRule -DisplayName "AXIS SIP Signaling" -Direction Inbound -Protocol UDP -LocalPort 5060 -Action Allow
New-NetFirewallRule -DisplayName "AXIS RTP Audio" -Direction Inbound -Protocol UDP -LocalPort 10000-20000 -Action Allow
```

---

## 📡 Flujo de Llamada SIP

### 1. Iniciar Llamada (INVITE)

```
[App] --INVITE--> [AXIS I8116-E]
      <--100 Trying--
      <--180 Ringing--
      <--200 OK--
      --ACK-->
```

### 2. Intercambio de Medios (RTP)

```
[App Micrófono] <--RTP Audio--> [AXIS Altavoz]
[App Altavoz]   <--RTP Audio--> [AXIS Micrófono]
```

### 3. Terminar Llamada (BYE)

```
[App] --BYE--> [AXIS]
      <--200 OK--
```

---

## 🛠️ Implementación en la App

### Opción 1: Usar AxisSIPService (Nuevo)

```typescript
import { getAxisSIPService } from '../services/AxisSIPService';

const sipService = getAxisSIPService('192.168.1.130');

// Iniciar llamada SIP
await sipService.startSIPCall({
  deviceIP: '192.168.1.130',
  sipAccount: 'tests',
  sipUserId: 'ceroideas',
  useProxy: false, // Directo en Android, true en Web
});

// Silenciar micrófono
sipService.muteMicrophone(true);

// Terminar llamada
await sipService.endSIPCall();
```

### Opción 2: Usar AxisAudioService (Actual)

```typescript
import { getAxisAudioService } from '../services/AxisAudioService';

const audioService = getAxisAudioService('192.168.1.130');

// Enviar audio via VAPIX
await audioService.startAudioStream({
  deviceIP: '192.168.1.130',
  username: 'root',
  password: 'pass',
  audioCodec: 'G711',
  sampleRate: 16000,
  channels: 1,
  useProxy: Platform.OS === 'web',
  proxyUrl: 'http://localhost:3001',
});
```

---

## 📊 Comparación de Métodos

### SIP (Recomendado para Producción)

**Ventajas:**
- ✅ **Latencia ultra-baja** (~100ms)
- ✅ **Full-duplex nativo** (bidireccional simultáneo)
- ✅ **Calidad profesional** (codecs G.711, G.722, OPUS)
- ✅ **Estándar universal** (RFC 3261)
- ✅ **Echo cancellation hardware**
- ✅ **Escalable** (múltiples llamadas)

**Desventajas:**
- ⚠️ **Más complejo** de implementar
- ⚠️ **Requiere librería SIP** (sip.js, jssip)
- ⚠️ **Configuración de firewall** necesaria
- ⚠️ **WebRTC en navegadores** puede tener limitaciones

### VAPIX (Actual, funcional)

**Ventajas:**
- ✅ **Simple de implementar**
- ✅ **No requiere firewall** especial
- ✅ **Funciona en web** sin problemas CORS (con proxy)
- ✅ **Buffering optimizado** (ya implementado)

**Desventajas:**
- ⚠️ **Mayor latencia** (~300-500ms)
- ⚠️ **Simplex** (envío en una dirección a la vez)
- ⚠️ **Más carga en servidor** (HTTP POST continuo)
- ⚠️ **Calidad media** por compresión

---

## 🚀 Migración a SIP (Opcional)

Si quieres migrar de VAPIX a SIP para mejor calidad:

### Paso 1: Instalar Librería SIP

```bash
npm install jssip
npm install @types/jssip --save-dev
```

### Paso 2: Integrar jssip en AxisSIPService

```typescript
import JsSIP from 'jssip';

// Configurar UA (User Agent)
const socket = new JsSIP.WebSocketInterface('ws://192.168.1.130:5060');
const configuration = {
  sockets: [socket],
  uri: 'sip:app@192.168.1.130',
  password: null,
  display_name: 'Puertas Santander App',
};

const ua = new JsSIP.UA(configuration);

// Iniciar UA
ua.start();

// Hacer llamada
const eventHandlers = {
  'progress': (e: any) => console.log('Llamada en progreso'),
  'failed': (e: any) => console.error('Llamada falló'),
  'ended': (e: any) => console.log('Llamada terminada'),
  'confirmed': (e: any) => console.log('Llamada confirmada'),
};

const options = {
  eventHandlers: eventHandlers,
  mediaConstraints: {
    audio: true,
    video: false,
  },
};

ua.call('sip:ceroideas@192.168.1.130', options);
```

### Paso 3: Actualizar AxisAudioControl

```typescript
// En components/AxisAudioControl.tsx
import { getAxisSIPService } from '../services/AxisSIPService';

const sipService = getAxisSIPService(deviceId);

const startCall = async () => {
  await sipService.startSIPCall({
    deviceIP: intercomConfig.cameraIP,
    sipAccount: 'tests',
    sipUserId: 'ceroideas',
  });
};
```

---

## 🔍 Testing y Debugging

### Verificar Puerto SIP Abierto

```powershell
# Windows PowerShell
Test-NetConnection -ComputerName 192.168.1.130 -Port 5060
```

**Resultado esperado:**
```
TcpTestSucceeded : True
```

### Capturar Tráfico SIP

```powershell
# Instalar Wireshark
# Filtro: sip || rtp
# Puerto: 5060 (SIP), 10000-20000 (RTP)
```

### Logs de AXIS

1. Acceder a `http://192.168.1.130`
2. Ir a **System > Logs**
3. Filtrar por: `SIP` o `Call`

---

## 📝 Recomendaciones

### Para Desarrollo (Actual)
- ✅ **Usar VAPIX (AxisAudioService)**
- ✅ **Buffering ya optimizado**
- ✅ **Funciona en web y Android**
- ✅ **Simple y estable**

### Para Producción (Futuro)
- 🎯 **Migrar a SIP (AxisSIPService)**
- 🎯 **Usar jssip o sip.js**
- 🎯 **Latencia ultra-baja**
- 🎯 **Calidad profesional**

---

## 🔗 Referencias

- [AXIS Call Management API](https://www.axis.com/vapix-library/subjects/t10102231/section/t10090712/display)
- [SIP Protocol RFC 3261](https://www.rfc-editor.org/rfc/rfc3261)
- [jssip Documentation](https://jssip.net/documentation/)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [DTMF RFC 2833](https://www.rfc-editor.org/rfc/rfc2833)

---

## ✅ Checklist

### Configuración Actual (VAPIX)
- [x] AXIS configurado en 192.168.1.130
- [x] Cuenta SIP: tests / ceroideas
- [x] DTMF habilitado (RFC2833 + RFC2976)
- [x] AxisAudioService implementado
- [x] Buffering optimizado
- [x] 2 peticiones/segundo
- [x] Funciona en web y Android

### Migración a SIP (Opcional)
- [ ] Instalar jssip
- [ ] Implementar AxisSIPService completo
- [ ] Configurar WebRTC
- [ ] Abrir puertos 5060 y 10000-20000
- [ ] Pruebas de latencia
- [ ] Pruebas de calidad de audio
- [ ] Integrar en UI

---

**Última actualización:** 18 de Octubre, 2025  
**Versión:** 1.0.0  
**Estado:** Configuración SIP documentada, VAPIX implementado y funcional

