package com.cess07.puertassantander.dvrsdk;

import android.content.Context;
import android.util.Log;
import android.util.Base64;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.sdk.interfance.NET_SDK_DEVICEINFO;
// NET_SDK_CONNECT_TYPE: 0=TCP, 1=P2P, 2=P2P2

/**
 * Módulo React Native que expone las funcionalidades del SDK DVR a JavaScript
 */
public class DvrSdkModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "DvrSdk";
    private static final String TAG = "DvrSdkModule";
    private DvrSdkManager sdkManager;
    private ReactApplicationContext reactContext;
    
    public DvrSdkModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.sdkManager = DvrSdkManager.getInstance();
    }
    
    @Override
    public String getName() {
        return MODULE_NAME;
    }
    
    /**
     * Inicializa el SDK DVR
     */
    @ReactMethod
    public void initialize(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            boolean result = sdkManager.initialize(context);
            if (result) {
                promise.resolve(true);
            } else {
                promise.reject("INIT_ERROR", "No se pudo inicializar el SDK");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error en initialize", e);
            promise.reject("INIT_ERROR", e.getMessage(), e);
        }
    }
    
    /**
     * Inicia sesión en un dispositivo DVR
     * @param server Dirección IP o dominio
     * @param port Puerto (como string)
     * @param username Nombre de usuario
     * @param password Contraseña
     * @param loginType Tipo de conexión: 0=TCP, 1=P2P, 2=P2P2
     * @param deviceSn Número de serie (opcional para TCP, requerido para P2P)
     * @param isWifi Si la conexión es WiFi (para P2P)
     */
    @ReactMethod
    public void login(String server, String port, String username, String password, 
                     int loginType, String deviceSn, boolean isWifi, Promise promise) {
        try {
            int portInt = Integer.parseInt(port);
            
            // Validar parámetros
            if (server == null || server.isEmpty()) {
                promise.reject("INVALID_PARAMS", "El servidor no puede estar vacío");
                return;
            }
            
            if (username == null || username.isEmpty()) {
                promise.reject("INVALID_PARAMS", "El nombre de usuario no puede estar vacío");
                return;
            }
            
            // Si no se proporciona deviceSn, usar string vacío
            if (deviceSn == null) {
                deviceSn = "";
            }
            
            int userId = sdkManager.login(server, portInt, username, password, loginType, deviceSn, isWifi);
            
            if (userId > 0) {
                WritableMap result = Arguments.createMap();
                result.putInt("userId", userId);
                result.putString("server", server);
                promise.resolve(result);
            } else {
                long errorCode = sdkManager.getLastError();
                promise.reject("LOGIN_FAILED", "Login falló con código de error: " + errorCode);
            }
        } catch (NumberFormatException e) {
            promise.reject("INVALID_PARAMS", "El puerto debe ser un número válido");
        } catch (Exception e) {
            Log.e(TAG, "Error en login", e);
            promise.reject("LOGIN_ERROR", e.getMessage(), e);
        }
    }
    
    /**
     * Cierra sesión del dispositivo DVR
     */
    @ReactMethod
    public void logout(Promise promise) {
        try {
            boolean result = sdkManager.logout();
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error en logout", e);
            promise.reject("LOGOUT_ERROR", e.getMessage(), e);
        }
    }
    
    /**
     * Obtiene información del dispositivo
     */
    @ReactMethod
    public void getDeviceInfo(Promise promise) {
        try {
            NET_SDK_DEVICEINFO deviceInfo = sdkManager.getDeviceInfo();
            if (deviceInfo != null) {
                WritableMap result = Arguments.createMap();
                result.putInt("videoInputNum", deviceInfo.videoInputNum);
                result.putString("deviceName", new String(deviceInfo.deviceName).trim());
                result.putString("firmwareVersion", new String(deviceInfo.firmwareVersion).trim());
                result.putString("deviceProduct", new String(deviceInfo.deviceProduct).trim());
                result.putInt("talkAudio", deviceInfo.talkAudio & 0xFF);
                promise.resolve(result);
            } else {
                long errorCode = sdkManager.getLastError();
                promise.reject("GET_INFO_FAILED", "No se pudo obtener información del dispositivo. Error: " + errorCode);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error en getDeviceInfo", e);
            promise.reject("GET_INFO_ERROR", e.getMessage(), e);
        }
    }
    
    /**
     * Verifica si hay una sesión activa
     */
    @ReactMethod
    public void isLoggedIn(Promise promise) {
        try {
            promise.resolve(sdkManager.isLoggedIn());
        } catch (Exception e) {
            Log.e(TAG, "Error en isLoggedIn", e);
            promise.reject("CHECK_ERROR", e.getMessage(), e);
        }
    }
    
    /**
     * Obtiene el último código de error
     */
    @ReactMethod
    public void getLastError(Promise promise) {
        try {
            int errorCode = sdkManager.getLastError();
            promise.resolve(errorCode);
        } catch (Exception e) {
            Log.e(TAG, "Error en getLastError", e);
            promise.reject("ERROR_CHECK", e.getMessage(), e);
        }
    }
    
    /**
     * Habilita o deshabilita logs nativos
     */
    @ReactMethod
    public void setNativeLog(boolean enable) {
        sdkManager.setNativeLog(enable);
    }
    
    /**
     * Limpia recursos del SDK
     */
    @ReactMethod
    public void cleanup(Promise promise) {
        try {
            sdkManager.cleanup();
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error en cleanup", e);
            promise.reject("CLEANUP_ERROR", e.getMessage(), e);
        }
    }

    private static boolean isValidNativeHandle(long handle) {
        return handle != 0 && handle != -1;
    }

    @ReactMethod
    public void startLivePreview(int channel, int streamType, Promise promise) {
        try {
            long handle = sdkManager.startLivePreview(channel, streamType);
            if (isValidNativeHandle(handle)) {
                promise.resolve((double) handle);
            } else {
                promise.reject("LIVEPLAY_FAILED", "No se pudo iniciar LivePlay");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error en startLivePreview", e);
            promise.reject("LIVEPLAY_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void stopLivePreview(Promise promise) {
        try {
            promise.resolve(sdkManager.stopLivePreview());
        } catch (Exception e) {
            Log.e(TAG, "Error en stopLivePreview", e);
            promise.reject("STOP_LIVEPLAY_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void startVoiceIntercom(int channel, Promise promise) {
        try {
            long handle = sdkManager.startVoiceIntercom(channel);
            if (isValidNativeHandle(handle)) {
                promise.resolve((double) handle);
            } else {
                int err = sdkManager.getLastError();
                promise.reject("VOICE_START_FAILED", "No se pudo iniciar intercom de voz, err=" + err);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error en startVoiceIntercom", e);
            promise.reject("VOICE_START_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void sendVoiceData(String base64Pcm, Promise promise) {
        try {
            if (base64Pcm == null || base64Pcm.isEmpty()) {
                promise.reject("VOICE_DATA_INVALID", "PCM vacío");
                return;
            }
            byte[] pcm = Base64.decode(base64Pcm, Base64.DEFAULT);
            boolean ok = sdkManager.sendVoiceData(pcm);
            promise.resolve(ok);
        } catch (Exception e) {
            Log.e(TAG, "Error en sendVoiceData", e);
            promise.reject("VOICE_SEND_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void stopVoiceIntercom(Promise promise) {
        try {
            promise.resolve(sdkManager.stopVoiceIntercom());
        } catch (Exception e) {
            Log.e(TAG, "Error en stopVoiceIntercom", e);
            promise.reject("VOICE_STOP_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void startMicStreaming(Promise promise) {
        try {
            boolean result = sdkManager.startMicStreaming();
            if (result) {
                promise.resolve(true);
            } else {
                promise.reject("MIC_STREAM_START_FAILED", "No se pudo iniciar envío de micrófono");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error en startMicStreaming", e);
            promise.reject("MIC_STREAM_START_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void isVoiceSendEnabled(Promise promise) {
        try {
            promise.resolve(sdkManager.isVoiceSendEnabled());
        } catch (Exception e) {
            promise.reject("VOICE_TX_CHECK_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void stopMicStreaming(Promise promise) {
        try {
            promise.resolve(sdkManager.stopMicStreaming());
        } catch (Exception e) {
            Log.e(TAG, "Error en stopMicStreaming", e);
            promise.reject("MIC_STREAM_STOP_ERROR", e.getMessage(), e);
        }
    }
    
    /**
     * Método helper para enviar eventos a JavaScript
     */
    private void sendEvent(String eventName, WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }
}

