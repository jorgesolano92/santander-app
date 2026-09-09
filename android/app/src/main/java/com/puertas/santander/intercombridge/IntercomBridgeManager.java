package com.puertas.santander.intercombridge;

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
import androidx.annotation.Nullable;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okio.ByteString;
import org.json.JSONObject;

/**
 * Cliente WebSocket hacia audio_bridge.py (PC industrial).
 * PCM 16-bit mono 8 kHz; sin SDK nativo en Android.
 */
public class IntercomBridgeManager {
    private static final String TAG = "IntercomBridge";
    private static final int SAMPLE_RATE = 8000;
    private static final int PCM_CHUNK_DEFAULT = 640;
    private static final int RX_CHUNK_DEFAULT = 1280;
    private volatile int pcmChunkBytes = PCM_CHUNK_DEFAULT;
    private volatile int rxChunkBytes = RX_CHUNK_DEFAULT;
    /** MediaRecorder.AudioSource: VOICE_COMMUNICATION (default) o MIC. */
    private volatile int micAudioSource = MediaRecorder.AudioSource.VOICE_COMMUNICATION;
    private static final byte MSG_TX = 0x01;
    private static final byte MSG_RX = 0x02;

    private static IntercomBridgeManager instance;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .pingInterval(20, TimeUnit.SECONDS)
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .build();

    private WebSocket webSocket;
    private volatile boolean connected;
    private volatile boolean streaming;
    private AudioRecord audioRecord;
    private AudioTrack audioTrack;
    private Thread micThread;
    private Thread playbackThread;
    private volatile boolean playbackRunning;
    private final BlockingQueue<byte[]> playbackQueue = new LinkedBlockingQueue<>(64);
    private StateListener stateListener;
    private final Object audioLock = new Object();

    public interface StateListener {
        void onBridgeState(String state, @Nullable String message);
    }

    public static synchronized IntercomBridgeManager getInstance() {
        if (instance == null) {
            instance = new IntercomBridgeManager();
        }
        return instance;
    }

    public void setStateListener(@Nullable StateListener listener) {
        this.stateListener = listener;
    }

    public boolean isConnected() {
        return connected;
    }

    public static int resolveMicAudioSource(@Nullable String name) {
        if (name == null || name.isEmpty()) {
            return MediaRecorder.AudioSource.VOICE_COMMUNICATION;
        }
        switch (name.trim().toLowerCase()) {
            case "mic":
            case "default":
                return MediaRecorder.AudioSource.MIC;
            case "voice_communication":
            case "voice":
            case "communication":
            default:
                return MediaRecorder.AudioSource.VOICE_COMMUNICATION;
        }
    }

    public void connect(String bridgeUrl, String cameraIp, int sdkPort,
                        String username, String password, int channel,
                        @Nullable String micAudioSourceName,
                        StateListener listener) {
        disconnectInternal(false);
        pcmChunkBytes = PCM_CHUNK_DEFAULT;
        rxChunkBytes = RX_CHUNK_DEFAULT;
        micAudioSource = resolveMicAudioSource(micAudioSourceName);
        this.stateListener = listener;
        notifyState("connecting", null);

        Request request = new Request.Builder().url(bridgeUrl).build();
        webSocket = httpClient.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket ws, Response response) {
                Log.i(TAG, "WebSocket abierto " + bridgeUrl);
                try {
                    JSONObject start = new JSONObject();
                    start.put("type", "start");
                    start.put("cameraIp", cameraIp);
                    start.put("sdkPort", sdkPort);
                    start.put("username", username);
                    start.put("password", password);
                    start.put("channel", channel);
                    ws.send(start.toString());
                } catch (Exception e) {
                    Log.e(TAG, "Error enviando start", e);
                    notifyState("error", e.getMessage());
                    ws.close(1011, "start failed");
                }
            }

            @Override
            public void onMessage(WebSocket ws, String text) {
                handleTextMessage(text);
            }

            @Override
            public void onMessage(WebSocket ws, ByteString bytes) {
                handleBinaryMessage(bytes.toByteArray());
            }

            @Override
            public void onClosing(WebSocket ws, int code, String reason) {
                Log.i(TAG, "WebSocket cerrando: " + reason);
            }

            @Override
            public void onClosed(WebSocket ws, int code, String reason) {
                Log.i(TAG, "WebSocket cerrado: " + reason);
                connected = false;
                stopAudioInternal();
                notifyState("disconnected", reason);
            }

