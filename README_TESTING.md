# Guía Rápida para Probar Safire Connect

Esta guía te ayudará a probar Safire Connect y analizar cómo funciona el audio bidireccional.

## 🚀 Inicio Rápido

### 1. Instalar Dependencias

```bash
# En el directorio raíz
npm install

# En el directorio proxy
cd proxy
npm install
cd ..
```

### 2. Iniciar el Proxy

```bash
# En el directorio proxy
cd proxy
npm start
```

El proxy estará disponible en: `http://localhost:3001`

### 3. Ejecutar Pruebas Automatizadas

```bash
# Desde el directorio raíz
node scripts/test-safire-audio.js
```

O desde el directorio proxy:

```bash
cd proxy
npm test
```

## ⚠️ Importante: Safire Connect es una APK Android

Safire Connect es una **aplicación Android (APK)**, no una aplicación web. Los métodos de análisis son diferentes.

## 📋 Métodos de Prueba

### Opción 1: Análisis de Tráfico con Proxy HTTP (Recomendado para Android)

**Configurar Fiddler/Charles como proxy:**

1. **En Windows (PC):**
   - Instalar Fiddler Classic: https://www.telerik.com/fiddler
   - Tools → Options → Connections
   - ☑ Allow remote computers to connect
   - Puerto: 8888

2. **En Android:**
   - Settings → Wi-Fi → Modificar red
   - Avanzado → Proxy → Manual
   - Host: [IP_DE_TU_PC]
   - Puerto: 8888
   - Instalar certificado Fiddler desde: `http://[IP_DE_TU_PC]:8888`

3. **Analizar tráfico:**
   - Abrir Safire Connect
   - Iniciar audio bidireccional
   - Ver tráfico en Fiddler

**Ver guía completa:** [SAFIRE_CONNECT_ANDROID_ANALYSIS.md](./docs/SAFIRE_CONNECT_ANDROID_ANALYSIS.md)

### Opción 2: Script Automatizado (Probar nuestros endpoints)

El script `test-safire-audio.js` prueba automáticamente:
- ✅ Verificar soporte de audio
- ✅ Obtener canales de audio
- ✅ Probar puertos 8000, 8080, 7681
- ✅ Iniciar y detener audio bidireccional

**Ejecutar:**
```bash
node scripts/test-safire-audio.js
```

**Con variables de entorno:**
```bash
CAMERA_IP=192.168.1.117 \
SAFIRE_USERNAME=ceroideas \
SAFIRE_PASSWORD=87654321 \
PROXY_URL=http://localhost:3001 \
node scripts/test-safire-audio.js
```

### Opción 2: Análisis de Tráfico con Wireshark

**Instalación:**
1. Descargar Wireshark: https://www.wireshark.org/
2. Instalar en tu sistema

**Pasos:**
1. Abrir Wireshark
2. Seleccionar interfaz de red activa
3. Iniciar captura (botón azul o `Ctrl+E`)
4. Filtrar por IP: `ip.addr == 192.168.1.117`
5. Abrir Safire Connect y usar audio bidireccional
6. Analizar tráfico capturado

**Filtros útiles:**
```
# Filtrar por puertos de audio
tcp.port == 8000 || tcp.port == 8080 || tcp.port == 7681

# Filtrar por protocolos de audio
rtp || rtcp || sip || websocket

# Filtrar por IP y puerto
ip.addr == 192.168.1.117 && (tcp.port == 8000 || tcp.port == 8080 || tcp.port == 7681)
```

### Opción 3: Pruebas Manuales con curl

#### Obtener Canales de Audio

```bash
curl -X POST http://localhost:3001/safire/audio-channels \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "192.168.1.117",
    "username": "ceroideas",
    "password": "87654321"
  }'
```

#### Iniciar Audio Bidireccional

```bash
curl -X POST http://localhost:3001/safire/start-voice-talk \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "192.168.1.117",
    "username": "ceroideas",
    "password": "87654321",
    "channelId": 1,
    "port": 8000,
    "method": "dataport"
  }'
```

#### Detener Audio Bidireccional

```bash
curl -X POST http://localhost:3001/safire/stop-voice-talk \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "192.168.1.117",
    "username": "ceroideas",
    "password": "87654321",
    "method": "dataport"
  }'
```

