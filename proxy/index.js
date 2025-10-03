const express = require('express');
const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();

// Middleware para CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Middleware para parsear JSON
app.use(express.json());

// Configuración para ignorar certificados SSL autofirmados (solo para desarrollo)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Crear directorio para archivos HLS
const hlsDir = path.join(__dirname, 'hls');
if (!fs.existsSync(hlsDir)) {
  fs.mkdirSync(hlsDir);
}

// Objeto para manejar múltiples procesos FFmpeg
const ffmpegProcesses = new Map();
const cameraConfigs = new Map();

// Configuración por defecto (para compatibilidad)
const defaultRtspUrl = 'rtsp://192.168.1.117:554/profile1';
const defaultCameraUrl = 'http://ceroideas:12345678@192.168.1.117:80/GetSnapshot/1';

// Función para iniciar la conversión RTSP a HLS para una cámara específica
function startRTSPToHLS(cameraId, cameraConfig) {
  console.log(`🎬 Iniciando FFmpeg para cámara ${cameraId}`);
  
  if (ffmpegProcesses.has(cameraId)) {
    console.log(`⚠️ FFmpeg ya está ejecutándose para la cámara ${cameraId}`);
    return;
  }

  // Crear directorio específico para esta cámara basado en la IP
  const ipFolderName = cameraConfig.ip.replace(/\./g, '_');
  const cameraHlsDir = path.join(hlsDir, ipFolderName);
  console.log(`📁 Creando directorio: ${cameraHlsDir}`);
  
  if (!fs.existsSync(cameraHlsDir)) {
    fs.mkdirSync(cameraHlsDir, { recursive: true });
    console.log(`✅ Directorio creado: ${cameraHlsDir}`);
  } else {
    console.log(`📁 Directorio ya existe: ${cameraHlsDir}`);
  }

  // Construir URL RTSP correcta para cámaras Safire
  let rtspUrl;
  if (cameraConfig.videoProfile === 'MainStream') {
    rtspUrl = `rtsp://${cameraConfig.username}:${cameraConfig.password}@${cameraConfig.ip}:${cameraConfig.rtspPort}/profile1`;
  } else if (cameraConfig.videoProfile === 'SubStream') {
    rtspUrl = `rtsp://${cameraConfig.username}:${cameraConfig.password}@${cameraConfig.ip}:${cameraConfig.rtspPort}/profile2`;
  } else {
    // Para compatibilidad con URLs personalizadas
    rtspUrl = `rtsp://${cameraConfig.username}:${cameraConfig.password}@${cameraConfig.ip}:${cameraConfig.rtspPort}/${cameraConfig.videoProfile}`;
  }
  
  const outputPath = path.join(cameraHlsDir, 'stream.m3u8');

  console.log(`Iniciando conversión RTSP a HLS para cámara ${cameraId}...`);
  console.log('URL RTSP:', rtspUrl);
  console.log('Archivo de salida:', outputPath);

  const ffmpegProcess = spawn('ffmpeg', [
    '-rtsp_transport', 'tcp',  // Usar TCP para mayor estabilidad
    '-i', rtspUrl,
    '-c:v', 'libx264',
    '-preset', 'veryfast',     // Codificación más rápida
    '-tune', 'zerolatency',    // Optimizado para baja latencia
    '-c:a', 'aac',
    '-ar', '44100',            // Frecuencia de audio
    '-b:a', '64k',             // Bitrate de audio
    '-f', 'hls',
    '-hls_time', '2',
    '-hls_list_size', '5',     // Mantener más segmentos
    '-hls_flags', 'delete_segments',
    '-hls_segment_filename', path.join(cameraHlsDir, 'segment_%03d.ts'),
    '-start_number', '1',      // Empezar desde segmento 1
    outputPath
  ]);

  ffmpegProcess.stdout.on('data', (data) => {
    console.log(`FFmpeg stdout (${cameraId}): ${data}`);
  });

  ffmpegProcess.stderr.on('data', (data) => {
    console.log(`FFmpeg stderr (${cameraId}): ${data}`);
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`FFmpeg proceso terminado para ${cameraId} con código ${code}`);
    ffmpegProcesses.delete(cameraId);
  });

  ffmpegProcess.on('error', (err) => {
    console.error(`Error al iniciar FFmpeg para ${cameraId}:`, err);
    ffmpegProcesses.delete(cameraId);
  });

  ffmpegProcesses.set(cameraId, ffmpegProcess);
  cameraConfigs.set(cameraId, cameraConfig);
}

// Endpoint para obtener snapshot (mantener funcionalidad existente)
app.get('/camera', async (req, res) => {
  const cameraUrl = 'http://ceroideas:12345678@192.168.1.117:80/GetSnapshot/1';

  try {
    const response = await axios.get(cameraUrl, {
      responseType: 'arraybuffer',
    });

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.send(response.data);
  } catch (e) {
    console.error('Error al obtener la imagen:', e);
    res.status(500).send('Error al obtener la imagen');
  }
});

