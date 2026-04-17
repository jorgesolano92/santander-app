package com.cess07.puertassantander.dvrsdk;

import android.content.Context;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Process;
import android.util.Log;
import com.sdk.interfance.nvrsdk;
import com.sdk.interfance.NET_SDK_DEVICEINFO;
import java.lang.reflect.Method;
// NET_SDK_CONNECT_TYPE: 0=TCP, 1=P2P, 2=P2P2

/**
 * Manager que gestiona la instancia del SDK DVR nativo
 * Esta clase actúa como wrapper del SDK para facilitar su uso
 */
public class DvrSdkManager {
    private static final String TAG = "DvrSdkManager";
    private static DvrSdkManager instance;
    private nvrsdk nvrSdk;
    private int userId = -1;
    private boolean isInitialized = false;
    private String serverAddress = "";
    private long liveHandle = -1;
    private long voiceHandle = -1;
    private AudioRecord audioRecord = null;
    private Thread micThread = null;
    private volatile boolean isMicStreaming = false;
    private static final int MIC_SAMPLE_RATE = 8000;
    private static final int MIC_CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO;
    private static final int MIC_AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT;
    
    private DvrSdkManager() {
        nvrSdk = new nvrsdk();
    }
    
    public static synchronized DvrSdkManager getInstance() {
        if (instance == null) {
            instance = new DvrSdkManager();
        }
        return instance;
    }
    
    /**
     * Inicializa el SDK DVR
     * @return true si la inicialización fue exitosa
     */
    public boolean initialize(Context context) {
        if (isInitialized) {
            Log.d(TAG, "SDK ya está inicializado");
            return true;
        }
        
        try {
            // El SDK se inicializa automáticamente al crear la instancia
            // Si hay métodos de inicialización específicos, agregarlos aquí
            isInitialized = true;
            Log.d(TAG, "SDK inicializado correctamente");
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error al inicializar SDK", e);
            isInitialized = false;
            return false;
        }
    }
    
    /**
     * Inicia sesión en un dispositivo DVR
     * @param server Dirección IP o dominio del dispositivo
     * @param port Puerto del dispositivo
     * @param username Nombre de usuario
     * @param password Contraseña
     * @param loginType Tipo de conexión (0=TCP, 1=P2P, 2=P2P2)
     * @param deviceSn Número de serie del dispositivo (requerido para P2P)
     * @param isWifi Si la conexión actual es WiFi (para P2P)
     * @return userId si el login fue exitoso, -1 si falló
     */
    public int login(String server, int port, String username, String password, 
                     int loginType, String deviceSn, boolean isWifi) {
        if (nvrSdk == null) {
            Log.e(TAG, "SDK no está inicializado");
            return -1;
        }
        
        try {
            // Para P2P2, primero configurar la dirección NAT
            // NET_SDK_CONNECT_P2P2 = 2
            if (loginType == 2) {
                boolean p2pResult = nvrSdk.SetNat2Addr(server, port);
                Log.d(TAG, "P2P2 SetNat2Addr result: " + p2pResult);
                if (!p2pResult) {
                    long error = nvrSdk.GetLastError();
                    Log.e(TAG, "Error en SetNat2Addr: " + error);
                }
            }
            
            // Realizar login
            int resultUserId = nvrSdk.LoginEx(server, port, username, password, loginType, deviceSn, isWifi);
            
            if (resultUserId > 0) {
                userId = resultUserId;
                serverAddress = server;
                Log.d(TAG, "Login exitoso, userId: " + userId);
                return userId;
            } else {
                long error = nvrSdk.GetLastError();
                Log.e(TAG, "Login falló, error code: " + error);
                userId = -1;
                return -1;
            }
        } catch (Exception e) {
            Log.e(TAG, "Excepción durante login", e);
            userId = -1;
            return -1;
        }
    }
    
    /**
     * Cierra sesión del dispositivo DVR
     * @return true si el logout fue exitoso
     */
    public boolean logout() {
        if (userId == -1 || nvrSdk == null) {
            Log.d(TAG, "No hay sesión activa para cerrar");
            return false;
        }
        
        try {
            stopMicStreaming();
            stopVoiceIntercom();
            stopLivePreview();
            boolean result = nvrSdk.Logout(userId);
            if (result) {
                Log.d(TAG, "Logout exitoso");
            } else {
                long error = nvrSdk.GetLastError();
                Log.e(TAG, "Error en logout, código: " + error);
            }
            userId = -1;
            serverAddress = "";
            return result;
        } catch (Exception e) {
            Log.e(TAG, "Excepción durante logout", e);
            userId = -1;
            return false;
        }
    }
    
