// Endpoint para envío de audio via proxy
// Este archivo debe ser agregado al servidor Node.js existente

const express = require('express');
const router = express.Router();

// Endpoint para recibir audio de la aplicación y reenviarlo a la cámara
router.post('/audio/stream', async (req, res) => {
  try {
    const {
      camera_ip,
      camera_username,
      camera_password,
      audio_data,
      timestamp,
      codec,
      sample_rate,
      channels,
      bit_rate,
      endpoint
    } = req.body;

    console.log(`🎤 Proxy: Recibiendo audio para cámara ${camera_ip}`);

    // Validar datos requeridos
    if (!camera_ip || !audio_data) {
      return res.status(400).json({
        success: false,
        error: 'Datos de audio incompletos'
      });
    }

    // Preparar payload para la cámara
    const cameraPayload = {
      audio_data: audio_data,
      timestamp: timestamp || Date.now(),
      codec: codec || 'PCMU',
      sample_rate: sample_rate || 8000,
      channels: channels || 1,
      bit_rate: bit_rate || 64000
    };

    // Enviar audio a la cámara Safire
    const cameraResponse = await fetch(`http://${camera_ip}${endpoint || '/cgi-bin/audio_input.cgi'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${camera_username || 'admin'}:${camera_password || 'admin'}`).toString('base64')}`,
      },
      body: JSON.stringify(cameraPayload),
      timeout: 5000,
    });

    if (cameraResponse.ok) {
      console.log(`✅ Proxy: Audio enviado exitosamente a ${camera_ip}`);
      res.json({
        success: true,
        message: 'Audio enviado correctamente',
        camera_ip: camera_ip,
        timestamp: timestamp,
        bytes_sent: audio_data.length
      });
    } else {
      console.error(`❌ Proxy: Error enviando audio a ${camera_ip}: ${cameraResponse.status}`);
      res.status(cameraResponse.status).json({
        success: false,
        error: `Error de cámara: ${cameraResponse.status} ${cameraResponse.statusText}`,
        camera_ip: camera_ip
      });
    }

  } catch (error) {
    console.error('❌ Proxy: Error procesando audio:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor proxy',
      details: error.message
    });
  }
});

// Endpoint para verificar conectividad con la cámara
router.get('/audio/check/:camera_ip', async (req, res) => {
  try {
    const { camera_ip } = req.params;
    const { username = 'admin', password = 'admin' } = req.query;

    console.log(`🔍 Proxy: Verificando conectividad con ${camera_ip}`);

    // Verificar conectividad básica
    const response = await fetch(`http://${camera_ip}/cgi-bin/audio_input.cgi`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
      timeout: 3000,
    });

    if (response.ok) {
      console.log(`✅ Proxy: Cámara ${camera_ip} accesible`);
      res.json({
        success: true,
        message: 'Cámara accesible',
        camera_ip: camera_ip,
        status: response.status
      });
    } else {
      console.log(`⚠️ Proxy: Cámara ${camera_ip} no accesible: ${response.status}`);
      res.status(response.status).json({
        success: false,
        error: `Cámara no accesible: ${response.status}`,
        camera_ip: camera_ip
      });
    }

  } catch (error) {
    console.error(`❌ Proxy: Error verificando ${req.params.camera_ip}:`, error);
    res.status(500).json({
      success: false,
      error: 'Error verificando conectividad',
      details: error.message
    });
  }
});

// Endpoint para obtener estadísticas de audio
router.get('/audio/stats', (req, res) => {
  res.json({
    success: true,
    message: 'Estadísticas de audio',
    active_streams: 0, // TODO: Implementar contador de streams activos
    total_bytes_sent: 0, // TODO: Implementar contador de bytes
    uptime: process.uptime()
  });
});

module.exports = router;
