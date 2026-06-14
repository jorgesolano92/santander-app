package com.cess07.puertassantander.dvrsdk;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.AudioTrack;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.Process;
import android.util.Log;
import java.lang.reflect.Method;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import com.sdk.interfance.NVRSDKCallback;
import com.sdk.interfance.nvrsdk;
import com.sdk.interfance.NET_SDK_DEVICEINFO;
// NET_SDK_CONNECT_TYPE: 0=TCP, 1=P2P, 2=P2P2

/**
 * Manager que gestiona la instancia del SDK DVR nativo
 */
public class DvrSdkManager {
    private static final String TAG = "DvrSdkManager";
    private static DvrSdkManager instance;
    private nvrsdk nvrSdk;
    private int userId = -1;
    private boolean isInitialized = false;
    private volatile boolean nativeCleanedUp = false;
    private String serverAddress = "";
    private long liveHandle = -1;
    private long voiceHandle = -1;
    /** Handle dedicado a VoiceComSendData cuando RX y TX usan sesiones distintas. */
    private long voiceSendHandle = -1;
    private volatile boolean voiceSendSymmetricG711 = false;
    private volatile boolean voiceRxSeen = false;
    /** Invalida callbacks/runnables de voz pendientes en mainHandler. */
    private volatile int voiceSessionGeneration = 0;
    private volatile long voiceSessionReadyAt = 0;
    private AudioRecord audioRecord = null;
    private Thread micThread = null;
    private volatile boolean isMicStreaming = false;
    private volatile long voiceBytesSent = 0;
    private volatile long voiceSendFailures = 0;
    private volatile long voiceBytesReceived = 0;
    private long audioEncoderHandle = -1;
    private AudioTrack talkAudioTrack = null;
    private volatile boolean voiceSendG711Encoded = false;
    private volatile boolean voiceNeedNoEncodeData = true;
    private volatile int lastVoiceChannel = -1;
    private volatile int audioEncoderCandidate = -1;
    /** Configuración activa de la sesión de voz (varía según StartVoiceCom vs MR). */
    private int micSampleRate = 16000;
    private int pcmChunkBytes = 1280;
    private int talkSampleRate = 16000;
    private String voiceModeLabel = "";
    /** VoiceComSendData: doc oficial MR; test_audio.py usa StartVoiceCom(FALSE) en canal -1. */
    private volatile boolean voiceSendEnabled = false;
    /** Si true, VoiceComSendData usa voiceHandle (sesión MR única); si no, solo voiceSendHandle. */
    private volatile boolean voiceTxOnMainHandle = false;
    /** Invalida callbacks onTalkData tardíos tras StopVoiceCom. */
    private volatile int voicePlaybackGeneration = 0;
    private final Object nativeLock = new Object();
    private final Object talkAudioLock = new Object();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final NVRSDKCallback sdkCallback = new NVRSDKCallback.Default() {
        @Override
        public void onTalkData(int byAudioFlag, int frameLen, byte[] data) {
            if (data == null || frameLen <= 0) {
                return;
            }
            voiceBytesReceived += frameLen;
            voiceRxSeen = true;
            if (voiceBytesReceived <= frameLen || voiceBytesReceived % 8000 < frameLen) {
                Log.i(TAG, "onTalkData flag=" + byAudioFlag + " bytes=" + frameLen
                        + " total=" + voiceBytesReceived + " needNoEncode=" + voiceNeedNoEncodeData);
            }
            playTalkAudio(data, frameLen, byAudioFlag);
        }
    };

    /** Doc SDK EncodeAudioFrame: 16 kHz, 16-bit mono, frames de 1280 bytes. */
    private static final int MIC_SAMPLE_RATE = 16000;
    private static final int PCM_CHUNK_BYTES = 1280;
    private static final int MIC_SAMPLE_RATE_LEGACY = 8000;
    private static final int PCM_CHUNK_BYTES_LEGACY = 3200;
    /** PCM 8 kHz mono 16-bit, 40 ms (compatible encoder G711 candidato 6). */
    private static final int PCM_CHUNK_BYTES_8K = 640;
    /** Igual que test_audio.py TEST_SECONDS=10. */
    private static final int VOICE_RX_WAIT_MS = 10000;
    private static final int TALK_SAMPLE_RATE_G711 = 8000;
    private static final int TALK_SAMPLE_RATE_PCM = 16000;
    private static final int MIC_CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO;
    private static final int MIC_AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT;

    private DvrSdkManager() {}

    public static synchronized DvrSdkManager getInstance() {
        if (instance == null) {
            instance = new DvrSdkManager();
        }
        return instance;
    }

    /** En ARM64 los punteros nativos como jlong suelen ser negativos; 0 y -1 son error. */
    private static boolean isValidNativeHandle(long handle) {
        return handle != 0 && handle != -1;
    }

    public boolean initialize(Context context) {
        synchronized (nativeLock) {
            if (isInitialized && nvrSdk != null && !nativeCleanedUp) {
                Log.d(TAG, "SDK ya está inicializado");
                return true;
            }

            try {
                if (context == null) {
                    Log.e(TAG, "Context nulo al inicializar SDK");
                    return false;
                }
                nativeCleanedUp = false;
                nvrSdk = nvrsdk.getInstance(context.getApplicationContext());
                DvrSdkAudioBridge.ensureLoaded();
                // Demo oficial: SetID + SetCallback antes de voz/intercom.
                nvrSdk.SetID(111);
                nvrSdk.SetCallback(sdkCallback);
                isInitialized = true;
                Log.d(TAG, "SDK inicializado correctamente (SetID=111, callback activo)");
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Error al inicializar SDK", e);
                isInitialized = false;
                nvrSdk = null;
                return false;
            }
        }
    }

    public int login(String server, int port, String username, String password,
                     int loginType, String deviceSn, boolean isWifi) {
        if (nvrSdk == null) {
            Log.e(TAG, "SDK no está inicializado");
            return -1;
        }

        try {
            if (loginType == 2) {
                boolean p2pResult = nvrSdk.SetNat2Addr(server, port);
                Log.d(TAG, "P2P2 SetNat2Addr result: " + p2pResult);
                if (!p2pResult) {
                    Log.e(TAG, "Error en SetNat2Addr: " + nvrSdk.GetLastError());
                }
            }

            int resultUserId = nvrSdk.LoginEx(server, port, username, password, loginType, deviceSn, isWifi);

            if (resultUserId > 0) {
                userId = resultUserId;
                serverAddress = server;
                logDeviceTalkCapability();
                Log.d(TAG, "Login exitoso, userId: " + userId);
                return userId;
            } else {
                Log.e(TAG, "Login falló, error code: " + nvrSdk.GetLastError());
                userId = -1;
                return -1;
            }
        } catch (Exception e) {
            Log.e(TAG, "Excepción durante login", e);
            userId = -1;
            return -1;
        }
    }

