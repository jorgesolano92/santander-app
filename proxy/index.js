const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS middleware
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

// Estado de streams de video
const streams = new Map();

// ===== RUTAS DE VIDEO =====

// Obtener snapshot
app.get('/camera', async (req, res) => {
  try {
    const { ip, username, password } = req.query;
    
    if (!ip) {
      return res.status(400).json({ error: 'Falta el parámetro IP' });
    }

    const auth = Buffer.from(`${username || 'admin'}:${password || 'admin'}`).toString('base64');
    const snapshotUrl = `http://${ip}/cgi-bin/snapshot.cgi`;

    const response = await axios.get(snapshotUrl, {
      headers: {
        'Authorization': `Basic ${auth}`
      },
      responseType: 'arraybuffer',
      timeout: 5000
    });

    res.set('Content-Type', 'image/jpeg');
    res.send(response.data);

  } catch (error) {
    console.error('Error obteniendo snapshot:', error.message);
    res.status(500).json({ error: 'Error obteniendo snapshot' });
  }
});

// Iniciar stream RTSP a HLS
app.get('/start-stream', (req, res) => {
  try {
    const { ip, username, password } = req.query;
    
    if (!ip) {
      return res.status(400).json({ error: 'Falta el parámetro IP' });
    }

    const streamKey = ip.replace(/\./g, '_');
    
    if (streams.has(streamKey)) {
      return res.json({ 
        message: 'Stream ya está activo', 
        streamUrl: `/hls/${streamKey}/stream.m3u8` 
      });
    }

    const rtspUrl = `rtsp://${username || 'admin'}:${password || 'admin'}@${ip}:554/Streaming/Channels/101`;
    const hlsDir = path.join(__dirname, 'hls', streamKey);
    
    if (!fs.existsSync(hlsDir)) {
      fs.mkdirSync(hlsDir, { recursive: true });
    }

    const ffmpegArgs = [
      '-rtsp_transport', 'tcp',
    '-i', rtspUrl,
      '-c:v', 'copy',
    '-c:a', 'aac',
    '-f', 'hls',
    '-hls_time', '2',
      '-hls_list_size', '5',
      '-hls_flags', 'delete_segments+append_list',
      '-hls_segment_filename', path.join(hlsDir, 'segment_%03d.ts'),
      path.join(hlsDir, 'stream.m3u8')
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    ffmpeg.stderr.on('data', (data) => {
      console.log(`FFmpeg stderr (${ip}): ${data}`);
    });

    ffmpeg.on('close', (code) => {
      console.log(`FFmpeg cerrado con código ${code}`);
      streams.delete(streamKey);
    });

    streams.set(streamKey, { ffmpeg, ip });

    res.json({ 
      message: 'Stream iniciado', 
      streamUrl: `/hls/${streamKey}/stream.m3u8` 
    });

  } catch (error) {
    console.error('Error iniciando stream:', error.message);
    res.status(500).json({ error: 'Error iniciando stream' });
  }
});

// Detener stream
app.get('/stop-stream', (req, res) => {
  try {
    const { ip } = req.query;
    
    if (!ip) {
      return res.status(400).json({ error: 'Falta el parámetro IP' });
    }

    const streamKey = ip.replace(/\./g, '_');
    
    if (!streams.has(streamKey)) {
      return res.json({ message: 'Stream no está activo' });
    }

    const stream = streams.get(streamKey);
    stream.ffmpeg.kill('SIGTERM');
    streams.delete(streamKey);

    res.json({ message: 'Stream detenido' });

  } catch (error) {
    console.error('Error deteniendo stream:', error.message);
    res.status(500).json({ error: 'Error deteniendo stream' });
  }
});

// Estado del stream
app.get('/stream-status', (req, res) => {
  try {
    const { ip } = req.query;
    
    if (!ip) {
      return res.status(400).json({ error: 'Falta el parámetro IP' });
    }

    const streamKey = ip.replace(/\./g, '_');
    const isActive = streams.has(streamKey);

    res.json({ 
      active: isActive,
      streamUrl: isActive ? `/hls/${streamKey}/stream.m3u8` : null
    });

  } catch (error) {
    console.error('Error verificando estado:', error.message);
    res.status(500).json({ error: 'Error verificando estado' });
  }
});

// Servir archivos HLS
app.use('/hls', express.static(path.join(__dirname, 'hls')));

// ===== RUTAS DE VIDEO CON NOMBRE DE PUERTA =====

// Configurar cámara (usado por DoorVideoStream)
app.post('/configure-camera/:doorName', (req, res) => {
  try {
    const { doorName } = req.params;
    const { ip, rtspPort, videoProfile, username, password, snapshotPath } = req.body;
    
    console.log(`📝 Configurando cámara para ${doorName}:`, { ip, rtspPort, videoProfile });
    
    // Guardar configuración en memoria para uso posterior
    const config = {
      ip,
      rtspPort: rtspPort || 554,
      videoProfile: videoProfile || 'Streaming/Channels/101',
      username: username || 'admin',
      password: password || 'admin',
      snapshotPath
    };
    
    streams.set(`config_${doorName}`, config);
  
  res.json({ 
      success: true,
      message: `Cámara ${doorName} configurada`,
      config: { ...config, password: '****' }
    });
    
  } catch (error) {
    console.error(`Error configurando cámara ${req.params.doorName}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar stream por nombre de puerta
app.get('/start-stream/:doorName', (req, res) => {
  try {
    const { doorName } = req.params;
    
    // Obtener configuración guardada
    const config = streams.get(`config_${doorName}`);
    if (!config) {
      return res.status(400).json({ error: `No hay configuración para ${doorName}` });
    }
    
    const { ip, rtspPort, videoProfile, username, password } = config;
    const streamKey = `${doorName.replace(/\s+/g, '_')}`;
    
    // Verificar si el stream ya está activo
    if (streams.has(streamKey)) {
      const ipFolder = ip.replace(/\./g, '_');
      return res.json({ 
        message: 'Stream ya está activo',
        hlsUrl: `/hls/${ipFolder}/stream.m3u8`,
        ipFolder: ipFolder
      });
    }

    const rtspUrl = `rtsp://${username}:${password}@${ip}:${rtspPort}/${videoProfile}`;
    const ipFolder = ip.replace(/\./g, '_');
    const hlsDir = path.join(__dirname, 'hls', ipFolder);
    
    if (!fs.existsSync(hlsDir)) {
      fs.mkdirSync(hlsDir, { recursive: true });
    }

    const ffmpegArgs = [
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '5',
      '-hls_flags', 'delete_segments+append_list',
      '-hls_segment_filename', path.join(hlsDir, 'segment_%03d.ts'),
      path.join(hlsDir, 'stream.m3u8')
    ];

    console.log(`🎬 Iniciando FFmpeg para ${doorName} (${ip})`);
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    ffmpeg.stderr.on('data', (data) => {
      console.log(`FFmpeg stderr (${doorName}): ${data}`);
    });

    ffmpeg.on('close', (code) => {
      console.log(`FFmpeg cerrado con código ${code} para ${doorName}`);
      streams.delete(streamKey);
    });

    streams.set(streamKey, { ffmpeg, ip, doorName });
  
  res.json({ 
      message: `Stream iniciado para ${doorName}`,
      hlsUrl: `/hls/${ipFolder}/stream.m3u8`,
      ipFolder: ipFolder
    });

  } catch (error) {
    console.error(`Error iniciando stream para ${req.params.doorName}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Detener stream por nombre de puerta
app.get('/stop-stream/:doorName', (req, res) => {
  try {
    const { doorName } = req.params;
    const streamKey = `${doorName.replace(/\s+/g, '_')}`;
    
    if (!streams.has(streamKey)) {
      return res.json({ message: `Stream ${doorName} no está activo` });
    }

    const stream = streams.get(streamKey);
    stream.ffmpeg.kill('SIGTERM');
    streams.delete(streamKey);

    console.log(`🛑 Stream detenido para ${doorName}`);
    res.json({ message: `Stream detenido para ${doorName}` });

  } catch (error) {
    console.error(`Error deteniendo stream para ${req.params.doorName}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Snapshot por nombre de puerta
app.get('/camera/snapshot/:doorName', async (req, res) => {
  try {
    const { doorName } = req.params;
    
    // Obtener configuración guardada
    const config = streams.get(`config_${doorName}`);
    if (!config) {
      return res.status(400).json({ error: `No hay configuración para ${doorName}` });
    }
    
    const { ip, username, password, snapshotPath } = config;
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const url = snapshotPath || `/cgi-bin/snapshot.cgi`;
    const snapshotUrl = `http://${ip}${url}`;

    const response = await axios.get(snapshotUrl, {
        headers: {
        'Authorization': `Basic ${auth}`
      },
      responseType: 'arraybuffer',
      timeout: 5000
    });

    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Disposition', `attachment; filename="${doorName}_snapshot.jpg"`);
    res.send(response.data);

  } catch (error) {
    console.error(`Error obteniendo snapshot para ${req.params.doorName}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// ===== RUTAS DE CONTROL DE PUERTAS =====

// SDIO12 GET
app.get('/sdio12/:ip', async (req, res) => {
  try {
  const { ip } = req.params;
    const { username = 'Scati2023', password = 'Scati2023' } = req.query;
  
    console.log(`🔍 GET SDIO12 de ${ip}`);
  
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const response = await axios.get(`https://${ip}/sdio12`, {
      headers: { 'Authorization': `Basic ${auth}` },
      timeout: 10000,
      httpsAgent: new (require('https')).Agent({  
        rejectUnauthorized: false
      })
    });
    
    console.log(`✅ Estado SDIO12 obtenido:`, response.data);
    res.json(response.data);
  } catch (error) {
    console.error(`❌ Error GET SDIO12:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// SDIO12 POST
app.post('/sdio12/:ip', async (req, res) => {
  try {
  const { ip } = req.params;
    const { tags } = req.body;
    
    console.log(`🚪 POST SDIO12 a ${ip}:`, JSON.stringify(req.body));
    
    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({ error: 'Faltan tags en el body' });
    }

    // Extraer credenciales del header Authorization
    let username = 'Scati2023';
    let password = 'Scati2023';
    
    if (req.headers.authorization) {
      try {
        const authHeader = req.headers.authorization.replace('Basic ', '');
        const decoded = Buffer.from(authHeader, 'base64').toString('utf-8');
        const [user, pass] = decoded.split(':');
        if (user && pass) {
          username = user;
          password = pass;
        }
      } catch (e) {
        console.log('⚠️ Error decodificando auth, usando credenciales por defecto');
      }
    }

    console.log(`🔑 Usando credenciales: ${username}:****`);
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Construir URL completa
    const targetUrl = `https://${ip}/sdio12`;
    console.log(`📡 Enviando POST a: ${targetUrl}`);
    console.log(`📦 Payload:`, JSON.stringify({ tags }));
    
    // Crear timeout manual para debugging
    const controller = new (require('abort-controller'))();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`⏱️ TIMEOUT: La petición a ${ip} tardó más de 10 segundos`);
    }, 10000);

    try {
      // Enviar al servidor SCATI con formato correcto
      const response = await axios.post(targetUrl, 
        { tags },
        {
        headers: {
            'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
          httpsAgent: new (require('https')).Agent({  
            rejectUnauthorized: false // Aceptar certificados autofirmados
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
      console.log(`✅ Respuesta SDIO12 (${response.status}):`, response.data);
      res.json(response.data);
      
    } catch (axiosError) {
      clearTimeout(timeoutId);
      
      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        console.error(`⏱️ TIMEOUT: ${ip} no respondió en 10 segundos`);
        return res.status(504).json({ 
          error: 'timeout',
          message: `El servidor ${ip} no respondió en 10 segundos`,
          details: axiosError.message
        });
      }
      
      throw axiosError;
    }

  } catch (error) {
    console.error(`❌ Error SDIO12:`, error.message);
    console.error(`❌ Error completo:`, error);
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      details: error.response?.data || 'Sin detalles'
    });
  }
});

// AXIS proxy
app.get('/axis/:ip/*', async (req, res) => {
  try {
  const { ip } = req.params;
  const path = req.params[0];
    const { username = 'root', password = 'pass' } = req.query;
    
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const response = await axios.get(`http://${ip}/${path}`, {
      headers: { 'Authorization': `Basic ${auth}` },
      timeout: 10000 // Aumentado a 10 segundos
    });

    res.json(response.data);
    } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// IDIS proxy
app.get('/idis/:ip/*', async (req, res) => {
  try {
  const { ip } = req.params;
    const path = req.params[0];
    const { username = 'admin', password = 'admin' } = req.query;
    
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const response = await axios.get(`http://${ip}/${path}`, {
      headers: { 'Authorization': `Basic ${auth}` },
      timeout: 10000 // Aumentado a 10 segundos
    });

    res.json(response.data);
    } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SALUD DEL SERVIDOR =====

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor proxy funcionando',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeStreams: streams.size
  });
});

// Iniciar servidor
app.listen(3001, '0.0.0.0', () => {
  console.log('Proxy escuchando en http://localhost:3001');
  console.log('Endpoints disponibles:');
  console.log('');
  console.log('VIDEO:');
  console.log('- GET /camera - Obtener snapshot');
  console.log('- GET /start-stream - Iniciar stream RTSP a HLS');
  console.log('- GET /stop-stream - Detener stream');
  console.log('- GET /stream-status - Estado del stream');
  console.log('- GET /hls/:streamKey/stream.m3u8 - Stream HLS');
  console.log('');
  console.log('VIDEO POR PUERTA:');
  console.log('- POST /configure-camera/:doorName - Configurar cámara');
  console.log('- GET /start-stream/:doorName - Iniciar stream');
  console.log('- GET /stop-stream/:doorName - Detener stream');
  console.log('- GET /camera/snapshot/:doorName - Snapshot');
  console.log('');
  console.log('CONTROL DE PUERTAS:');
  console.log('- GET /sdio12/:ip - Estado SDIO12');
  console.log('- POST /sdio12/:ip - Control SDIO12');
  console.log('- GET /axis/:ip/* - Proxy AXIS');
  console.log('- GET /idis/:ip/* - Proxy IDIS');
  console.log('');
  console.log('SISTEMA:');
  console.log('- GET /health - Salud del servidor');
  console.log('');
  console.log('✅ Audio via SIP (jssip) - Sin endpoints HTTP');
  console.log('⏱️  Timeout aumentado a 10 segundos para todos los endpoints');
});