// Endpoint para iniciar el stream
app.get('/start-stream', (req, res) => {
  startRTSPToHLS();
  res.json({ message: 'Stream iniciado', status: 'ok' });
});

// Endpoint para detener el stream
app.get('/stop-stream', (req, res) => {
  if (ffmpegProcess) {
    ffmpegProcess.kill();
    ffmpegProcess = null;
    res.json({ message: 'Stream detenido', status: 'ok' });
  } else {
    res.json({ message: 'No hay stream activo', status: 'ok' });
  }
});

// Endpoint para configurar cámaras
app.post('/configure-camera/:cameraId', (req, res) => {
  const { cameraId } = req.params;
  const cameraConfig = req.body;
  
  // Validar configuración requerida
  if (!cameraConfig.ip || !cameraConfig.rtspPort || !cameraConfig.videoProfile) {
    return res.status(400).json({ error: 'Configuración de cámara incompleta' });
  }
  
  cameraConfigs.set(cameraId, cameraConfig);
  console.log(`Configuración de cámara ${cameraId} actualizada:`, cameraConfig);
  
  res.json({ 
    message: `Configuración de cámara ${cameraId} guardada`, 
    status: 'ok' 
  });
});

// Endpoints dinámicos para múltiples cámaras
app.get('/stream-status/:cameraId', (req, res) => {
  const { cameraId } = req.params;
  const isRunning = ffmpegProcesses.has(cameraId);
  
  // Obtener la configuración de la cámara para construir la URL correcta
  const cameraConfig = cameraConfigs.get(cameraId);
  let hlsUrl = `/hls/${cameraId}/stream.m3u8`; // Fallback
  
  if (cameraConfig && cameraConfig.ip) {
    const ipFolderName = cameraConfig.ip.replace(/\./g, '_');
    hlsUrl = `/hls/${ipFolderName}/stream.m3u8`;
  }
  
  res.json({ 
    isRunning,
    hlsUrl: hlsUrl
  });
});

app.get('/start-stream/:cameraId', (req, res) => {
  const { cameraId } = req.params;
  console.log(`🚀 Iniciando stream para cámara: ${cameraId}`);
  
  // Para compatibilidad, usar configuración por defecto si no hay configuración específica
  let cameraConfig = cameraConfigs.get(cameraId);
  
  if (!cameraConfig) {
    // Si es "default" o no hay configuración, usar la configuración por defecto
    cameraConfig = {
      ip: '192.168.1.117',
      rtspPort: 554,
      videoProfile: 'profile1',
      username: 'ceroideas',
      password: '12345678'
    };
    
    // Guardar la configuración por defecto
    cameraConfigs.set(cameraId, cameraConfig);
    console.log(`⚠️ Usando configuración por defecto para cámara ${cameraId}`);
  } else {
    console.log(`✅ Usando configuración específica para cámara ${cameraId}:`, cameraConfig);
  }
  
  startRTSPToHLS(cameraId, cameraConfig);
  
  // Construir URL HLS basada en la IP de la cámara
  const ipFolderName = cameraConfig.ip.replace(/\./g, '_');
  const hlsUrl = `/hls/${ipFolderName}/stream.m3u8`;
  
  res.json({ 
    message: `Stream iniciado para cámara ${cameraId}`, 
    status: 'ok',
    hlsUrl: hlsUrl,
    ipFolder: ipFolderName
  });
});

app.get('/stop-stream/:cameraId', (req, res) => {
  const { cameraId } = req.params;
  
  if (ffmpegProcesses.has(cameraId)) {
    const process = ffmpegProcesses.get(cameraId);
    process.kill('SIGINT');
    ffmpegProcesses.delete(cameraId);
    cameraConfigs.delete(cameraId);
    res.json({ message: `Stream detenido para cámara ${cameraId}`, status: 'ok' });
  } else {
    res.json({ message: `No hay stream activo para cámara ${cameraId}`, status: 'ok' });
  }
});