            @Override
            public void onFailure(WebSocket ws, Throwable t, @Nullable Response response) {
                Log.e(TAG, "WebSocket falló", t);
                connected = false;
                stopAudioInternal();
                String msg = t.getMessage() != null ? t.getMessage() : "conexión fallida";
                notifyState("error", msg);
            }
        });
    }

    private void handleTextMessage(String text) {
        try {
            JSONObject msg = new JSONObject(text);
            String type = msg.optString("type", "");
            switch (type) {
                case "started":
                    connected = true;
                    final boolean tx = msg.optBoolean("tx", false);
                    final boolean rx = msg.optBoolean("rx", true);
                    final String mode = msg.optString("mode", "");
                    int txChunk = msg.optInt("txChunk", PCM_CHUNK_DEFAULT);
                    if (txChunk < 320 || txChunk > 6400) {
                        txChunk = PCM_CHUNK_DEFAULT;
                    }
                    pcmChunkBytes = txChunk;
                    int rxChunk = msg.optInt("rxChunk", RX_CHUNK_DEFAULT);
                    if (rxChunk < 640 || rxChunk > 6400) {
                        rxChunk = RX_CHUNK_DEFAULT;
                    }
                    rxChunkBytes = rxChunk;
                    Log.i(TAG, "Sesión puente OK mode=" + mode + " tx=" + tx + " rx=" + rx
                            + " txChunk=" + pcmChunkBytes + " rxChunk=" + rxChunkBytes);
                    mainHandler.post(() -> {
                        if (rx) {
                            startPlaybackInternal();
                        }
                        if (tx) {
                            startMicInternal();
                        }
                    });
                    notifyState("active", mode + " tx=" + tx + " rx=" + rx);
                    break;
                case "stopped":
                    connected = false;
                    stopAudioInternal();
                    notifyState("disconnected", "stopped");
                    break;
                case "error":
                    connected = false;
                    stopAudioInternal();
                    notifyState("error", msg.optString("message", "error"));
                    break;
                case "pong":
                    break;
                default:
                    Log.d(TAG, "Mensaje: " + text);
                    break;
            }
        } catch (Exception e) {
            Log.e(TAG, "JSON inválido: " + text, e);
        }
    }

    private void handleBinaryMessage(byte[] data) {
        if (data.length < 2 || data[0] != MSG_RX) {
            return;
        }
        int len = data.length - 1;
        byte[] pcm = new byte[len];
        System.arraycopy(data, 1, pcm, 0, len);
        if (!playbackRunning) {
            return;
        }
        if (!playbackQueue.offer(pcm)) {
            while (playbackQueue.size() >= 48) {
                playbackQueue.poll();
            }
            playbackQueue.offer(pcm);
        }
    }

    private void startPlaybackInternal() {
        stopPlaybackInternal();
        playbackRunning = true;
        playbackQueue.clear();
        playbackThread = new Thread(() -> {
            Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO);
            ensurePlaybackTrackOnThread();
            while (playbackRunning) {
                try {
                    byte[] pcm = playbackQueue.poll(200, TimeUnit.MILLISECONDS);
                    if (pcm != null && pcm.length > 0) {
                        writePcmOnThread(pcm);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }, "IntercomBridgePlay");
        playbackThread.start();
        Log.i(TAG, "Reproducción puente activa " + SAMPLE_RATE + "Hz rxChunk=" + rxChunkBytes);
    }

    private void ensurePlaybackTrackOnThread() {
        synchronized (audioLock) {
            if (audioTrack != null && audioTrack.getState() == AudioTrack.STATE_INITIALIZED) {
                try {
                    if (audioTrack.getPlayState() != AudioTrack.PLAYSTATE_PLAYING) {
                        audioTrack.play();
                    }
                    return;
                } catch (Exception e) {
                    Log.w(TAG, "AudioTrack.play", e);
                    releasePlaybackTrackLocked();
                }
            }
            releasePlaybackTrackLocked();
            int bufSize = AudioTrack.getMinBufferSize(
                    SAMPLE_RATE,
                    AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT);
            if (bufSize <= 0) {
                bufSize = rxChunkBytes * 4;
            }
            int playBuf = Math.max(bufSize * 4, rxChunkBytes * 6);
            audioTrack = new AudioTrack.Builder()
                    .setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION) // USAGE_MEDIA o USAGE_VOICE_COMMUNICATION
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build())
                    .setAudioFormat(new AudioFormat.Builder()
                            .setSampleRate(SAMPLE_RATE)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .build())
                    .setBufferSizeInBytes(playBuf)
                    .setTransferMode(AudioTrack.MODE_STREAM)
                    .build();
            if (audioTrack.getState() != AudioTrack.STATE_INITIALIZED) {
                Log.e(TAG, "AudioTrack no inicializado");
                releasePlaybackTrackLocked();
                return;
            }
            audioTrack.play();
            audioTrack.setVolume(1.0f);
            Log.i(TAG, "AudioTrack buffer=" + playBuf + "B @" + SAMPLE_RATE + "Hz");
        }
    }

    private void writePcmOnThread(byte[] pcm) {
        synchronized (audioLock) {
            if (audioTrack == null || audioTrack.getState() != AudioTrack.STATE_INITIALIZED) {
                ensurePlaybackTrackOnThread();
            }
            AudioTrack track = audioTrack;
            if (track == null || track.getState() != AudioTrack.STATE_INITIALIZED) {
                return;
            }
            try {
                if (track.getPlayState() != AudioTrack.PLAYSTATE_PLAYING) {
                    track.play();
                    track.setVolume(1.0f);
                }
                int written;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    written = track.write(pcm, 0, pcm.length, AudioTrack.WRITE_BLOCKING);
                } else {
                    written = track.write(pcm, 0, pcm.length);
                }
                if (written < 0) {
                    Log.w(TAG, "AudioTrack.write código=" + written + ", recreando");
                    releasePlaybackTrackLocked();
                    ensurePlaybackTrackOnThread();
                    track = audioTrack;
                    if (track != null) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            track.write(pcm, 0, pcm.length, AudioTrack.WRITE_BLOCKING);
                        } else {
                            track.write(pcm, 0, pcm.length);
                        }
                    }
                }
            } catch (IllegalStateException e) {
                Log.w(TAG, "AudioTrack inválido, recreando", e);
                releasePlaybackTrackLocked();
                ensurePlaybackTrackOnThread();
            }
        }
    }

    private void stopPlaybackInternal() {
        playbackRunning = false;
        if (playbackThread != null) {
            playbackThread.interrupt();
            try {
                playbackThread.join(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            playbackThread = null;
        }
        playbackQueue.clear();
        Runnable release = () -> {
            synchronized (audioLock) {
                releasePlaybackTrackLocked();
            }
        };
        if (Looper.myLooper() == Looper.getMainLooper()) {
            release.run();
        } else {
            mainHandler.post(release);
        }
    }

    private void releasePlaybackTrackLocked() {
        if (audioTrack == null) {
            return;
        }
        try {
            if (audioTrack.getPlayState() == AudioTrack.PLAYSTATE_PLAYING) {
                audioTrack.stop();
            }
        } catch (Exception ignored) {
        }
        try {
            audioTrack.release();
        } catch (Exception ignored) {
        }
        audioTrack = null;
    }

    private void startMicInternal() {
        if (streaming) {
            return;
        }
        int minBuf = AudioRecord.getMinBufferSize(
                SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
        final int chunk = pcmChunkBytes;
        int recordBuf = Math.max(minBuf * 2, chunk * 2);
        Log.i(TAG, "AudioRecord source=" + micAudioSource
                + " (" + (micAudioSource == MediaRecorder.AudioSource.MIC
                ? "MIC" : "VOICE_COMMUNICATION") + ")");
        audioRecord = new AudioRecord(
                micAudioSource,
                SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                recordBuf);
        if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
            Log.e(TAG, "AudioRecord no inicializado");
            notifyState("error", "Micrófono no disponible");
            return;
        }
        streaming = true;
        audioRecord.startRecording();
        micThread = new Thread(() -> {
            Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO);
            byte[] buf = new byte[chunk];
            byte[] frame = new byte[1 + chunk];
            frame[0] = MSG_TX;
            while (streaming) {
                try {
                    int read = audioRecord.read(buf, 0, buf.length);
                    if (read <= 0) {
                        continue;
                    }
                    WebSocket ws = webSocket;
                    if (ws == null || !connected) {
                        continue;
                    }
                    if (read == chunk) {
                        System.arraycopy(buf, 0, frame, 1, chunk);
                        ws.send(ByteString.of(frame));
                    } else {
                        byte[] partial = new byte[1 + read];
                        partial[0] = MSG_TX;
                        System.arraycopy(buf, 0, partial, 1, read);
                        ws.send(ByteString.of(partial));
                    }
                    playbackQueue.clear();
                } catch (Exception e) {
                    Log.e(TAG, "Loop micrófono", e);
                }
            }
        }, "IntercomBridgeMic");
        micThread.start();
        Log.i(TAG, "Micrófono puente activo " + SAMPLE_RATE + "Hz");
    }

    private void stopAudioInternal() {
        streaming = false;
        if (micThread != null) {
            try {
                micThread.join(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            micThread = null;
        }
        if (audioRecord != null) {
            try {
                if (audioRecord.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) {
                    audioRecord.stop();
                }
            } catch (Exception ignored) {
            }
            audioRecord.release();
            audioRecord = null;
        }
        stopPlaybackInternal();
    }

    public void disconnect() {
        disconnectInternal(true);
    }

    private void disconnectInternal(boolean sendStop) {
        WebSocket ws = webSocket;
        webSocket = null;
        connected = false;
        stopAudioInternal();
        if (ws != null) {
            if (sendStop) {
                try {
                    ws.send("{\"type\":\"stop\"}");
                } catch (Exception ignored) {
                }
            }
            ws.close(1000, "client disconnect");
        }
    }

    private void notifyState(String state, @Nullable String message) {
        if (stateListener != null) {
            mainHandler.post(() -> stateListener.onBridgeState(state, message));
        }
    }
}