    public boolean logout() {
        synchronized (nativeLock) {
            stopMicStreamingInternal();
            stopVoiceIntercomInternal();
            stopLivePreviewInternal();

            if (userId <= 0 || nvrSdk == null) {
                Log.d(TAG, "No hay sesión activa para cerrar");
                return false;
            }

            try {
                boolean result = nvrSdk.Logout(userId);
                if (result) {
                    Log.d(TAG, "Logout exitoso");
                } else {
                    Log.e(TAG, "Error en logout, código: " + nvrSdk.GetLastError());
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
    }

    public NET_SDK_DEVICEINFO getDeviceInfo() {
        if (userId <= 0 || nvrSdk == null) {
            Log.e(TAG, "No hay sesión activa");
            return null;
        }

        try {
            byte[] data = nvrSdk.GetDeviceInfo(userId);
            if (data != null) {
                return NET_SDK_DEVICEINFO.deserialize(data, 0);
            } else {
                Log.e(TAG, "Error al obtener información del dispositivo: " + nvrSdk.GetLastError());
                return null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Excepción al obtener información del dispositivo", e);
            return null;
        }
    }

    public boolean isVoiceSendEnabled() {
        return voiceSendEnabled;
    }

    private void logDeviceTalkCapability() {
        try {
            NET_SDK_DEVICEINFO info = getDeviceInfo();
            if (info != null) {
                Log.i(TAG, "Dispositivo talkAudio=" + (info.talkAudio & 0xFF)
                        + " audioInputNum=" + (info.audioInputNum & 0xFF)
                        + " (talkAudio=0 → la cámara puede ser solo escucha)");
            }
        } catch (Exception e) {
            Log.w(TAG, "No se pudo leer talkAudio del dispositivo", e);
        }
    }

    public int getLastError() {
        if (nvrSdk == null) {
            return -1;
        }
        return nvrSdk.GetLastError();
    }

    public void setNativeLog(boolean enable) {
        if (nvrSdk != null) {
            nvrSdk.SetNativelog(enable);
        }
    }

    /** Cleanup nativo: solo una vez por ciclo Init→Cleanup. Llamadas repetidas crashean libnvrsdk. */
    public void cleanup() {
        synchronized (nativeLock) {
            if (nvrSdk == null || nativeCleanedUp) {
                Log.d(TAG, "SDK ya limpiado o no inicializado");
                isInitialized = false;
                return;
            }

            stopMicStreamingInternal();
            if (userId > 0) {
                try {
                    nvrSdk.Logout(userId);
                    Log.d(TAG, "Logout en cleanup");
                } catch (Exception e) {
                    Log.w(TAG, "Logout en cleanup falló", e);
                }
                userId = -1;
                serverAddress = "";
            }

            releaseAudioEncoderInternal();
            releaseTalkAudioTrack();
            try {
                if (nvrSdk != null) {
                    nvrSdk.SetCallback(null);
                }
            } catch (Exception e) {
                Log.w(TAG, "SetCallback(null) en cleanup", e);
            }

            try {
                nvrSdk.Cleanup();
                Log.d(TAG, "SDK limpiado correctamente");
            } catch (Exception e) {
                Log.e(TAG, "Error al limpiar SDK", e);
            } finally {
                nativeCleanedUp = true;
                isInitialized = false;
                nvrSdk = null;
                voiceHandle = -1;
                liveHandle = -1;
            }        }
    }

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
        return isInitialized && nvrSdk != null && !nativeCleanedUp;
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
            liveHandle = nvrSdk.LivePlay(userId, channel, streamType);
            Log.d(TAG, "LivePlay handle: " + liveHandle);
            return isValidNativeHandle(liveHandle) ? liveHandle : -1;
        } catch (Exception e) {
            Log.e(TAG, "Error startLivePreview", e);
            liveHandle = -1;
            return -1;
        }
    }

    public boolean stopLivePreview() {
        return stopLivePreviewInternal();
    }

    private boolean stopLivePreviewInternal() {
        if (nvrSdk == null || !isValidNativeHandle(liveHandle)) {
            liveHandle = -1;
            return false;
        }
        try {
            boolean result = nvrSdk.StopLivePlay(liveHandle);
            liveHandle = -1;
            return result;
        } catch (Exception e) {
            Log.e(TAG, "Error stopLivePreview", e);
            liveHandle = -1;
            return false;
        }
    }

    public long startVoiceIntercom(int channel) {
        if (userId <= 0 || nvrSdk == null) {
            Log.e(TAG, "No hay sesión activa para voz");
            return -1;
        }

        stopVoiceIntercomInternal();
        cooldownAfterVoiceStop();
        voiceSessionGeneration++;
        final int sessionGen = voiceSessionGeneration;
        voiceBytesSent = 0;
        voiceSendFailures = 0;
        voiceSendG711Encoded = false;

        try {
            lastVoiceChannel = channel;
            nvrSdk.SetNativelog(true);

            int[] channelsToTry = buildVoiceChannelsToTry(channel);

            Log.i(TAG, "Diagnóstico talkback: canales a probar="
                    + java.util.Arrays.toString(channelsToTry));
            for (int ch : channelsToTry) {
                if (sessionGen != voiceSessionGeneration) {
                    Log.w(TAG, "startVoiceIntercom cancelado (sesión superseded)");
                    return -1;
                }
                Log.i(TAG, "Diagnóstico talkback: === canal=" + ch + " ===");
                if (tryActivateVoiceMode(ch)) {
                    Log.i(TAG, "Intercom activo: " + voiceModeLabel + " canal=" + ch
                            + " handle=" + voiceHandle
                            + " tx=" + voiceSendEnabled
                            + " rx=" + voiceRxSeen
                            + (isValidNativeHandle(voiceSendHandle)
                                    ? " sendHandle=" + voiceSendHandle : ""));
                    return voiceHandle;
                }
                cleanupVoiceBetweenChannelAttempts();
            }

            Log.e(TAG, "Ningún modo de voz funcionó, err=" + nvrSdk.GetLastError());
            voiceHandle = -1;
            return -1;
        } catch (Exception e) {
            Log.e(TAG, "Error startVoiceIntercom", e);
            voiceHandle = -1;
            return -1;
        }
    }

    /** test_audio.py usa -1; en Android MR(false) RX funcionó en canal 1. */
    private static int[] buildVoiceChannelsToTry(int configured) {
        java.util.LinkedHashSet<Integer> order = new java.util.LinkedHashSet<>();
        order.add(-1);
        order.add(1);
        if (configured != -1 && configured != 1) {
            order.add(configured);
        }
        int[] out = new int[order.size()];
        int i = 0;
        for (int ch : order) {
            out[i++] = ch;
        }
        return out;
    }

    private void ensureVoiceCallbackRegistered() {
        if (nvrSdk != null) {
            nvrSdk.SetCallback(sdkCallback);
        }
    }

    /** Limpia voz entre canales sin invalidar voiceSessionGeneration (evita "superseded"). */
    private void cleanupVoiceBetweenChannelAttempts() throws InterruptedException {
        voiceSendEnabled = false;
        voicePlaybackGeneration++;
        stopMicStreamingInternal();
        mainHandler.removeCallbacksAndMessages(null);
        synchronized (talkAudioLock) {
            releaseTalkAudioTrackInternal();
        }
        stopVoiceComBlocking(false);
        releaseAudioEncoderInternal();
        voiceHandle = -1;
        voiceSendHandle = -1;
        voiceBytesSent = 0;
        voiceSendFailures = 0;
        voiceBytesReceived = 0;
        voiceRxSeen = false;
        cooldownAfterVoiceStop();
    }

    /**
     * Códec G711A 8 kHz ANTES de StartVoiceComMR (handshake). Si SetAudioInfo llega tarde,
     * el firmware TD-E3110 descarta TX.
     */
    private boolean prepareTalkbackCodecBeforeSession() {
        byte[] g711Wave = buildWaveFormatEx((short) 6, (short) 1, 8000, 8000, (short) 1, (short) 8);
        byte[] g711Info = safeSetAudioInfo(nvrsdk.CODEC_AUDIO_G711a);
        byte[] g711Fmt = safeSetAudioInfo(nvrsdk.AUDIO_FORMAT_G711);
        boolean encoderOk = initAudioEncoderInternal(true);
        applyEncoderTimingFromCandidate();
        Log.i(TAG, "Talkback pre-session: G711A waveLen=" + g711Wave.length
                + " SetAudioInfo(G711a)=" + (g711Info != null ? g711Info.length : 0)
                + " SetAudioInfo(G711)=" + (g711Fmt != null ? g711Fmt.length : 0)
                + " InitAudioEncoder=" + encoderOk);
        voiceSendSymmetricG711 = true;
        micSampleRate = MIC_SAMPLE_RATE_LEGACY;
        pcmChunkBytes = PCM_CHUNK_BYTES_8K;
        talkSampleRate = TALK_SAMPLE_RATE_G711;
        return g711Info != null || g711Fmt != null || encoderOk;
    }

    /** SetAudioInfo / getAudioInfo tras abrir handle (algunos firmwares solo negocian aquí). */
    private void prepareTalkbackCodecAfterSession(String label) {
        byte[] g711a = safeSetAudioInfo(nvrsdk.CODEC_AUDIO_G711a);
        byte[] g711 = safeSetAudioInfo(nvrsdk.AUDIO_FORMAT_G711);
        byte[] pcm = safeSetAudioInfo(nvrsdk.CODEC_AUDIO_PCM);
        byte[] fromHandle = fetchAudioInfoFromVoiceHandle();
        Log.i(TAG, "Talkback post-session [" + label + "]: G711a="
                + (g711a != null ? g711a.length : 0) + " G711="
                + (g711 != null ? g711.length : 0) + " PCM="
                + (pcm != null ? pcm.length : 0) + " getAudioInfo="
                + (fromHandle != null ? fromHandle.length : 0));
        if (fromHandle != null || g711a != null || g711 != null) {
            initAudioEncoderInternal(true);
            applyEncoderTimingFromCandidate();
        }
    }

    private void logTalkbackPrerequisites() {
        Log.i(TAG, "Talkback TVT: 1 sesión activa (cerrar SuperCam/NVMS); usuario con permiso "
                + "Two-way Audio/Intercom; payload G711A 8kHz o PCM según modo MR");
    }

    /**
     * Réplica test_audio.py (Windows OK en TD-E3110): StartVoiceCom(FALSE, canal=-1).
     * Fallback Android TX: StartVoiceCom_MR(TRUE)+PCM 3200 B (voice_forward.cpp).
     */
    private boolean tryActivateVoiceMode(int channel) throws InterruptedException {
        logTalkbackPrerequisites();
        Log.i(TAG, "Flujo voz canal=" + channel + " (MR false RX → test_audio → MR true TX)");
        if (tryStartVoiceMrFalseRx(channel)) {
            return true;
        }
        voiceRxSeen = false;
        if (tryStartVoiceComTestAudio(channel)) {
            return true;
        }
        voiceRxSeen = false;
        return tryStartVoiceComMrPcmTx(channel);
    }

    /**
     * test_audio.py: StartVoiceCom(FALSE, -1). En Windows el callback va en la llamada;
     * en Android JAR solo SetCallback global — si el handle abre, activamos TX con mic real.
     */
    private boolean tryStartVoiceComTestAudio(int channel) throws InterruptedException {
        resetVoiceSendState();
        voiceSendSymmetricG711 = false;
        stopLivePreviewIfActive();
        ensureVoiceCallbackRegistered();
        if (!openStartVoiceComOnMain(channel, false)) {
            return false;
        }
        configureVoiceSession("StartVoiceCom(false) test_audio", MIC_SAMPLE_RATE_LEGACY,
                PCM_CHUNK_BYTES_LEGACY, MIC_SAMPLE_RATE_LEGACY, false);
        voiceNeedNoEncodeData = false;
        Log.i(TAG, "Sesión test_audio abierta handle=" + voiceHandle + " canal=" + channel);
        applyPostVoiceComSetup();
        markVoiceSessionReady();
        waitForVoiceRx(VOICE_RX_WAIT_MS);
        if (!voiceRxSeen) {
            Log.w(TAG, "StartVoiceCom(false) sin onTalkData en Android; no es equivalente a Windows");
            closeEvalVoiceSession();
            return false;
        }
        voiceTxOnMainHandle = true;
        voiceSendEnabled = runSendProbePcmSync();
        Log.i(TAG, "test_audio activo rx=" + voiceRxSeen + " bytes=" + voiceBytesReceived
                + " txProbe=" + voiceSendEnabled);
        return true;
    }

    /** Android: onTalkData suele llegar con MR(false)+G711 (canal 1 confirmado en logs). */
    private boolean tryStartVoiceMrFalseRx(int channel) throws InterruptedException {
        resetVoiceSendState();
        voiceSendSymmetricG711 = false;
        stopLivePreviewIfActive();
        ensureVoiceCallbackRegistered();
        if (!openVoiceSessionOnMain(channel, false)) {
            return false;
        }
        configureVoiceSession("StartVoiceComMR(false) RX Android", MIC_SAMPLE_RATE_LEGACY,
                PCM_CHUNK_BYTES_8K, TALK_SAMPLE_RATE_G711, false);
        voiceNeedNoEncodeData = true;
        Log.i(TAG, "Sesión MR(false) RX abierta handle=" + voiceHandle + " canal=" + channel);
        applyPostVoiceComSetup();
        markVoiceSessionReady();
        waitForVoiceRx(VOICE_RX_WAIT_MS);
        if (voiceRxSeen) {
            voiceTxOnMainHandle = true;
            voiceSendSymmetricG711 = false;
            boolean txPcm = runSendProbePcmSync();
            if (txPcm) {
                voiceSendEnabled = true;
                voiceModeLabel = "StartVoiceComMR(false) RX+PCM TX";
                Log.i(TAG, "MR(false) RX+PCM TX canal=" + channel + " rx bytes="
                        + voiceBytesReceived + " chunk=" + pcmChunkBytes);
                return true;
            }
            Log.i(TAG, "MR(false) RX OK sin TX en mismo handle; probando MR(true) TX paralelo...");
            if (openVoiceTxSessionOnMain(channel)) {
                voiceTxOnMainHandle = false;
                markVoiceSessionReady();
                txPcm = runSendProbePcmSync();
                voiceSendEnabled = txPcm;
                voiceModeLabel = "MR(false)RX + MR(true)TX PCM";
                Log.i(TAG, "Duplex paralelo canal=" + channel + " txProbe=" + txPcm
                        + " rxHandle=" + voiceHandle + " txHandle=" + voiceSendHandle);
                if (!txPcm) {
                    Log.w(TAG, "MR(true) TX abierto pero probe PCM falló; sin micrófono");
                }
                return true;
            }
            voiceSendEnabled = false;
            voiceTxOnMainHandle = false;
            voiceModeLabel = "StartVoiceComMR(false) RX-only (TX vía puente)";
            Log.w(TAG, "MR(false) RX-only canal=" + channel + " bytes=" + voiceBytesReceived
                    + " (TX nativo imposible: 1 sesión, sin VoiceComSendData en MR false)");
            return true;
        }
        Log.w(TAG, "MR(false) sin onTalkData en " + VOICE_RX_WAIT_MS + "ms canal=" + channel);
        closeEvalVoiceSession();
        return false;
    }

    private boolean tryStartVoiceComMrPcmTx(int channel) throws InterruptedException {
        resetVoiceSendState();
        voiceSendSymmetricG711 = false;
        stopLivePreviewIfActive();
        ensureVoiceCallbackRegistered();
        if (!openVoiceSessionOnMain(channel, true)) {
            return false;
        }
        configureVoiceSession("StartVoiceComMR(true)+PCM8k/3200", MIC_SAMPLE_RATE_LEGACY,
                PCM_CHUNK_BYTES_LEGACY, MIC_SAMPLE_RATE_LEGACY, true);
        voiceNeedNoEncodeData = true;
        Log.i(TAG, "Sesión MR+PCM abierta handle=" + voiceHandle + " canal=" + channel);
        applyPostVoiceComSetup();
        markVoiceSessionReady();
        waitForVoiceRx(VOICE_RX_WAIT_MS);
        voiceTxOnMainHandle = true;
        boolean txPcm = runSendProbePcmSync();
        voiceSendEnabled = txPcm;
        Log.i(TAG, "MR(true) activo canal=" + channel + " rx=" + voiceRxSeen + " txProbe=" + txPcm);
        return txPcm || voiceRxSeen;
    }

    private void stopLivePreviewIfActive() {
        if (isValidNativeHandle(liveHandle)) {
            Log.i(TAG, "LivePlay detenido antes de voz (test_audio no usa preview)");
            stopLivePreview();
        }
    }

    /** GetAudioInfo + volumen, como test_audio.py tras StartVoiceCom. */
    private void applyPostVoiceComSetup() {
        byte[] info = fetchAudioInfoFromVoiceHandle();
        Log.i(TAG, "GetAudioInfo post-StartVoiceCom len=" + (info != null ? info.length : 0));
        trySetVoiceComClientVolume(1);
    }

    private void trySetVoiceComClientVolume(int volume) {
        if (!isValidNativeHandle(voiceHandle) || nvrSdk == null) {
            return;
        }
        try {
            Method m = nvrSdk.getClass().getMethod("SetVoiceComClientVolume", long.class, int.class);
            Object ok = m.invoke(nvrSdk, voiceHandle, volume);
            Log.i(TAG, "SetVoiceComClientVolume(" + volume + ")=" + ok);
            return;
        } catch (Exception ignored) {
            // instancia sin método
        }
        try {
            Method m = nvrsdk.class.getMethod("SetVoiceComClientVolume", long.class, int.class);
            Object ok = m.invoke(null, voiceHandle, volume);
            Log.i(TAG, "SetVoiceComClientVolume static(" + volume + ")=" + ok);
        } catch (Exception e) {
            Log.w(TAG, "SetVoiceComClientVolume no disponible en JAR");
        }
    }

    private boolean evaluateAndKeepVoiceMode(int channel, String label, int micRate, int chunkBytes,
            int talkRate, boolean mrNeedNoEncode, boolean useStartVoiceCom,
            boolean startVoiceComNeedNoEnc, boolean g711Symmetric, boolean acceptRxOnly)
            throws InterruptedException {
        resetVoiceSendState();
        voiceSendSymmetricG711 = g711Symmetric;
        boolean liveOk = ensureLivePlayForVoice(channel);
        Log.i(TAG, "Pre-voz LivePlay voz canal=" + channel + " ok=" + liveOk);
        boolean opened;
        if (useStartVoiceCom) {
            opened = openStartVoiceComOnMain(channel, startVoiceComNeedNoEnc);
        } else {
            opened = openVoiceSessionOnMain(channel, mrNeedNoEncode);
        }
        if (!opened) {
            Log.w(TAG, "No abrió " + label + " canal=" + channel + " err=" + nvrSdk.GetLastError());
            return false;
        }
        configureVoiceSession(label, micRate, chunkBytes, talkRate, mrNeedNoEncode);
        Log.i(TAG, "Sesión abierta " + label + " handle=" + voiceHandle + " canal=" + channel);
        markVoiceSessionReady();
        waitForVoiceRx(VOICE_RX_WAIT_MS);
        boolean rx = voiceRxSeen;
        prepareTalkbackCodecAfterSession(label);
        boolean tx = runSendProbePcmSync();
        int score = (rx ? 2 : 0) | (tx ? 4 : 0);
        Log.i(TAG, "Eval " + label + " canal=" + channel + " rx=" + rx + " tx=" + tx
                + " score=" + score + " err=" + nvrSdk.GetLastError());
        if (rx && !tx) {
            Log.w(TAG, "DIAG canal=" + channel + " " + label + ": RX OK (onTalkData) pero TX rechazado");
        } else if (!rx && !tx) {
            Log.w(TAG, "DIAG canal=" + channel + " " + label + ": sin RX ni TX en "
                    + VOICE_RX_WAIT_MS + "ms");
        }

        if (tx) {
            voiceSendEnabled = true;
            if (!rx) {
                Log.w(TAG, "TX OK sin onTalkData en " + label
                        + "; RX puede llegar después — habla y comprueba altavoz cámara");
            }
            return true;
        }
        if (acceptRxOnly && rx) {
            voiceSendEnabled = false;
            Log.w(TAG, "Modo RX-only activo: " + label + " canal=" + channel
                    + " (escucha OK; TX pendiente de demo fabricante)");
            return true;
        }
        Log.e(TAG, "TX rechazado " + label + " canal=" + channel
                + " rx=" + rx + " err=" + nvrSdk.GetLastError());
        closeEvalVoiceSession();
        return false;
    }

    private boolean ensureLivePlayForVoice(int channel) {
        if (channel == 0 && isValidNativeHandle(liveHandle)) {
            Log.i(TAG, "LivePlay detenido antes de voz en canal 0 (evita conflicto SDK)");
            stopLivePreview();
        }
        if (channel != 0 && isValidNativeHandle(liveHandle)) {
            Log.d(TAG, "LivePlay activo en preview canal=0 (voz canal=" + channel + ")");
            return true;
        }
        if (isValidNativeHandle(liveHandle)) {
            return true;
        }
        Log.i(TAG, "LivePlay pre-voz: preview canal=0 (voz canal=" + channel + ")");
        long handle = startLivePreview(0, 0);
        if (isValidNativeHandle(handle)) {
            Log.i(TAG, "LivePlay auxiliar OK canal=0 handle=" + handle);
            return true;
        }
        Log.w(TAG, "LivePlay falló canal=0 err=" + nvrSdk.GetLastError());
        return false;
    }

    private void closeEvalVoiceSession() throws InterruptedException {
        voiceSendEnabled = false;
        voicePlaybackGeneration++;
        mainHandler.removeCallbacksAndMessages(null);
        synchronized (talkAudioLock) {
            releaseTalkAudioTrackInternal();
        }
        stopVoiceComBlocking(false);
        cooldownAfterVoiceStop();
    }

    /** StopVoiceCom puede bloquear segundos; no usar el main looper del UI. */
    private boolean stopVoiceComBlocking(boolean logResult) throws InterruptedException {
        if (!isValidNativeHandle(voiceHandle) && !isValidNativeHandle(voiceSendHandle)) {
            return true;
        }
        final boolean[] result = { false };
        final CountDownLatch latch = new CountDownLatch(1);
        new Thread(() -> {
            try {
                result[0] = stopVoiceComInline(logResult);
            } finally {
                latch.countDown();
            }
        }, "DvrSdkVoiceStop").start();
        if (!latch.await(8, TimeUnit.SECONDS)) {
            Log.e(TAG, "Timeout StopVoiceCom");
            voiceHandle = -1;
            voiceSendHandle = -1;
            return false;
        }
        return result[0];
    }

    private void waitForVoiceRx(int timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (voiceRxSeen) {
                return;
            }
            Thread.sleep(50);
        }
    }

    /** Probe G711 320 B — mismo formato que onTalkData entrante (MR false, flag=1). */
    private boolean runSendProbeG711Sync() throws InterruptedException {
        byte[] pcm640 = new byte[PCM_CHUNK_BYTES_8K];
        byte[] g711 = encodeG711ALaw(pcm640);
        if (trySendProbePayload(g711, "g711/320")) {
            voiceSendSymmetricG711 = true;
            pcmChunkBytes = PCM_CHUNK_BYTES_8K;
            micSampleRate = MIC_SAMPLE_RATE_LEGACY;
            talkSampleRate = TALK_SAMPLE_RATE_G711;
            return true;
        }
        return false;
    }

    /** Doc SDK: VoiceComSendData = PCM sin codificar (voice_forward.cpp usa 3200 B @ 8 kHz). */
    private boolean runSendProbePcmSync() throws InterruptedException {
        byte[] pcm3200 = new byte[PCM_CHUNK_BYTES_LEGACY];
        if (trySendProbePayload(pcm3200, "pcm/3200")) {
            voiceSendSymmetricG711 = false;
            pcmChunkBytes = PCM_CHUNK_BYTES_LEGACY;
            micSampleRate = MIC_SAMPLE_RATE_LEGACY;
            talkSampleRate = MIC_SAMPLE_RATE_LEGACY;
            return true;
        }
        byte[] pcm640 = new byte[PCM_CHUNK_BYTES_8K];
        if (trySendProbePayload(pcm640, "pcm/640")) {
            voiceSendSymmetricG711 = false;
            pcmChunkBytes = PCM_CHUNK_BYTES_8K;
            micSampleRate = MIC_SAMPLE_RATE_LEGACY;
            talkSampleRate = MIC_SAMPLE_RATE_LEGACY;
            return true;
        }
        return false;
    }

    private boolean trySendProbePayload(byte[] payload, String tag) throws InterruptedException {
        if (payload == null || payload.length == 0) {
            return false;
        }
        final int probeGen = voiceSessionGeneration;
        if (Looper.myLooper() == Looper.getMainLooper()) {
            boolean ok = sendRawVoiceProbeOnMain(payload);
            if (ok) {
                Log.i(TAG, "Probe TX OK " + tag + " len=" + payload.length);
            }
            return ok;
        }
        final CountDownLatch latch = new CountDownLatch(1);
        final boolean[] ok = { false };
        mainHandler.post(() -> {
            if (probeGen != voiceSessionGeneration) {
                latch.countDown();
                return;
            }
            ok[0] = sendRawVoiceProbeOnMain(payload);
            if (ok[0]) {
                Log.i(TAG, "Probe TX OK " + tag + " len=" + payload.length);
            }
            latch.countDown();
        });
        if (!latch.await(2, TimeUnit.SECONDS)) {
            Log.w(TAG, "Timeout probe TX " + tag);
            return false;
        }
        return ok[0];
    }

    private boolean sendRawVoiceProbeOnMain(byte[] payload) {
        if (!isVoiceSendReady() || nvrSdk == null) {
            return false;
        }
        long sendHandle = getActiveSendHandle();
        if (!isValidNativeHandle(sendHandle) || payload == null || payload.length == 0) {
            return false;
        }
        try {
            if (nvrSdk.VoiceComSendData(sendHandle, payload, payload.length)) {
                return true;
            }
        } catch (Throwable t) {
            Log.w(TAG, "Probe VoiceComSendData Java excepción", t);
        }
        try {
            return DvrSdkAudioBridge.voiceComSendData(sendHandle, payload);
        } catch (Throwable t) {
            Log.w(TAG, "Probe VoiceComSendData JNI excepción", t);
        }
        return false;
    }

    /**
     * MR(false) escucha (onTalkData) + MR(true) envía (VoiceComSendData).
     * Algunas IPC no admiten TX/RX en el mismo handle.
     */
    private boolean tryStartVoiceDuplexMr(int channel) throws InterruptedException {
        resetVoiceSendState();
        if (!openVoiceSessionOnMain(channel, false)) {
            return false;
        }
        if (!openVoiceTxSessionOnMain(channel)) {
            Log.w(TAG, "Duplex: no se pudo abrir MR(true) TX, err=" + nvrSdk.GetLastError());
            closeVoiceHandleOnly();
            return false;
        }
        configureVoiceSession("MR(false)RX+MR(true)TX PCM8k/3200", MIC_SAMPLE_RATE_LEGACY,
                PCM_CHUNK_BYTES_LEGACY, TALK_SAMPLE_RATE_G711, false);
        voiceSendEnabled = true;
        markVoiceSessionReady();
        logOptionalSendProbe();
        return true;
    }

    /** MR(false) + G711 320 B simétrico con onTalkData (flag=1, 320 B). */
    private boolean tryStartVoiceMrG711Symmetric(int channel) throws InterruptedException {
        resetVoiceSendState();
        voiceSendSymmetricG711 = true;
        if (!openVoiceSessionOnMain(channel, false)) {
            return false;
        }
        configureVoiceSession("MR(false)+G711/320 symmetric", MIC_SAMPLE_RATE_LEGACY,
                PCM_CHUNK_BYTES_8K, TALK_SAMPLE_RATE_G711, false);
        voiceSendEnabled = true;
        markVoiceSessionReady();
        logOptionalSendProbe();
        return true;
    }

    private void resetVoiceSendState() {
        voiceSendHandle = -1;
        voiceSendSymmetricG711 = false;
        voiceTxOnMainHandle = false;
    }

    /**
     * MR(false) + PCM 8 kHz — TD-E3110 recibe onTalkData en este modo.
     */
    private boolean tryStartVoiceMrPcmFalse(int channel) throws InterruptedException {
        resetVoiceSendState();
        if (!openVoiceSessionOnMain(channel, false)) {
            return false;
        }
        configureVoiceSession("StartVoiceComMR(false)+PCM8k/3200", MIC_SAMPLE_RATE_LEGACY,
                PCM_CHUNK_BYTES_LEGACY, TALK_SAMPLE_RATE_G711, false);
        voiceSendEnabled = true;
        markVoiceSessionReady();
        logOptionalSendProbe();
        return true;
    }

    /** StartVoiceCom(false) + envío PCM (algunas IPC usan este handle para TX). */
    private boolean tryStartVoiceComWithSend(int channel) throws InterruptedException {
        if (!openStartVoiceComOnMain(channel, false)) {
            return false;
        }
        configureVoiceSession("StartVoiceCom(false)+PCM8k/3200", MIC_SAMPLE_RATE_LEGACY,
                PCM_CHUNK_BYTES_LEGACY, TALK_SAMPLE_RATE_G711, false);
        voiceSendEnabled = true;
        markVoiceSessionReady();
        logOptionalSendProbe();
        return true;
    }

    /** MR(false) + PCM 16 kHz / 1280 B (estándar EncodeAudioFrame del SDK). */
    private boolean tryStartVoiceMrPcmFalse16k(int channel) throws InterruptedException {
        if (!openVoiceSessionOnMain(channel, false)) {
            return false;
        }
        configureVoiceSession("StartVoiceComMR(false)+PCM16k/1280", MIC_SAMPLE_RATE,
                PCM_CHUNK_BYTES, TALK_SAMPLE_RATE_PCM, false);
        voiceSendEnabled = true;
        markVoiceSessionReady();
        logOptionalSendProbe();
        return true;
    }

    /** StartVoiceComMR(true) + PCM 8 kHz 3200 B — flujo voice_forward.cpp (NVR). */
    private boolean tryStartVoiceMrRaw(int channel) throws InterruptedException {
        if (!openVoiceSessionOnMain(channel, true)) {
            return false;
        }
        configureVoiceSession("StartVoiceComMR(true)+PCM8k/3200", MIC_SAMPLE_RATE_LEGACY,
                PCM_CHUNK_BYTES_LEGACY, TALK_SAMPLE_RATE_G711, true);
        voiceSendEnabled = true;
        markVoiceSessionReady();
        logOptionalSendProbe();
        return true;
    }

    /** MR(true) con frames más pequeños (640 B = 40 ms @ 8 kHz). */
    private boolean tryStartVoiceMrRawSmall(int channel) throws InterruptedException {
        if (!openVoiceSessionOnMain(channel, true)) {
            return false;
        }
        configureVoiceSession("StartVoiceComMR(true)+PCM8k/640", MIC_SAMPLE_RATE_LEGACY,
                PCM_CHUNK_BYTES_8K, TALK_SAMPLE_RATE_G711, true);
        voiceSendEnabled = true;
        markVoiceSessionReady();
        logOptionalSendProbe();
        return true;
    }

    /** @deprecated el SDK exige PCM en VoiceComSendData, no G711 codificado. */
    private boolean tryStartVoiceMrG711(int channel) throws InterruptedException {
        return tryStartVoiceMrPcmFalse(channel);
    }

    /** @deprecated VoiceComSendData no usa frames EncodeAudioFrame. */
    private boolean tryStartVoiceMrEncoded(int channel) throws InterruptedException {
        return tryStartVoiceMrPcmFalse(channel);
    }
    /** StartVoiceCom(false): solo recepción (onTalkData). No admite VoiceComSendData. */
    private boolean tryStartVoiceComReceiveOnly(int channel) throws InterruptedException {
        if (!openStartVoiceComOnMain(channel, false)) {
            return false;
        }
        configureVoiceSession("StartVoiceCom(false) RX-only", MIC_SAMPLE_RATE, PCM_CHUNK_BYTES,
                TALK_SAMPLE_RATE_PCM, false);
        voiceSendEnabled = false;
        Log.i(TAG, "StartVoiceCom RX-only (sin envío VoiceComSendData)");
        return true;
    }

    /** @deprecated use tryStartVoiceComReceiveOnly */
    private boolean tryStartVoiceComIntercom(int channel) throws InterruptedException {
        return tryStartVoiceComReceiveOnly(channel);
    }

    private void configureVoiceSession(String label, int micRate, int chunkBytes, int talkRate,
                                       boolean needNoEncode) {
        voiceModeLabel = label;
        micSampleRate = micRate;
        pcmChunkBytes = chunkBytes;
        talkSampleRate = talkRate;
        voiceNeedNoEncodeData = needNoEncode;
    }

    private void markVoiceSessionReady() {
        voiceSessionReadyAt = System.currentTimeMillis() + 800;
    }

    private boolean isVoiceSendReady() {
        return System.currentTimeMillis() >= voiceSessionReadyAt;
    }

    /** Probe informativo tras activar modo (la evaluación síncrona ya probó TX). */
    private void logOptionalSendProbe() {
        // no-op
    }

    private void cooldownAfterVoiceStop() {
        try {
            Thread.sleep(450);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private boolean openStartVoiceComOnMain(int channel, boolean needCbNoEncData)
            throws InterruptedException {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            return openStartVoiceComInline(channel, needCbNoEncData);
        }
        final int sessionGen = voiceSessionGeneration;
        final CountDownLatch latch = new CountDownLatch(1);
        final boolean[] ok = { false };
        mainHandler.post(() -> {
            if (sessionGen != voiceSessionGeneration) {
                ok[0] = false;
            } else {
                ok[0] = openStartVoiceComInline(channel, needCbNoEncData);
            }
            latch.countDown();
        });
        if (!latch.await(8, TimeUnit.SECONDS)) {
            Log.e(TAG, "Timeout esperando StartVoiceCom");
            voiceHandle = -1;
            return false;
        }
        return ok[0];
    }

    private boolean openStartVoiceComInline(int channel, boolean needCbNoEncData) {
        try {
            voiceHandle = nvrSdk.StartVoiceCom(userId, needCbNoEncData, channel);
            voiceNeedNoEncodeData = needCbNoEncData;
            Log.i(TAG, "StartVoiceCom(" + needCbNoEncData + ") canal=" + channel
                    + " handle=" + voiceHandle);
            if (!isValidNativeHandle(voiceHandle)) {
                Log.e(TAG, "StartVoiceCom falló, err=" + nvrSdk.GetLastError());
                voiceHandle = -1;
                return false;
            }
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error StartVoiceCom", e);
            voiceHandle = -1;
            return false;
        }
    }

    private boolean openVoiceTxSessionOnMain(int channel) throws InterruptedException {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            return openVoiceTxSessionInline(channel);
        }
        final int sessionGen = voiceSessionGeneration;
        final CountDownLatch latch = new CountDownLatch(1);
        final boolean[] ok = { false };
        mainHandler.post(() -> {
            if (sessionGen != voiceSessionGeneration) {
                latch.countDown();
                return;
            }
            ok[0] = openVoiceTxSessionInline(channel);
            latch.countDown();
        });
        if (!latch.await(3, TimeUnit.SECONDS)) {
            Log.e(TAG, "Timeout esperando StartVoiceComMR TX");
            return false;
        }
        return ok[0];
    }

    private boolean openVoiceTxSessionInline(int channel) {
        try {
            voiceSendHandle = nvrSdk.StartVoiceComMR(userId, true, channel);
            Log.i(TAG, "StartVoiceComMR(true) TX canal=" + channel
                    + " handle=" + voiceSendHandle);
            if (!isValidNativeHandle(voiceSendHandle)) {
                Log.e(TAG, "StartVoiceComMR TX falló, err=" + nvrSdk.GetLastError());
                voiceSendHandle = -1;
                return false;
            }
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error StartVoiceComMR TX", e);
            voiceSendHandle = -1;
            return false;
        }
    }

    private long getActiveSendHandle() {
        if (isValidNativeHandle(voiceSendHandle)) {
            return voiceSendHandle;
        }
        if (voiceTxOnMainHandle && isValidNativeHandle(voiceHandle)) {
            return voiceHandle;
        }
        return -1;
    }

    /** @deprecated la cámara no admite MR(true) en paralelo con MR(false). */
    private void maybeAttachTxSession() {
        // no-op: TD-E3110 rechaza segunda sesión StartVoiceComMR mientras MR(false) está activo
    }
    private boolean openVoiceSessionOnMain(int channel, boolean needNoEncode) throws InterruptedException {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            return openVoiceSessionInline(channel, needNoEncode);
        }
        final int sessionGen = voiceSessionGeneration;
        final CountDownLatch latch = new CountDownLatch(1);
        final boolean[] ok = {false};
        mainHandler.post(() -> {
            if (sessionGen != voiceSessionGeneration) {
                ok[0] = false;
            } else {
                ok[0] = openVoiceSessionInline(channel, needNoEncode);
            }
            latch.countDown();
        });

        if (!latch.await(3, TimeUnit.SECONDS)) {
            Log.e(TAG, "Timeout esperando StartVoiceComMR");
            voiceHandle = -1;
            return false;
        }
        return ok[0];
    }