    /**
     * Obtiene información del dispositivo
     * @return NET_SDK_DEVICEINFO o null si hay error
     */
    public NET_SDK_DEVICEINFO getDeviceInfo() {
        if (userId == -1 || nvrSdk == null) {
            Log.e(TAG, "No hay sesión activa");
            return null;
        }
        
        try {
            byte[] data = nvrSdk.GetDeviceInfo(userId);
            if (data != null) {
                return NET_SDK_DEVICEINFO.deserialize(data, 0);
            } else {
                long error = nvrSdk.GetLastError();
                Log.e(TAG, "Error al obtener información del dispositivo: " + error);
                return null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Excepción al obtener información del dispositivo", e);
            return null;
        }
    }
    
    /**
     * Obtiene el último código de error del SDK
     * @return código de error
     */
    public long getLastError() {
        if (nvrSdk == null) {
            return -1;
        }
        return nvrSdk.GetLastError();
    }
    
    /**
     * Habilita o deshabilita los logs nativos
     * @param enable true para habilitar logs
     */
    public void setNativeLog(boolean enable) {
        if (nvrSdk != null) {
            nvrSdk.SetNativelog(enable);
        }
    }
    
    /**
     * Limpia recursos del SDK
     */
    public void cleanup() {
        if (nvrSdk != null) {
            stopMicStreaming();
            logout();
            try {
                nvrSdk.Cleanup();
                Log.d(TAG, "SDK limpiado correctamente");
            } catch (Exception e) {
                Log.e(TAG, "Error al limpiar SDK", e);
            }
            isInitialized = false;
        }
    }
    
    // Getters
    public nvrsdk getSdk() {
        return nvrSdk;
    }
    
    public int getUserId() {
        return userId;
    }
    
    public boolean isLoggedIn() {
        return userId > 0;
    }
    
    public boolean isInitialized() {
        return isInitialized;
    }
    
    public String getServerAddress() {
        return serverAddress;
    }

    public long getLiveHandle() {
        return liveHandle;
    }

    public long getVoiceHandle() {
        return voiceHandle;
    }

    public long startLivePreview(int channel, int streamType) {
        if (userId <= 0 || nvrSdk == null) {
            Log.e(TAG, "No hay sesión activa para LivePlay");
            return -1;
        }

        try {
            Method livePlayMethod = nvrSdk.getClass().getMethod("LivePlay", int.class, int.class, int.class);
            Object result = livePlayMethod.invoke(nvrSdk, userId, channel, streamType);
            if (result instanceof Number) {
                liveHandle = ((Number) result).longValue();
                Log.d(TAG, "LivePlay handle: " + liveHandle);
                return liveHandle;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error startLivePreview", e);
        }
        liveHandle = -1;
        return -1;
    }

    public boolean stopLivePreview() {
        if (nvrSdk == null || liveHandle <= 0) {
            return false;
        }
        try {
            Method stopLivePlayMethod = nvrSdk.getClass().getMethod("StopLivePlay", long.class);
            Object result = stopLivePlayMethod.invoke(nvrSdk, liveHandle);
            liveHandle = -1;
            return !(result instanceof Boolean) || (Boolean) result;
        } catch (NoSuchMethodException e) {
            try {
                Method stopLivePlayMethodInt = nvrSdk.getClass().getMethod("StopLivePlay", int.class);
                Object result = stopLivePlayMethodInt.invoke(nvrSdk, (int) liveHandle);
                liveHandle = -1;
                return !(result instanceof Boolean) || (Boolean) result;
            } catch (Exception inner) {
                Log.e(TAG, "Error stopLivePreview (int/long)", inner);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopLivePreview", e);
        }
        return false;
    }

    public long startVoiceIntercom(int channel) {
        if (userId <= 0 || nvrSdk == null) {
            Log.e(TAG, "No hay sesión activa para voz");
            return -1;
        }
        try {
            Method m = nvrSdk.getClass().getMethod("StartVoiceComMR", int.class, boolean.class, Object.class, Object.class, int.class);
            Object result = m.invoke(nvrSdk, userId, true, null, null, channel);
            if (result instanceof Number) {
                voiceHandle = ((Number) result).longValue();
                return voiceHandle;
            }
        } catch (NoSuchMethodException ex) {
            try {
                Method fallback = nvrSdk.getClass().getMethod("StartVoiceCom", int.class, boolean.class, Object.class, Object.class, int.class);
                Object result = fallback.invoke(nvrSdk, userId, false, null, null, channel);
                if (result instanceof Number) {
                    voiceHandle = ((Number) result).longValue();
                    return voiceHandle;
                }
            } catch (Exception inner) {
                Log.e(TAG, "Error startVoiceIntercom fallback", inner);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error startVoiceIntercom", e);
        }
        voiceHandle = -1;
        return -1;
    }

    public boolean sendVoiceData(byte[] pcmData) {
        if (nvrSdk == null || voiceHandle <= 0 || pcmData == null || pcmData.length == 0) {
            return false;
        }
        try {
            Method m = nvrSdk.getClass().getMethod("VoiceComSendData", long.class, byte[].class, int.class);
            Object result = m.invoke(nvrSdk, voiceHandle, pcmData, pcmData.length);
            return !(result instanceof Boolean) || (Boolean) result;
        } catch (NoSuchMethodException ex) {
            try {
                Method fallback = nvrSdk.getClass().getMethod("VoiceComSendData", int.class, byte[].class, int.class);
                Object result = fallback.invoke(nvrSdk, (int) voiceHandle, pcmData, pcmData.length);
                return !(result instanceof Boolean) || (Boolean) result;
            } catch (Exception inner) {
                Log.e(TAG, "Error sendVoiceData fallback", inner);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error sendVoiceData", e);
        }
        return false;
    }

    public boolean stopVoiceIntercom() {
        if (nvrSdk == null || voiceHandle <= 0) {
            return false;
        }
        stopMicStreaming();
        try {
            Method m = nvrSdk.getClass().getMethod("StopVoiceCom", long.class);
            Object result = m.invoke(nvrSdk, voiceHandle);
            voiceHandle = -1;
            return !(result instanceof Boolean) || (Boolean) result;
        } catch (NoSuchMethodException ex) {
            try {
                Method fallback = nvrSdk.getClass().getMethod("StopVoiceCom", int.class);
                Object result = fallback.invoke(nvrSdk, (int) voiceHandle);
                voiceHandle = -1;
                return !(result instanceof Boolean) || (Boolean) result;
            } catch (Exception inner) {
                Log.e(TAG, "Error stopVoiceIntercom fallback", inner);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopVoiceIntercom", e);
        }
        return false;
    }

    public boolean isMicStreaming() {
        return isMicStreaming;
    }

    public boolean startMicStreaming() {
        if (voiceHandle <= 0) {
            Log.e(TAG, "No hay voiceHandle activo para enviar audio");
            return false;
        }
        if (isMicStreaming) {
            return true;
        }
        try {
            int minBufferSize = AudioRecord.getMinBufferSize(MIC_SAMPLE_RATE, MIC_CHANNEL_CONFIG, MIC_AUDIO_FORMAT);
            if (minBufferSize <= 0) {
                Log.e(TAG, "AudioRecord getMinBufferSize inválido: " + minBufferSize);
                return false;
            }

            audioRecord = new AudioRecord(
                MediaRecorder.AudioSource.MIC,
                MIC_SAMPLE_RATE,
                MIC_CHANNEL_CONFIG,
                MIC_AUDIO_FORMAT,
                minBufferSize * 2
            );

            if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "AudioRecord no pudo inicializarse");
                audioRecord.release();
                audioRecord = null;
                return false;
            }

            isMicStreaming = true;
            audioRecord.startRecording();
            final int chunkSize = Math.max(320, minBufferSize);

            micThread = new Thread(() -> {
                Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO);
                byte[] buffer = new byte[chunkSize];
                while (isMicStreaming) {
                    try {
                        int read = audioRecord.read(buffer, 0, buffer.length);
                        if (read > 0) {
                            byte[] send = new byte[read];
                            System.arraycopy(buffer, 0, send, 0, read);
                            sendVoiceData(send);
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error en loop de micrófono", e);
                    }
                }
            }, "DvrSdkMicThread");

            micThread.start();
            Log.d(TAG, "Micrófono en envío continuo iniciado");
            return true;
        } catch (SecurityException se) {
            Log.e(TAG, "Sin permiso RECORD_AUDIO", se);
            isMicStreaming = false;
            return false;
        } catch (Exception e) {
            Log.e(TAG, "Error startMicStreaming", e);
            isMicStreaming = false;
            return false;
        }
    }

    public boolean stopMicStreaming() {
        boolean wasStreaming = isMicStreaming;
        isMicStreaming = false;
        try {
            if (micThread != null) {
                micThread.join(300);
                micThread = null;
            }
            if (audioRecord != null) {
                try {
                    audioRecord.stop();
                } catch (Exception ignored) {}
                audioRecord.release();
                audioRecord = null;
            }
            if (wasStreaming) {
                Log.d(TAG, "Micrófono en envío continuo detenido");
            }
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error stopMicStreaming", e);
            return false;
        }
    }
}

