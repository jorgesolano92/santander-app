# 🎤 Servidor Proxy de Audio para Cámaras Safire

Este servidor proxy actúa como intermediario entre la aplicación web y las cámaras Safire para el envío de audio, evitando problemas de CORS.

## 🚀 **Instalación y Uso**

### **1. Instalar Dependencias:**
```bash
cd proxy
npm install
```

### **2. Iniciar Servidor:**
```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

### **3. Verificar Funcionamiento:**
```bash
# Verificar salud del servidor
curl http://localhost:3001/health

# Ver información del servidor
curl http://localhost:3001/info
```

---

## 📡 **Endpoints Disponibles**

### **POST /audio/stream**
Envía audio a una cámara Safire.

**Request:**
```json
{
  "camera_ip": "192.168.1.100",
  "camera_username": "admin",
  "camera_password": "password",
  "audio_data": "base64_encoded_audio",
  "timestamp": 1234567890,
  "codec": "PCMU",
  "sample_rate": 8000,
  "channels": 1,
  "bit_rate": 64000,
  "endpoint": "/cgi-bin/audio_input.cgi"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Audio enviado correctamente",
  "camera_ip": "192.168.1.100",
  "timestamp": 1234567890,
  "bytes_sent": 1948
}
```

### **GET /audio/check/:camera_ip**
Verifica conectividad con una cámara.

**Request:**
```
GET /audio/check/192.168.1.100?username=admin&password=password
```

**Response:**
```json
{
  "success": true,
  "message": "Cámara accesible",
  "camera_ip": "192.168.1.100",
  "status": 200
}
```

### **GET /audio/stats**
Obtiene estadísticas del servidor.

**Response:**
```json
{
  "success": true,
  "message": "Estadísticas de audio",
  "active_streams": 0,
  "total_bytes_sent": 0,
  "uptime": 3600
}
```

---

## 🔧 **Configuración**

### **Variables de Entorno:**
```bash
PORT=3001                    # Puerto del servidor
NODE_ENV=development        # Entorno (development/production)
```

### **CORS Configurado para:**
- `http://localhost:8081` (Expo Dev Server)
- `http://localhost:3000` (React Dev Server)
- `http://localhost:19006` (Expo Web)

---

## 🎯 **Flujo de Funcionamiento**

### **1. Aplicación Web:**
```
App → POST /audio/stream → Proxy Server
```

### **2. Proxy Server:**
```
Proxy → HTTP POST → Cámara Safire
```

### **3. Cámara Safire:**
```
Cámara → Procesa Audio → Reproduce en Altavoz
```

---

## 🔍 **Logs del Servidor**

### **Inicio Exitoso:**
```
🚀 Servidor proxy de audio iniciado en puerto 3001
📡 Endpoints disponibles:
   POST http://localhost:3001/audio/stream
   GET  http://localhost:3001/audio/check/:camera_ip
   GET  http://localhost:3001/audio/stats
   GET  http://localhost:3001/health
   GET  http://localhost:3001/info
🌐 CORS habilitado para: http://localhost:8081, http://localhost:3000, http://localhost:19006
```

### **Envío de Audio:**
```
🎤 Proxy: Recibiendo audio para cámara 192.168.1.100
✅ Proxy: Audio enviado exitosamente a 192.168.1.100
```

### **Error de Envío:**
```
🎤 Proxy: Recibiendo audio para cámara 192.168.1.100
❌ Proxy: Error enviando audio a 192.168.1.100: 404
```

---

## 🛠️ **Troubleshooting**

### **Error: "Cannot find module"**
```bash
cd proxy
npm install
```

### **Error: "Port already in use"**
```bash
# Cambiar puerto
PORT=3002 npm start
```

### **Error: "CORS policy"**
- Verificar que la URL de la aplicación esté en la lista de CORS
- Agregar nueva URL en `server.js` si es necesario

### **Error: "Camera not accessible"**
- Verificar IP de la cámara
- Comprobar credenciales
- Verificar conectividad de red

---

## 📋 **Checklist de Configuración**

### **Servidor Proxy:**
- [ ] Dependencias instaladas
- [ ] Servidor iniciado en puerto 3001
- [ ] CORS configurado correctamente
- [ ] Endpoints respondiendo

### **Aplicación:**
- [ ] URL del proxy configurada
- [ ] Modo proxy habilitado en web
- [ ] Modo directo habilitado en Android
- [ ] Configuración de cámara correcta

### **Cámara Safire:**
- [ ] Audio bidireccional habilitado
- [ ] Endpoints CGI habilitados
- [ ] Usuarios ONVIF configurados
- [ ] Red accesible desde el servidor

---

## 🚀 **Despliegue en Producción**

### **1. Configurar Variables de Entorno:**
```bash
export PORT=3001
export NODE_ENV=production
```

### **2. Usar PM2 (Recomendado):**
```bash
npm install -g pm2
pm2 start server.js --name "audio-proxy"
pm2 save
pm2 startup
```

### **3. Usar Docker:**
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

---

## 📞 **Soporte**

Para problemas o preguntas:
1. Verificar logs del servidor
2. Comprobar conectividad de red
3. Verificar configuración de CORS
4. Revisar configuración de la cámara
