const express = require('express');
const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpegStatic = require('ffmpeg-static');
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
const ffmpegBin = process.env.FFMPEG_PATH || ffmpegStatic || 'ffmpeg';

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

  // Construir URL RTSP: respetar ruta personalizada si existe.
  let rtspUrl;
  if (cameraConfig.rtspPath && String(cameraConfig.rtspPath).trim() !== '') {
    const customPath = String(cameraConfig.rtspPath).replace(/^\/+/, '');
    rtspUrl = `rtsp://${cameraConfig.username}:${cameraConfig.password}@${cameraConfig.ip}:${cameraConfig.rtspPort}/${customPath}`;
  } else if (cameraConfig.videoProfile === 'MainStream') {
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

  const ffmpegProcess = spawn(ffmpegBin, [
    // Entrada RTSP robusta para cámaras con timestamps inconsistentes
    '-rtsp_transport', 'tcp', // Usar TCP para mayor estabilidad
    '-use_wallclock_as_timestamps', '1',
    '-fflags', '+genpts+discardcorrupt',
    '-flags', 'low_delay',
    '-analyzeduration', '1000000',
    '-probesize', '1000000',
    '-i', rtspUrl,
    // Mapear video y audio opcionalmente (si no hay audio, no falla)
    '-map', '0:v:0',
    '-map', '0:a?',
    // Video
    '-c:v', 'libx264',
    '-preset', 'veryfast', // Codificación más rápida
    '-tune', 'zerolatency', // Optimizado para baja latencia
    '-g', '50', // Keyframe cada 2s en 25fps
    '-keyint_min', '50',
    '-force_key_frames', 'expr:gte(t,n_forced*2)',
    // Audio (asegurar metadatos válidos en TS)
    '-c:a', 'aac',
    '-ar', '48000', // Frecuencia de audio consistente
    '-ac', '1', // Mononural (coincide con la mayoría de cámaras)
    '-b:a', '96k', // Bitrate de audio
    // Normalizar timeline para evitar DTS/PTS negativos
    '-fps_mode', 'cfr',
    '-af', 'aresample=async=1:first_pts=0',
    '-avoid_negative_ts', 'make_zero',
    // Muxing / HLS
    '-f', 'hls',
    '-hls_time', '2',
    '-hls_list_size', '5', // Mantener más segmentos
    '-hls_start_number_source', 'epoch',
    '-hls_flags', 'delete_segments+split_by_time+independent_segments+omit_endlist+temp_file',
    '-mpegts_flags', 'resend_headers',
    '-hls_segment_filename', path.join(cameraHlsDir, 'segment_%03d.ts'),
    '-start_number', '1', // Empezar desde segmento 1
    outputPath,
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
    console.error(`FFmpeg binario usado: ${ffmpegBin}`);
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
    status: 'ok',
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
    hlsUrl: hlsUrl,
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
      password: '12345678',
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
    ipFolder: ipFolderName,
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

// Eliminado: endpoint antiguo de snapshot /camera/:cameraId (reemplazado por /camera/snapshot/:cameraId)

// Snapshot por modelo con descarga directa
app.get('/camera/snapshot/:cameraId', async (req, res) => {
  const { cameraId } = req.params;
  let cameraConfig = cameraConfigs.get(cameraId);

  if (!cameraConfig) {
    cameraConfig = {
      ip: '192.168.1.117',
      rtspPort: 554,
      videoProfile: 'profile1',
      username: 'ceroideas',
      password: '12345678',
    };
    console.log(`⚠️ Usando configuración por defecto para snapshot de ${cameraId}`);
  }

  const user = cameraConfig.username || '';
  const pass = cameraConfig.password || '';
  const ip = cameraConfig.ip;
  const explicitPath = cameraConfig.snapshotPath; // nueva propiedad opcional

  // Generar candidatos conocidos por fabricante + genéricos
  const httpBase = `http://${ip}`;
  const httpsBase = `https://${ip}`;
  const candidates = explicitPath
    ? [
        `${httpBase}/${explicitPath.startsWith('/') ? explicitPath.substring(1) : explicitPath}`,
        `${httpsBase}/${explicitPath.startsWith('/') ? explicitPath.substring(1) : explicitPath}`,
      ]
    : [
        // Hikvision / Safire
        `${httpBase}/ISAPI/Streaming/channels/101/picture`,
        `${httpsBase}/ISAPI/Streaming/channels/101/picture`,
        `${httpBase}/Streaming/channels/101/picture`,
        `${httpsBase}/Streaming/channels/101/picture`,
        // Axis
        `${httpBase}/axis-cgi/jpg/image.cgi`,
        `${httpsBase}/axis-cgi/jpg/image.cgi`,
        // Dahua
        `${httpBase}/cgi-bin/snapshot.cgi?channel=1`,
        `${httpsBase}/cgi-bin/snapshot.cgi?channel=1`,
        // Genéricos
        `${httpBase}/GetSnapshot/1`,
        `${httpsBase}/GetSnapshot/1`,
        `${httpBase}/snapshot.jpg`,
        `${httpsBase}/snapshot.jpg`,
        `${httpBase}/jpeg/snap.jpg`,
        `${httpsBase}/jpeg/snap.jpg`,
      ];

  const authHeader =
    user || pass ? { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` } : {};

  for (const url of candidates) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          ...authHeader,
          Accept: 'image/*',
        },
        httpsAgent,
        timeout: 8000,
        validateStatus: () => true,
      });

      if (response.status === 200 && (response.headers['content-type'] || '').includes('image')) {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `snapshot_${ip}_${ts}.jpg`;
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.set('Content-Disposition', `attachment; filename="${filename}"`);
        res.set('Cache-Control', 'no-store');
        return res.send(Buffer.from(response.data));
      }
    } catch (e) {
      // probar siguiente
    }
  }

  res.status(502).json({ error: 'No se pudo obtener snapshot', ip });
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
        Authorization: auth,
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
      details: error.response?.data,
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
          Authorization: auth,
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
          Authorization: auth,
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
      details: error.response?.data,
    });
  }
});

// Servir archivos HLS estáticamente con headers explícitos para navegador
app.use(
  '/hls',
  express.static(hlsDir, {
    setHeaders: (res, filePath) => {
      const lower = filePath.toLowerCase();
      if (lower.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      } else if (lower.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'no-store');
    },
  })
);

// Servir el reproductor HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'player.html'));
});

// Endpoint para obtener el estado del stream
app.get('/stream-status', (req, res) => {
  res.json({
    isRunning: ffmpegProcess !== null,
    hlsUrl: '/hls/stream.m3u8',
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
          Authorization: auth,
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
    { user: 'root', pass: 'pass' }, // Axis por defecto
    { user: 'admin', pass: 'admin' }, // Común
    { user: 'admin', pass: '' }, // Sin contraseña
    { user: 'root', pass: '' }, // Root sin contraseña
  ];

  for (const cred of credentials) {
    try {
      console.log(`🔑 Probando credenciales: ${cred.user}:${cred.pass || '(vacío)'}`);

      const testAuth = `Basic ${Buffer.from(`${cred.user}:${cred.pass}`).toString('base64')}`;

      const response = await axios.get(`https://${ip}/${path}`, {
        headers: {
          Authorization: testAuth,
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
    credentials_tested: credentials.map((c) => `${c.user}:${c.pass || '(vacío)'}`),
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
    { user: 'admin', pass: 'admin' }, // Común IDIS
    { user: 'admin', pass: '12345' }, // IDIS por defecto
    { user: 'admin', pass: 'password' }, // Password común
    { user: 'admin', pass: '1234' }, // IDIS común
    { user: 'admin', pass: '' }, // Sin contraseña
    { user: 'root', pass: 'pass' }, // Por defecto
    { user: 'root', pass: '12345' }, // Root IDIS
    { user: 'root', pass: '' }, // Root sin contraseña
    { user: 'user', pass: 'user' }, // Usuario común
    { user: 'guest', pass: 'guest' }, // Invitado
  ];

  for (const cred of credentials) {
    try {
      console.log(`🔑 Probando credenciales: ${cred.user}:${cred.pass || '(vacío)'}`);

      const testAuth = `Basic ${Buffer.from(`${cred.user}:${cred.pass}`).toString('base64')}`;

      const response = await axios.get(`https://${ip}/${path}`, {
        headers: {
          Authorization: testAuth,
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
    credentials_tested: credentials.map((c) => `${c.user}:${c.pass || '(vacío)'}`),
  });
});

app.listen(3001, '0.0.0.0', () => {
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
