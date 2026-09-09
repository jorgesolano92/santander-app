#include <jni.h>
#include <dlfcn.h>
#include <android/log.h>

#define TAG "DvrSdkAudioBridge"

typedef int (*EncodeAudioFrameFn)(long, unsigned char*, long, unsigned char*, int*);
typedef int (*VoiceComSendDataFn)(long, unsigned char*, long);

static EncodeAudioFrameFn g_encodeAudioFrame = nullptr;
static VoiceComSendDataFn g_voiceComSendData = nullptr;

static void* resolveNvrsdkHandle() {
    void* handle = dlopen("libnvrsdk.so", RTLD_NOW | RTLD_NOLOAD);
    if (handle == nullptr) {
        handle = dlopen("libnvrsdk.so", RTLD_NOW);
    }
    return handle;
}

static bool resolveVoiceComSendData() {
    if (g_voiceComSendData != nullptr) {
        return true;
    }
    g_voiceComSendData = reinterpret_cast<VoiceComSendDataFn>(
        dlsym(RTLD_DEFAULT, "NET_SDK_VoiceComSendData"));
    if (g_voiceComSendData == nullptr) {
        void* handle = resolveNvrsdkHandle();
        if (handle != nullptr) {
            g_voiceComSendData = reinterpret_cast<VoiceComSendDataFn>(
                dlsym(handle, "NET_SDK_VoiceComSendData"));
        }
    }
    if (g_voiceComSendData == nullptr) {
        __android_log_print(ANDROID_LOG_ERROR, TAG, "NET_SDK_VoiceComSendData no encontrado");
        return false;
    }
    return true;
}

static bool resolveEncodeAudioFrame() {
    if (g_encodeAudioFrame != nullptr) {
        return true;
    }
    g_encodeAudioFrame = reinterpret_cast<EncodeAudioFrameFn>(
        dlsym(RTLD_DEFAULT, "NET_SDK_EncodeAudioFrame"));
    if (g_encodeAudioFrame == nullptr) {
        void* handle = resolveNvrsdkHandle();
        if (handle != nullptr) {
            g_encodeAudioFrame = reinterpret_cast<EncodeAudioFrameFn>(
                dlsym(handle, "NET_SDK_EncodeAudioFrame"));
        }
    }
    if (g_encodeAudioFrame == nullptr) {
        __android_log_print(ANDROID_LOG_ERROR, TAG, "NET_SDK_EncodeAudioFrame no encontrado");
        return false;
    }
    return true;
}

extern "C" JNIEXPORT jbyteArray JNICALL
Java_com_puertas_santander_dvrsdk_DvrSdkAudioBridge_encodeAudioFrame(
    JNIEnv* env,
    jclass,
    jlong encodeHandle,
    jbyteArray pcmData) {
    if (!resolveEncodeAudioFrame() || encodeHandle == 0 || encodeHandle == -1 || pcmData == nullptr) {
        return nullptr;
    }

    jsize inLen = env->GetArrayLength(pcmData);
    if (inLen <= 0) {
        return nullptr;
    }

    jbyte* inBytes = env->GetByteArrayElements(pcmData, nullptr);
    if (inBytes == nullptr) {
        return nullptr;
    }

    unsigned char outBuffer[4096];
    int outLen = static_cast<int>(sizeof(outBuffer));
    int ok = g_encodeAudioFrame(
        static_cast<long>(encodeHandle),
        reinterpret_cast<unsigned char*>(inBytes),
        static_cast<long>(inLen),
        outBuffer,
        &outLen);

    env->ReleaseByteArrayElements(pcmData, inBytes, JNI_ABORT);

    if (outLen <= 0) {
        __android_log_print(ANDROID_LOG_WARN, TAG,
            "EncodeAudioFrame fallo ok=%d outLen=%d inLen=%d", ok, outLen, static_cast<int>(inLen));
        return nullptr;
    }

    jbyteArray result = env->NewByteArray(outLen);
    if (result == nullptr) {
        return nullptr;
    }
    env->SetByteArrayRegion(result, 0, outLen, reinterpret_cast<jbyte*>(outBuffer));
    return result;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_puertas_santander_dvrsdk_DvrSdkAudioBridge_voiceComSendData(
    JNIEnv* env,
    jclass,
    jlong voiceHandle,
    jbyteArray pcmData) {
    if (!resolveVoiceComSendData() || voiceHandle == 0 || voiceHandle == -1 || pcmData == nullptr) {
        return JNI_FALSE;
    }

    jsize len = env->GetArrayLength(pcmData);
    if (len <= 0) {
        return JNI_FALSE;
    }

    jbyte* bytes = env->GetByteArrayElements(pcmData, nullptr);
    if (bytes == nullptr) {
        return JNI_FALSE;
    }

    int ok = g_voiceComSendData(
        static_cast<long>(voiceHandle),
        reinterpret_cast<unsigned char*>(bytes),
        static_cast<long>(len));

    env->ReleaseByteArrayElements(pcmData, bytes, JNI_ABORT);
    return ok ? JNI_TRUE : JNI_FALSE;
}
