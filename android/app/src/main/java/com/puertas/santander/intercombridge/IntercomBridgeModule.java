package com.puertas.santander.intercombridge;

import android.util.Log;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class IntercomBridgeModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "IntercomBridge";
    private static final String TAG = "IntercomBridgeModule";
    private final ReactApplicationContext reactContext;

    public IntercomBridgeModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void connect(String bridgeUrl, String cameraIp, int sdkPort,
                        String username, String password, int channel,
                        String micAudioSource, Promise promise) {
        try {
            if (bridgeUrl == null || bridgeUrl.isEmpty()) {
                promise.reject("INVALID_URL", "bridgeUrl vacío");
                return;
            }
            IntercomBridgeManager mgr = IntercomBridgeManager.getInstance();
            mgr.setStateListener((state, message) -> emitState(state, message));
            mgr.connect(bridgeUrl, cameraIp, sdkPort, username, password, channel,
                    micAudioSource, (state, message) -> emitState(state, message));
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "connect", e);
            promise.reject("CONNECT_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void disconnect(Promise promise) {
        try {
            IntercomBridgeManager.getInstance().disconnect();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("DISCONNECT_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void isConnected(Promise promise) {
        promise.resolve(IntercomBridgeManager.getInstance().isConnected());
    }

    private void emitState(String state, String message) {
        WritableMap map = Arguments.createMap();
        map.putString("state", state);
        if (message != null) {
            map.putString("message", message);
        }
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("IntercomBridgeState", map);
    }
}