app.get('/camera/:cameraId', async (req, res) => {
  const { cameraId } = req.params;
  let cameraConfig = cameraConfigs.get(cameraId);
  
  if (!cameraConfig) {
    // Usar configuración por defecto si no hay configuración específica
    cameraConfig = {
      ip: '192.168.1.117',
      rtspPort: 554,
      videoProfile: 'profile1',
      username: 'ceroideas',
      password: '12345678'
    };
    console.log(`Usando configuración por defecto para snapshot de cámara ${cameraId}`);
  }
  
  const cameraUrl = `http://${cameraConfig.username}:${cameraConfig.password}@${cameraConfig.ip}:80/GetSnapshot/1`;
  
  try {
    const response = await axios.get(cameraUrl, {
      responseType: 'arraybuffer',
      timeout: 5000,
      validateStatus: () => true
    });

    if (response.status === 200) {
      res.set('Content-Type', 'image/jpeg');
      return res.send(Buffer.from(response.data));
    } else {
      console.error('Respuesta de la cámara:', response.data.toString());
      return res.status(response.status).send(response.data.toString());
    }
  } catch (e) {
    console.error('Error al obtener la imagen:', e);
    res.status(500).send('Error al obtener la imagen');
  }
});

// ========== PROXY PARA SDIO12 (Control de Puertas) ==========

