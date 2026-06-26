package com.cess07.puertassantander.tabletwake;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import android.view.WindowManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class TabletWakeModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "TabletWake";
    private static final String TAG = "TabletWakeModule";

    public TabletWakeModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void wakeForIncomingCall() {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            Log.w(TAG, "wakeForIncomingCall: sin Activity");
            return;
        }
        activity.runOnUiThread(() -> {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                    activity.setShowWhenLocked(true);
                    activity.setTurnScreenOn(true);
                }
                activity.getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                        | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                        | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                );
                PowerManager pm = (PowerManager) activity.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    @SuppressWarnings("deprecation")
                    PowerManager.WakeLock wl = pm.newWakeLock(
                        PowerManager.SCREEN_BRIGHT_WAKE_LOCK
                            | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                        "puertassantander:incoming_call"
                    );
                    wl.acquire(30_000L);
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    KeyguardManager km = (KeyguardManager) activity.getSystemService(Context.KEYGUARD_SERVICE);
                    if (km != null && km.isKeyguardLocked()) {
                        km.requestDismissKeyguard(activity, null);
                    }
                }
                Intent intent = activity.getIntent();
                if (intent != null) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    activity.startActivity(intent);
                }
                activity.getWindow().getDecorView().requestFocus();
            } catch (Exception e) {
                Log.e(TAG, "wakeForIncomingCall", e);
            }
        });
    }
}