    private boolean openVoiceSessionInline(int channel, boolean needNoEncode) {
        try {
            voiceHandle = nvrSdk.StartVoiceComMR(userId, needNoEncode, channel);
            voiceNeedNoEncodeData = needNoEncode;
            Log.i(TAG, "StartVoiceComMR(" + needNoEncode + ") canal=" + channel
                    + " handle=" + voiceHandle + " ptr=0x" + Long.toHexString(voiceHandle));
            if (!isValidNativeHandle(voiceHandle)) {
                Log.e(TAG, "StartVoiceComMR falló, err=" + nvrSdk.GetLastError());
                voiceHandle = -1;
                return false;
            }
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error StartVoiceComMR", e);
            voiceHandle = -1;
            return false;
        }
    }

    private void closeVoiceHandleOnly() {
        stopVoiceComOnMain(false);
    }

    private boolean stopVoiceComOnMain(boolean logResult) {
        try {
            return stopVoiceComBlocking(logResult);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            voiceHandle = -1;
            voiceSendHandle = -1;
            return false;
        }
    }

    private boolean stopVoiceComInline(boolean logResult) {
        boolean ok = true;
        if (nvrSdk != null && isValidNativeHandle(voiceSendHandle)) {
            try {
                boolean txResult = nvrSdk.StopVoiceCom(voiceSendHandle);
                if (logResult) {
                    Log.d(TAG, "StopVoiceCom TX result=" + txResult);
                }
                ok = txResult && ok;
            } catch (Exception e) {
                Log.w(TAG, "StopVoiceCom TX falló", e);
                ok = false;
            } finally {
                voiceSendHandle = -1;
            }
        }
        if (nvrSdk == null || !isValidNativeHandle(voiceHandle)) {
            voiceHandle = -1;
            return ok;
        }
        try {
            boolean result = nvrSdk.StopVoiceCom(voiceHandle);
            if (logResult) {
                Log.d(TAG, "StopVoiceCom result=" + result);
            }
            voiceHandle = -1;
            return result;
        } catch (Exception e) {
            Log.w(TAG, "StopVoiceCom falló", e);
            voiceHandle = -1;
            return false;
        }
    }

