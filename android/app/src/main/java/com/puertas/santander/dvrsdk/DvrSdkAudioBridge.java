package com.puertas.santander.dvrsdk;

/**
 * Puente JNI a NET_SDK_EncodeAudioFrame (solo en libnvrsdk.so, no expuesto en dvrsdk.jar).
 */
public final class DvrSdkAudioBridge {
    private static volatile boolean loaded = false;

    private DvrSdkAudioBridge() {}

    public static synchronized void ensureLoaded() {
        if (!loaded) {
            System.loadLibrary("dvr_sdk_audio_bridge");
            loaded = true;
        }
    }

    /**
     * Codifica un frame PCM (idealmente 1280 bytes, 16 kHz mono) usando el encoder del SDK.
     * @return bytes codificados o null si falla
     */
    public static native byte[] encodeAudioFrame(long encodeHandle, byte[] pcmData);

    /** Envío directo a NET_SDK_VoiceComSendData en libnvrsdk.so. */
    public static native boolean voiceComSendData(long voiceHandle, byte[] pcmData);
}