// Endpoint para hacer proxy de peticiones SDIO12 GET
app.get('/sdio12/:ip', async (req, res) => {
  const { ip } = req.params;
  const auth = req.headers.authorization;
  
  console.log(`🔍 Proxy SDIO12 GET: ${ip}`);
  
  try {
    const response = await axios.get(`https://${ip}/sdio12`, {
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
      httpsAgent,
      timeout: 10000,
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error en proxy SDIO12 GET:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Endpoint para hacer proxy de peticiones SDIO12 POST
app.post('/sdio12/:ip', async (req, res) => {
  const { ip } = req.params;
  const auth = req.headers.authorization;
  const body = req.body;
  
  console.log(`🚪 Proxy SDIO12 POST: ${ip}`, JSON.stringify(body, null, 2));
  
  try {
    // Intentar primero con application/json
    let response;
    try {
      console.log('📤 Intentando con Content-Type: application/json');
      response = await axios.post(`https://${ip}/sdio12`, body, {
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
        },
        httpsAgent,
        timeout: 10000,
      });
    } catch (jsonError) {
      console.log('⚠️ Falló con application/json, intentando con text/plain');
      // Si falla, intentar con text/plain
      const bodyString = JSON.stringify(body);
      response = await axios.post(`https://${ip}/sdio12`, bodyString, {
        headers: {
          'Authorization': auth,
          'Content-Type': 'text/plain',
        },
        httpsAgent,
        timeout: 10000,
      });
    }
    
    console.log('✅ Respuesta SDIO12:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error en proxy SDIO12 POST:', error.message);
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', error.response.data);
      console.error('❌ Response headers:', error.response.headers);
    }
    res.status(error.response?.status || 500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Servir archivos HLS estáticamente
app.use('/hls', express.static(hlsDir));

// Servir el reproductor HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'player.html'));
});

// Endpoint para obtener el estado del stream
app.get('/stream-status', (req, res) => {
  res.json({ 
    isRunning: ffmpegProcess !== null,
    hlsUrl: '/hls/stream.m3u8'
  });
});

// ========== PROXY PARA INTERCOMUNICADORES (AXIS E IDIS) ==========

// Endpoint para hacer proxy de peticiones Axis GET
app.get('/axis/:ip/*', async (req, res) => {
  const { ip } = req.params;
  const path = req.params[0];
  const auth = req.headers.authorization;
  
  console.log(`🔍 Proxy Axis GET: ${ip}/${path}`);
  console.log(`🔑 Auth header: ${auth ? 'Presente' : 'Ausente'}`);
  if (auth) {
    console.log(`🔑 Auth value: ${auth.substring(0, 20)}...`);
  }
  
  // 1) Si el cliente envía Authorization, probarlo primero
  if (auth) {
    try {
      const directResp = await axios.get(`https://${ip}/${path}`, {
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
        },
        httpsAgent,
        timeout: 10000,
        validateStatus: () => true,
      });

      if (directResp.status >= 200 && directResp.status < 300) {
        console.log(`✅ Axis GET con credenciales provistas - Status: ${directResp.status}`);
        res.set('Content-Type', 'text/plain');
        return res.send(directResp.data);
      } else {
        console.log(`⚠️ Credenciales provistas no válidas: ${directResp.status} ${directResp.statusText}`);
      }
    } catch (e) {
      console.log(`❌ Error usando credenciales provistas: ${e.message}`);
      // Continuar con fallback
    }
  }
  
  // Probar diferentes combinaciones de credenciales para Axis
  const credentials = [
    { user: 'admin', pass: 'Santander25' }, // Específico
    { user: 'root', pass: 'pass' },          // Axis por defecto
    { user: 'admin', pass: 'admin' },       // Común
    { user: 'admin', pass: '' },             // Sin contraseña
    { user: 'root', pass: '' },              // Root sin contraseña
  ];
  
  for (const cred of credentials) {
    try {
      console.log(`🔑 Probando credenciales: ${cred.user}:${cred.pass || '(vacío)'}`);
      
      const testAuth = `Basic ${Buffer.from(`${cred.user}:${cred.pass}`).toString('base64')}`;
      
      const response = await axios.get(`https://${ip}/${path}`, {
        headers: {
          'Authorization': testAuth,
          'Content-Type': 'application/json',
        },
        httpsAgent,
        timeout: 10000,
      });
      
      console.log(`✅ Axis GET exitoso con ${cred.user}:${cred.pass || '(vacío)'} - Status: ${response.status}`);
      res.set('Content-Type', 'text/plain');
      res.send(response.data);
      return; // Salir si funciona
      
    } catch (error) {
      console.log(`❌ Falló con ${cred.user}:${cred.pass || '(vacío)'} - ${error.response?.status || 'Error'}`);
      // Continuar con la siguiente credencial
    }
  }
  
  // Si llegamos aquí, ninguna credencial funcionó
  console.error(`❌ Todas las credenciales fallaron para ${ip}/${path}`);
  res.status(401).json({
    error: 'Error en proxy Axis GET',
    details: 'Todas las credenciales probadas fallaron',
    status: 401,
    credentials_tested: credentials.map(c => `${c.user}:${c.pass || '(vacío)'}`)
  });
});

// Endpoint para hacer proxy de peticiones IDIS GET
app.get('/idis/:ip/*', async (req, res) => {
  const { ip } = req.params;
  const path = req.params[0]; // Captura todo después de /axis/ip/
  const auth = req.headers.authorization;
  
  console.log(`🔍 Proxy IDIS GET: ${ip}/${path}`);
  console.log(`🔑 Auth header: ${auth ? 'Presente' : 'Ausente'}`);
  if (auth) {
    console.log(`🔑 Auth value: ${auth.substring(0, 20)}...`);
  }
  
  // Probar diferentes combinaciones de credenciales para IDIS
  const credentials = [
    { user: 'admin', pass: 'Santander25' }, // IDIS DC-I6212WRX
    { user: 'admin', pass: 'admin' },       // Común IDIS
    { user: 'admin', pass: '12345' },       // IDIS por defecto
    { user: 'admin', pass: 'password' },    // Password común
    { user: 'admin', pass: '1234' },        // IDIS común
    { user: 'admin', pass: '' },             // Sin contraseña
    { user: 'root', pass: 'pass' },          // Por defecto
    { user: 'root', pass: '12345' },         // Root IDIS
    { user: 'root', pass: '' },              // Root sin contraseña
    { user: 'user', pass: 'user' },          // Usuario común
    { user: 'guest', pass: 'guest' },        // Invitado
  ];
  
  for (const cred of credentials) {
    try {
      console.log(`🔑 Probando credenciales: ${cred.user}:${cred.pass || '(vacío)'}`);
      
      const testAuth = `Basic ${Buffer.from(`${cred.user}:${cred.pass}`).toString('base64')}`;
      
      const response = await axios.get(`https://${ip}/${path}`, {
        headers: {
          'Authorization': testAuth,
          'Content-Type': 'application/json',
        },
        httpsAgent,
        timeout: 10000,
      });
      
      console.log(`✅ IDIS GET exitoso con ${cred.user}:${cred.pass || '(vacío)'} - Status: ${response.status}`);
      res.set('Content-Type', 'text/plain');
      res.send(response.data);
      return; // Salir si funciona
      
    } catch (error) {
      console.log(`❌ Falló con ${cred.user}:${cred.pass || '(vacío)'} - ${error.response?.status || 'Error'}`);
      // Continuar con la siguiente credencial
    }
  }
  
  // Si llegamos aquí, ninguna credencial funcionó
  console.error(`❌ Todas las credenciales fallaron para ${ip}/${path}`);
  res.status(401).json({
    error: 'Error en proxy IDIS GET',
    details: 'Todas las credenciales probadas fallaron',
    status: 401,
    credentials_tested: credentials.map(c => `${c.user}:${c.pass || '(vacío)'}`)
  });
});

app.listen(3001, () => {
  console.log('Proxy escuchando en http://localhost:3001');
  console.log('Endpoints disponibles:');
  console.log('- GET /camera - Obtener snapshot');
  console.log('- GET /start-stream - Iniciar stream RTSP a HLS');
  console.log('- GET /stop-stream - Detener stream');
  console.log('- GET /stream-status - Estado del stream');
  console.log('- GET /hls/stream.m3u8 - Stream HLS');
  console.log('- GET /sdio12/:ip - Proxy SDIO12 GET (estado)');
  console.log('- POST /sdio12/:ip - Proxy SDIO12 POST (control)');
  console.log('- GET /axis/:ip/* - Proxy Axis Intercomunicador GET');
  console.log('- GET /idis/:ip/* - Proxy IDIS Intercomunicador GET');
});