### Opción 4: Análisis con DevTools del Navegador

Si Safire Connect es una aplicación web:

1. Abrir DevTools (`F12` o `Ctrl+Shift+I`)
2. Ir a la pestaña "Network"
3. Filtrar por: `WS` (WebSocket), `Fetch/XHR`, `Media`
4. Iniciar audio bidireccional en Safire Connect
5. Analizar requests y conexiones

## 🔍 Qué Buscar

### Puertos Utilizados
- ✅ Puerto 8000 (Data Port)
- ✅ Puerto 8080 (Persistent connection Port)
- ✅ Puerto 7681 (WebSocket Port)
- ✅ Otros puertos identificados

### Protocolos Identificados
- ✅ HTTP/HTTPS
- ✅ WebSocket (WS/WSS)
- ✅ RTSP
- ✅ RTP/RTCP
- ✅ SIP

### Endpoints Identificados
- ✅ URL para obtener canales
- ✅ URL para iniciar audio
- ✅ URL para detener audio
- ✅ URL para controlar micrófono/altavoz

### Formato de Datos
- ✅ Formato de autenticación
- ✅ Formato de requests (JSON/XML/Form)
- ✅ Formato de respuestas
- ✅ Formato de datos de audio

## 📊 Interpretación de Resultados

### Si el Script Funciona

Si el script encuentra un método funcional:
```
✅ Método funcional encontrado:
   - Método: DataPort
   - Puerto: 8000
   - Canal: 1
```

**Acción:** Usar ese método en la implementación.

### Si el Script No Funciona

Si todos los métodos están en modo simulado:
```
⚠️  No se encontró un método funcional
   Todos los métodos están en modo simulado
   Se requiere análisis de tráfico de Safire Connect
```

**Acción:** 
1. Analizar tráfico de Safire Connect con Wireshark
2. Documentar endpoints reales utilizados
3. Actualizar implementación

## 📝 Documentar Hallazgos

Después de las pruebas, documenta tus hallazgos en:

1. **`docs/SAFIRE_CONNECT_TESTING.md`** - Agregar sección de resultados
2. **`docs/SAFIRE_AUDIO_BIDIRECCIONAL.md`** - Actualizar con endpoints reales
3. **`proxy/index.js`** - Actualizar endpoints si es necesario

## 🛠️ Solución de Problemas

### El proxy no inicia

```bash
# Verificar que el puerto 3001 esté libre
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Mac/Linux

# Cambiar puerto si es necesario
PROXY_PORT=3002 npm start
```

### El script no puede conectar

```bash
# Verificar que el proxy esté ejecutándose
curl http://localhost:3001/health

# Verificar IP de la cámara
ping 192.168.1.117

# Verificar credenciales
# Probar con curl manualmente
```

### Wireshark no captura tráfico

1. Verificar que estés usando la interfaz de red correcta
2. Verificar que tengas permisos de administrador
3. Probar con modo promiscuo deshabilitado

## 📚 Documentación Adicional

- [SAFIRE_CONNECT_TESTING.md](./docs/SAFIRE_CONNECT_TESTING.md) - Guía completa de pruebas
- [SAFIRE_AUDIO_BIDIRECCIONAL.md](./docs/SAFIRE_AUDIO_BIDIRECCIONAL.md) - Implementación de audio
- [SAFIRE_AUTHENTICATION_RESULTS.md](./docs/SAFIRE_AUTHENTICATION_RESULTS.md) - Resultados de autenticación

## 🎯 Próximos Pasos

1. ✅ Ejecutar script de prueba automatizado
2. ✅ Analizar tráfico de Safire Connect con Wireshark
3. ✅ Documentar endpoints reales utilizados
4. ✅ Actualizar implementación con datos reales
5. ✅ Probar con la cámara real

## 💡 Tips

- **Ejecuta el script primero** para ver qué funciona automáticamente
- **Usa Wireshark** para análisis detallado del protocolo
- **Documenta todo** lo que encuentres
- **Prueba con diferentes puertos** si uno no funciona
- **Verifica credenciales** si hay errores de autenticación