    public boolean sendVoiceData(byte[] pcmData) {
        return sendVoicePayloadInternal(pcmData, false);
    }

    private boolean sendVoicePayloadInternal(byte[] pcmData, boolean probe) {
        if (!voiceSendEnabled) {
            return false;
        }
        final int sendGen = voiceSessionGeneration;
        if (Looper.myLooper() != Looper.getMainLooper()) {
            final CountDownLatch latch = new CountDownLatch(1);
            final boolean[] ok = { false };
            mainHandler.post(() -> {
                if (sendGen != voiceSessionGeneration || !voiceSendEnabled) {
                    latch.countDown();
                    return;
                }
                ok[0] = sendVoicePayloadOnMain(pcmData, probe);
                latch.countDown();
            });
            try {
                latch.await(probe ? 3 : 1, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return ok[0];
        }
        if (sendGen != voiceSessionGeneration) {
            return false;
        }
        return sendVoicePayloadOnMain(pcmData, probe);
    }

    /** VoiceComSendData debe ejecutarse en el hilo principal (igual que StartVoiceComMR). */
    private boolean sendVoicePayloadOnMain(byte[] pcmData, boolean probe) {
        if (!voiceSendEnabled || !isVoiceSendReady()) {
            return false;
        }
        long sendHandle = getActiveSendHandle();
        if (nvrSdk == null || !isValidNativeHandle(sendHandle) || pcmData == null
                || pcmData.length == 0) {
            return false;
        }
        try {
            byte[] frame = normalizePcmFrame(pcmData);
            byte[] payload = buildVoicePayload(frame);
            if (payload == null || payload.length == 0) {
                if (!probe) {
                    voiceSendFailures++;
                    if (voiceSendFailures == 1 || voiceSendFailures % 50 == 0) {
                        Log.w(TAG, "buildVoicePayload falló x" + voiceSendFailures
                                + " modo=" + voiceModeLabel);
                    }
                }
                return false;
            }
            boolean ok = invokeVoiceComSendData(payload);
            if (ok) {
                if (!probe) {
                    voiceBytesSent += frame.length;
                    if (voiceBytesSent <= frame.length || voiceBytesSent % 16000 < frame.length) {
                        Log.i(TAG, "VoiceComSendData OK modo=" + voiceModeLabel
                                + " pcm=" + frame.length + " payload=" + payload.length
                                + " total=" + voiceBytesSent);
                    }
                } else {
                    Log.i(TAG, "Probe VoiceComSendData OK modo=" + voiceModeLabel
                            + " payload=" + payload.length);
                }
            } else if (!probe) {
                voiceSendFailures++;
                if (voiceSendFailures == 1 || voiceSendFailures % 50 == 0) {
                    Log.w(TAG, "VoiceComSendData falló x" + voiceSendFailures
                            + " payload=" + payload.length
                            + " modo=" + voiceModeLabel
                            + " sendHandle=" + sendHandle
                            + " err=" + nvrSdk.GetLastError());
                }
                if (voiceSendFailures >= 8) {
                    Log.e(TAG, "TX detenido: VoiceComSendData falló "
                            + voiceSendFailures + " veces en handle inválido para envío");
                    voiceSendEnabled = false;
                    stopMicStreamingInternal();
                }
            } else {
                Log.w(TAG, "Probe VoiceComSendData falló modo=" + voiceModeLabel
                        + " payload=" + payload.length + " err=" + nvrSdk.GetLastError());
            }
            return ok;
        } catch (Exception e) {
            Log.e(TAG, "Error sendVoicePayloadOnMain", e);
            return false;
        }
    }

    private boolean invokeVoiceComSendData(byte[] payload) {
        if (!voiceSendEnabled) {
            return false;
        }
        long sendHandle = getActiveSendHandle();
        if (!isValidNativeHandle(sendHandle)) {
            return false;
        }
        try {
            return nvrSdk.VoiceComSendData(sendHandle, payload, payload.length);
        } catch (Throwable t) {
            Log.w(TAG, "VoiceComSendData excepción handle=" + sendHandle, t);
            return false;
        }
    }
    public boolean stopVoiceIntercom() {
        return stopVoiceIntercomInternal();
    }

    private boolean stopVoiceIntercomInternal() {
        voicePlaybackGeneration++;
        voiceSendEnabled = false;
        voiceSessionGeneration++;
        stopMicStreamingInternal();
        mainHandler.removeCallbacksAndMessages(null);
        resetVoiceSendState();
        releaseAudioEncoderInternal();
        voiceBytesReceived = 0;
        voiceRxSeen = false;
        stopVoiceComOnMain(true);
        synchronized (talkAudioLock) {
            releaseTalkAudioTrackInternal();
        }
        return true;
    }

    public boolean isMicStreaming() {
        return isMicStreaming;
    }

    public boolean startMicStreaming() {
        if (!isValidNativeHandle(voiceHandle)) {
            Log.e(TAG, "No hay voiceHandle activo para enviar audio");
            return false;
        }
        if (!voiceSendEnabled) {
            Log.i(TAG, "Modo RX-only: sesión de escucha activa (micrófono no requerido)");
            return true;
        }
        if (isMicStreaming) {
            return true;
        }
        try {
            int minBufferSize = AudioRecord.getMinBufferSize(
                    micSampleRate, MIC_CHANNEL_CONFIG, MIC_AUDIO_FORMAT);
            if (minBufferSize <= 0) {
                Log.e(TAG, "AudioRecord getMinBufferSize inválido: " + minBufferSize
                        + " rate=" + micSampleRate);
                return false;
            }

            int recordBuffer = Math.max(minBufferSize * 2, pcmChunkBytes * 2);
            audioRecord = new AudioRecord(
                MediaRecorder.AudioSource.MIC,
                micSampleRate,
                MIC_CHANNEL_CONFIG,
                MIC_AUDIO_FORMAT,
                recordBuffer
            );

            if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "AudioRecord no pudo inicializarse");
                audioRecord.release();
                audioRecord = null;
                return false;
            }

            isMicStreaming = true;
            audioRecord.startRecording();

            // Espera a que el canal de voz esté listo (onTalkData suele llegar antes).
            try {
                Thread.sleep(850);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            }

            micThread = new Thread(() -> {
                Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO);
                byte[] readBuf = new byte[pcmChunkBytes];
                byte[] frameBuf = new byte[pcmChunkBytes];
                int frameLen = 0;
                while (isMicStreaming) {
                    try {
                        int read = audioRecord.read(readBuf, 0, readBuf.length);
                        if (read <= 0) {
                            continue;
                        }
                        int offset = 0;
                        while (offset < read) {
                            int space = pcmChunkBytes - frameLen;
                            int copy = Math.min(space, read - offset);
                            System.arraycopy(readBuf, offset, frameBuf, frameLen, copy);
                            frameLen += copy;
                            offset += copy;
                            if (frameLen >= pcmChunkBytes) {
                                sendVoicePayloadInternal(frameBuf, false);
                                frameLen = 0;
                            }
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error en loop de micrófono", e);
                    }
                }
            }, "DvrSdkMicThread");

            micThread.start();
            Log.i(TAG, "Micrófono activo " + micSampleRate + "Hz chunk=" + pcmChunkBytes
                    + " modo=" + voiceModeLabel);
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
        return stopMicStreamingInternal();
    }

    private boolean stopMicStreamingInternal() {
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

    private boolean initAudioEncoderInternal(boolean g711First) {
        releaseAudioEncoderInternal();
        audioEncoderCandidate = -1;
        if (nvrSdk == null) {
            return false;
        }

        byte[][] candidates = new byte[][] {
            buildWaveFormatEx((short) 1, (short) 1, 16000, 32000, (short) 2, (short) 16),
            fetchAudioInfoFromVoiceHandle(),
            safeSetAudioInfo(nvrsdk.CODEC_AUDIO_PCM),
            safeSetAudioInfo(nvrsdk.CODEC_AUDIO_G711a),
            safeSetAudioInfo(nvrsdk.AUDIO_FORMAT_G711),
            buildWaveFormatEx((short) 1, (short) 1, 8000, 16000, (short) 2, (short) 16),
            buildWaveFormatEx((short) 6, (short) 1, 8000, 8000, (short) 1, (short) 8),
        };

        int[] order = g711First
                ? new int[] { 6, 4, 3, 5, 1, 0, 2 }
                : new int[] { 0, 1, 2, 3, 4, 5, 6 };

        for (int idx : order) {
            if (idx < 0 || idx >= candidates.length) {
                continue;
            }
            byte[] audioInfo = candidates[idx];
            if (audioInfo == null || audioInfo.length == 0) {
                continue;
            }
            try {
                audioEncoderHandle = nvrSdk.InitAudioEncoder(audioInfo, audioInfo.length);
                boolean ok = isValidNativeHandle(audioEncoderHandle);
                Log.i(TAG, "InitAudioEncoder candidato=" + idx + " infoLen=" + audioInfo.length
                        + " handle=" + audioEncoderHandle + " ok=" + ok);
                if (ok) {
                    audioEncoderCandidate = idx;
                    return true;
                }
                releaseAudioEncoderInternal();
            } catch (Exception e) {
                Log.w(TAG, "InitAudioEncoder candidato=" + idx + " falló", e);
                releaseAudioEncoderInternal();
            }
        }
        return false;
    }

    private void applyEncoderTimingFromCandidate() {
        if (audioEncoderCandidate == 6 || audioEncoderCandidate == 4 || audioEncoderCandidate == 3) {
            micSampleRate = MIC_SAMPLE_RATE_LEGACY;
            pcmChunkBytes = PCM_CHUNK_BYTES_8K;
            talkSampleRate = TALK_SAMPLE_RATE_G711;
        } else if (audioEncoderCandidate == 5) {
            micSampleRate = MIC_SAMPLE_RATE_LEGACY;
            pcmChunkBytes = PCM_CHUNK_BYTES_8K;
            talkSampleRate = MIC_SAMPLE_RATE_LEGACY;
        } else {
            micSampleRate = MIC_SAMPLE_RATE;
            pcmChunkBytes = PCM_CHUNK_BYTES;
            talkSampleRate = TALK_SAMPLE_RATE_PCM;
        }
        Log.i(TAG, "Timing voz: mic=" + micSampleRate + "Hz chunk=" + pcmChunkBytes
                + " talk=" + talkSampleRate + "Hz");
    }

    private boolean isG711EncoderCandidate() {
        return audioEncoderCandidate == 6 || audioEncoderCandidate == 4
                || audioEncoderCandidate == 3;
    }

    private byte[] normalizePcmFrame(byte[] pcmData) {
        if (pcmData.length == pcmChunkBytes) {
            return pcmData;
        }
        byte[] frame = new byte[pcmChunkBytes];
        int copy = Math.min(pcmData.length, pcmChunkBytes);
        System.arraycopy(pcmData, 0, frame, 0, copy);
        return frame;
    }

    /**
     * Doc SDK NET_SDK_VoiceComSendData: PCM sin codificar; en modo G711 simétrico enviamos
     * 320 B codificados como onTalkData entrante.
     */
    private byte[] buildVoicePayload(byte[] pcmFrame) {
        if (voiceSendSymmetricG711) {
            return encodeG711ALaw(pcmFrame);
        }
        return pcmFrame;
    }

    private byte[] safeSetAudioInfo(long codec) {
        try {
            byte[] info = nvrSdk.SetAudioInfo(codec);
            if (info != null && info.length > 0) {
                Log.d(TAG, "SetAudioInfo(" + codec + ") len=" + info.length);
                return info;
            }
            Log.w(TAG, "SetAudioInfo(" + codec + ") vacío");
        } catch (Exception e) {
            Log.w(TAG, "SetAudioInfo(" + codec + ") error", e);
        }
        return null;
    }

    private byte[] fetchAudioInfoFromVoiceHandle() {
        if (!isValidNativeHandle(voiceHandle)) {
            return null;
        }
        try {
            Method method = nvrsdk.class.getDeclaredMethod("getAudioInfo", long.class);
            method.setAccessible(true);
            byte[] info = (byte[]) method.invoke(null, voiceHandle);
            if (info != null && info.length > 0) {
                Log.d(TAG, "getAudioInfo(voiceHandle) len=" + info.length);
                return info;
            }
            Log.w(TAG, "getAudioInfo(voiceHandle) vacío");
        } catch (Exception e) {
            Log.w(TAG, "getAudioInfo por reflexión falló", e);
        }
        return null;
    }

    private static byte[] buildWaveFormatEx(short formatTag, short channels, int sampleRate,
                                            int avgBytesPerSec, short blockAlign, short bitsPerSample) {
        ByteBuffer bb = ByteBuffer.allocate(18).order(ByteOrder.LITTLE_ENDIAN);
        bb.putShort(formatTag);
        bb.putShort(channels);
        bb.putInt(sampleRate);
        bb.putInt(avgBytesPerSec);
        bb.putShort(blockAlign);
        bb.putShort(bitsPerSample);
        bb.putShort((short) 0);
        return bb.array();
    }

    private void releaseAudioEncoderInternal() {
        if (nvrSdk == null || !isValidNativeHandle(audioEncoderHandle)) {
            audioEncoderHandle = -1;
            return;
        }
        try {
            nvrSdk.ReleaseAudioEncoder(audioEncoderHandle);
            Log.d(TAG, "ReleaseAudioEncoder ok");
        } catch (Exception e) {
            Log.w(TAG, "ReleaseAudioEncoder falló", e);
        } finally {
            audioEncoderHandle = -1;
        }
    }

    private void ensureTalkAudioTrack() {
        if (talkAudioTrack != null && talkAudioTrack.getState() == AudioTrack.STATE_INITIALIZED) {
            return;
        }
        releaseTalkAudioTrackInternal();
        int minBuf = AudioTrack.getMinBufferSize(
            talkSampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        );
        int bufSize = Math.max(minBuf * 2, pcmChunkBytes);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                talkAudioTrack = new AudioTrack.Builder()
                    .setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build())
                    .setAudioFormat(new AudioFormat.Builder()
                        .setSampleRate(talkSampleRate)
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build())
                    .setBufferSizeInBytes(bufSize)
                    .setTransferMode(AudioTrack.MODE_STREAM)
                    .build();
            } else {
                talkAudioTrack = new AudioTrack(
                    android.media.AudioManager.STREAM_MUSIC,
                    talkSampleRate,
                    AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    bufSize,
                    AudioTrack.MODE_STREAM
                );
            }
        } catch (Exception e) {
            Log.e(TAG, "No se pudo crear AudioTrack para onTalkData", e);
            talkAudioTrack = null;
        }
    }

    private void playTalkAudio(byte[] data, int frameLen, int byAudioFlag) {
        if (!isValidNativeHandle(voiceHandle)) {
            return;
        }
        int playbackGen = voicePlaybackGeneration;
        int len = Math.min(frameLen, data.length);
        if (len <= 0) {
            return;
        }
        byte[] pcm = talkDataToPcm(data, len, byAudioFlag);
        if (pcm == null || pcm.length == 0) {
            return;
        }
        synchronized (talkAudioLock) {
            if (playbackGen != voicePlaybackGeneration || !isValidNativeHandle(voiceHandle)) {
                return;
            }
            ensureTalkAudioTrack();
            AudioTrack track = talkAudioTrack;
            if (track == null || track.getState() != AudioTrack.STATE_INITIALIZED) {
                Log.w(TAG, "AudioTrack intercom no disponible");
                return;
            }
            try {
                if (track.getPlayState() != AudioTrack.PLAYSTATE_PLAYING) {
                    track.play();
                    track.setVolume(1.0f);
                }
                int written = track.write(pcm, 0, pcm.length);
                if (written < 0 && voiceBytesReceived <= len) {
                    Log.e(TAG, "AudioTrack.write falló: " + written);
                }
            } catch (IllegalStateException e) {
                Log.w(TAG, "AudioTrack ignorado (sesión de voz cerrada)", e);
            }
        }
    }

    private byte[] talkDataToPcm(byte[] data, int len, int byAudioFlag) {
        if (!voiceNeedNoEncodeData) {
            // test_audio.py bNeedCBNoEncData=FALSE → PCM decodificado en callback
            byte[] pcm = new byte[len];
            System.arraycopy(data, 0, pcm, 0, len);
            return pcm;
        }
        boolean encoded = byAudioFlag == nvrsdk.AUDIO_FORMAT_G711
                || byAudioFlag == 1
                || (len > 0 && len <= PCM_CHUNK_BYTES / 2 && len % 160 == 0);
        if (encoded) {
            return decodeG711ALaw(data, len);
        }
        byte[] pcm = new byte[len];
        System.arraycopy(data, 0, pcm, 0, len);
        return pcm;
    }

    private static byte[] decodeG711ALaw(byte[] data, int len) {
        byte[] pcm = new byte[len * 2];
        for (int i = 0; i < len; i++) {
            short sample = alawToLinear(data[i]);
            pcm[i * 2] = (byte) (sample & 0xFF);
            pcm[i * 2 + 1] = (byte) ((sample >> 8) & 0xFF);
        }
        return pcm;
    }

    private static byte[] encodeG711ALaw(byte[] pcmData) {
        int sampleCount = pcmData.length / 2;
        byte[] out = new byte[sampleCount];
        for (int i = 0; i < sampleCount; i++) {
            short sample = (short) ((pcmData[i * 2] & 0xFF) | (pcmData[i * 2 + 1] << 8));
            out[i] = linearToAlaw(sample);
        }
        return out;
    }

    private static byte linearToAlaw(short pcm) {
        int sign = ((pcm & 0x8000) != 0) ? 0x80 : 0x00;
        if (sign != 0) {
            pcm = (short) -pcm;
        }
        if (pcm > 0x7FFF) {
            pcm = 0x7FFF;
        }

        int exp = 7;
        int mask;
        for (mask = 0x4000; (pcm & mask) == 0 && exp > 0; mask >>= 1) {
            exp--;
        }

        int mantissa = (pcm >> ((exp == 0) ? 4 : (exp + 3))) & 0x0F;
        byte alaw = (byte) (sign | (exp << 4) | mantissa);
        return (byte) (alaw ^ 0x55);
    }

    private static short alawToLinear(byte alaw) {
        int a = alaw ^ 0x55;
        int t = (a & 0x0F) << 4;
        int seg = (a & 0x70) >> 4;
        switch (seg) {
            case 0:
                t += 8;
                break;
            case 1:
                t += 0x108;
                break;
            default:
                t += 0x108;
                t <<= seg - 1;
                break;
        }
        return (short) ((a & 0x80) != 0 ? t : -t);
    }

    private void releaseTalkAudioTrack() {
        synchronized (talkAudioLock) {
            releaseTalkAudioTrackInternal();
        }
    }

    private void releaseTalkAudioTrackInternal() {
        if (talkAudioTrack == null) {
            return;
        }
        try {
            if (talkAudioTrack.getPlayState() == AudioTrack.PLAYSTATE_PLAYING) {
                talkAudioTrack.stop();
            }
            talkAudioTrack.release();
        } catch (Exception e) {
            Log.w(TAG, "Error liberando AudioTrack de talk", e);
        } finally {
            talkAudioTrack = null;
        }
    }
}