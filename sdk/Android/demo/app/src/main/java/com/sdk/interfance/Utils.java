package com.sdk.interfance;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Point;
import android.util.DisplayMetrics;
import android.view.Display;
import android.view.WindowManager;

public class Utils {
    /**
     * 获取屏幕宽度
     */
    public static int getScreenWidth(Context context) {
        WindowManager windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        Display display = windowManager.getDefaultDisplay();
        Point size = new Point();
        display.getSize(size);
        return size.x;
    }

    /**
     * 获取屏幕高度
     */
    public static int getScreenHeight(Context context) {
        WindowManager windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        Display display = windowManager.getDefaultDisplay();
        Point size = new Point();
        display.getSize(size);
        return size.y;
    }

    /**
     * 获取屏幕密度
     */
    public static float getScreenDensity(Context context) {
        return context.getResources().getDisplayMetrics().density;
    }

    /**
     * 获取屏幕DPI
     */
    public static int getScreenDpi(Context context) {
        return context.getResources().getDisplayMetrics().densityDpi;
    }

    /**
     * 获取屏幕尺寸信息
     */
    @SuppressLint("DefaultLocale")
    public static String getScreenInfo(Context context) {
        DisplayMetrics displayMetrics = context.getResources().getDisplayMetrics();
        return String.format("屏幕尺寸: %dx%d, 密度: %.2f, DPI: %d",
                displayMetrics.widthPixels,
                displayMetrics.heightPixels,
                displayMetrics.density,
                displayMetrics.densityDpi);
    }
}
