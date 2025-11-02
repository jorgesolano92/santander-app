# 🎤 Configuración de Audio en Cámaras Safire

## 📋 **Configuración Necesaria en la Cámara**

### **1. Habilitar Audio Bidireccional**
```
Configuración > Audio > Audio Bidireccional: ✅ HABILITADO
```

### **2. Configurar Endpoints de Audio**
```
Network > Port Settings:
- HTTP: 80
- HTTPS: 443
- RTSP: 554
- Audio Input: 555
```

### **3. Habilitar CGI para Audio**
```
Network > CGI Settings:
- audio_input.cgi: ✅ HABILITADO
- rtsp_audio.cgi: ✅ HABILITADO
```

### **4. Configurar Usuarios ONVIF**
```
Network > ONVIF > Users:
- Usuario: admin
- Contraseña: [tu_contraseña]
- Permisos: Audio Input ✅
```

---

## 🔧 **Endpoints de Audio de Safire**

### **Endpoint Principal:**
```
POST http://[IP_CAMARA]/cgi-bin/audio_input.cgi
Content-Type: application/json
Authorization: Basic [base64(username:password)]

Body:
{
  "audio_data": "[base64_encoded_audio]",
  "timestamp": 1234567890,
  "codec": "PCMU",
  "sample_rate": 8000,
  "channels": 1,
  "bit_rate": 64000
}
```

### **Endpoint Alternativo (RTSP):**
```
POST http://[IP_CAMARA]/cgi-bin/rtsp_audio.cgi
Content-Type: application/json
Authorization: Basic [base64(username:password)]

Body:
{
  "method": "ANNOUNCE",
  "url": "rtsp://[IP]:555/audio",
  "audio_data": "[base64_encoded_audio]",
  "headers": {
    "Content-Type": "application/sdp",
    "CSeq": 123
  }
}
```

---

## 🎯 **Verificación de Funcionamiento**

### **1. Probar Conectividad:**
```bash
curl -X GET http://192.168.1.100/cgi-bin/audio_input.cgi \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ="
```

### **2. Probar Envío de Audio:**
```bash
curl -X POST http://192.168.1.100/cgi-bin/audio_input.cgi \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -d '{"audio_data":"test","timestamp":1234567890}'
```

### **3. Verificar Logs de la Cámara:**
```
Sistema > Logs > Audio Input
- Debería mostrar: "Audio input received"
```

---

## 🔍 **Troubleshooting**

### **Error: "HTTP 404 - Not Found"**
- ✅ Verificar que `audio_input.cgi` esté habilitado
- ✅ Comprobar ruta: `/cgi-bin/audio_input.cgi`
- ✅ Verificar permisos de usuario

### **Error: "HTTP 401 - Unauthorized"**
- ✅ Verificar credenciales ONVIF
- ✅ Comprobar que el usuario tenga permisos de audio
- ✅ Verificar formato de Authorization header

### **Error: "HTTP 500 - Internal Server Error"**
- ✅ Verificar que el audio bidireccional esté habilitado
- ✅ Comprobar configuración de codec
- ✅ Verificar logs de la cámara

### **Audio no se reproduce en la cámara:**
- ✅ Verificar que el altavoz esté habilitado
- ✅ Comprobar volumen de la cámara
- ✅ Verificar que el codec sea compatible

---

## 📱 **Logs de la Aplicación**

### **Envío Exitoso:**
```
📤 Enviando 1948 bytes de audio a 192.168.1.100
✅ Audio enviado exitosamente a 192.168.1.100: 1948 bytes
```

### **Envío con Fallback:**
```
📤 Enviando 1948 bytes de audio a 192.168.1.100
❌ Error enviando audio a 192.168.1.100: HTTP 404
🔄 Intentando envío alternativo via RTSP: rtsp://192.168.1.100:555/audio
✅ Audio enviado via RTSP a 192.168.1.100: 1948 bytes
```

### **Envío Fallido:**
```
📤 Enviando 1948 bytes de audio a 192.168.1.100
❌ Error enviando audio a 192.168.1.100: HTTP 401
🔄 Intentando envío alternativo via RTSP: rtsp://192.168.1.100:555/audio
❌ Error en envío alternativo a 192.168.1.100: HTTP 401
⚠️ Audio no se pudo enviar a 192.168.1.100, pero el stream continúa
```

---

## 🚀 **Configuración Avanzada**

### **Codecs Soportados:**
- **PCMU** (G.711 μ-law) - 8kHz, 1 canal
- **PCMA** (G.711 A-law) - 8kHz, 1 canal  
- **G722** - 16kHz, 1 canal
- **AAC** - 44.1kHz/48kHz, 2 canales

### **Configuración de Calidad:**
```javascript
// Audio de alta calidad
{
  codec: 'AAC',
  sample_rate: 44100,
  channels: 2,
  bit_rate: 128000
}

// Audio de baja latencia
{
  codec: 'PCMU',
  sample_rate: 8000,
  channels: 1,
  bit_rate: 64000
}
```

### **Configuración de Red:**
```javascript
// Para redes lentas
{
  timeout: 10000,
  retry_attempts: 3,
  chunk_size: 1024
}

// Para redes rápidas
{
  timeout: 3000,
  retry_attempts: 1,
  chunk_size: 4096
}
```

---

## ✅ **Checklist de Configuración**

### **En la Cámara Safire:**
- [ ] Audio bidireccional habilitado
- [ ] Endpoints CGI habilitados
- [ ] Usuarios ONVIF configurados
- [ ] Permisos de audio otorgados
- [ ] Puertos de red configurados
- [ ] Altavoz habilitado y con volumen

### **En la Aplicación:**
- [ ] IP de cámara configurada
- [ ] Credenciales ONVIF correctas
- [ ] Permisos de micrófono otorgados
- [ ] Configuración de audio apropiada
- [ ] Red conectada y estable

---

## 🎯 **Próximos Pasos**

1. **Configurar la cámara** según esta guía
2. **Probar conectividad** con los comandos curl
3. **Verificar logs** en la aplicación
4. **Ajustar configuración** si es necesario
5. **Probar envío de audio** desde la aplicación
