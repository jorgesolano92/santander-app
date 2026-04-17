package com.sdk.test.utils;

import android.app.Activity;
import android.content.Context;
import android.graphics.Point;
import android.graphics.Rect;
import android.util.DisplayMetrics;
import android.view.Display;
import android.view.View;
import android.view.WindowManager;


import java.lang.reflect.Field;
import java.lang.reflect.Method;

/**
 * 屏幕适配相关
 */
public class LocalDisplay {

    /**
     * 屏幕宽px
     */
    public static int SCREEN_WIDTH_PIXELS;
    /**
     * 屏幕高px，不包括虚拟按键高度
     */
    public static int SCREEN_HEIGHT_PIXELS;
    /**
     * 屏幕高px，包括虚拟按键高度
     */
    public static int SCREEN_REAL_HEIGHT_PIXELS;
    /**
     * 屏幕密度
     */
    public static float SCREEN_DENSITY;
    public static float SCALED_DENSITY;
    public static float DENSITY_DPI;
    public static int SCREEN_WIDTH_DP;
    public static int SCREEN_HEIGHT_DP;
    private static boolean sInitialed;

    /**
     * 状态栏高度
     */
    public static int STATUS_BAR_HEIGHT = 0;

    public static void init(Context context) {
        if (sInitialed || context == null) {
            return;
        }
        sInitialed = true;
        DisplayMetrics dm = new DisplayMetrics();
        WindowManager wm = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        wm.getDefaultDisplay().getMetrics(dm);
        SCREEN_WIDTH_PIXELS = dm.widthPixels;
        SCREEN_HEIGHT_PIXELS = dm.heightPixels;
        SCREEN_REAL_HEIGHT_PIXELS = getRealScreenHPx(context);
        SCREEN_DENSITY = dm.density;
        SCREEN_WIDTH_DP = (int) (SCREEN_WIDTH_PIXELS / dm.density);
        SCREEN_HEIGHT_DP = (int) (SCREEN_HEIGHT_PIXELS / dm.density);
        SCALED_DENSITY = dm.scaledDensity;
        DENSITY_DPI = dm.densityDpi;
    }

    public static int dp2px(float dpValue) {
        return (int) (dpValue * SCREEN_DENSITY + 0.5f);
    }

    public static float px2dp(float pxValue) {
        return  (int) (pxValue / SCREEN_DENSITY + 0.5f);
    }

    public static int sp2px(float pxValue) {
        return (int) (pxValue / SCALED_DENSITY + 0.5f);
    }

    public static int designedDP2px(float designedDp) {
        if (SCREEN_WIDTH_DP != 320) {
            designedDp = designedDp * SCREEN_WIDTH_DP / 320f;
        }
        return dp2px(designedDp);
    }

    public static void setPadding(final View view, float left, float top, float right, float bottom) {
        view.setPadding(designedDP2px(left), dp2px(top), designedDP2px(right), dp2px(bottom));
    }

    /**
     *
     * @description 获取状态栏高度
     * @author zhongwr
     * @params
     * @return 返回状态栏高度
     * @update 2016年1月25日 下午8:53:31
     */
    public static int getStatusBarHeight(Activity context) {
        if (STATUS_BAR_HEIGHT <= 0) {
            Rect frame = new Rect();
            context.getWindow().getDecorView().getWindowVisibleDisplayFrame(frame);
            STATUS_BAR_HEIGHT = frame.top;
        }
        if (STATUS_BAR_HEIGHT <= 0) {
            try {
                Class<?> c = Class.forName("com.android.internal.R$dimen");
                Object obj = c.newInstance();
                Field field = c.getField("status_bar_height");
                int x = Integer.parseInt(field.get(obj).toString());
                STATUS_BAR_HEIGHT = context.getResources().getDimensionPixelSize(x);

            } catch (Exception e1) {
                e1.printStackTrace();
            }
        }
        return STATUS_BAR_HEIGHT;
    }
    /**
     *
     * @description 获取屏幕宽高
     * @author <a href="mailto:vfishv@gmail.com">张清田</a>
     * @update 2014年8月30日 下午4:51:48
     */
    public static Point getScreenSize(Context ctt) {
        return new Point(LocalDisplay.SCREEN_WIDTH_PIXELS, LocalDisplay.SCREEN_HEIGHT_PIXELS);
    }

    public static boolean isHalfSizePic(){
        return SCREEN_WIDTH_PIXELS <= 480 && SCREEN_HEIGHT_PIXELS <= 854;
    }

    //获取屏幕原始尺寸高度，包括虚拟功能键高度
    public static int getRealScreenHPx(Context context){
        int dpi = 0;
        WindowManager windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        Display display = windowManager.getDefaultDisplay();
        DisplayMetrics displayMetrics = new DisplayMetrics();
        try {
            Class c = Class.forName("android.view.Display");
            Method method = c.getMethod("getRealMetrics", DisplayMetrics.class);
            method.invoke(display, displayMetrics);
            dpi = displayMetrics.heightPixels;
        } catch (Exception e) {
        }
        return dpi;
    }

}
