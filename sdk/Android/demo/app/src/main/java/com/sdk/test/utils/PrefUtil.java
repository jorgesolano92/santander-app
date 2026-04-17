package com.sdk.test.utils;

import android.content.Context;
import android.content.SharedPreferences;

import com.sdk.interfance.ToolCommon;
import com.sdk.test.app.SDKApplication;

/**
 */
public class PrefUtil
{

    public static SharedPreferences prefTVT;

    public static void saveString(String key, String value) {
        if (ToolCommon.isEmpty(key)) {
            return;
        }
        SharedPreferences.Editor editor = getSharedPreferences().edit();
        editor.putString(key, value);
        editor.commit();
    }

    public static String getString(String key) {
        if (ToolCommon.isEmpty(key)) {
            return "";
        }
        return getSharedPreferences().getString(key, null);
    }
    public static String getString(String key,String defaultValue) {
        if (ToolCommon.isEmpty(key)) {
            return defaultValue;
        }
        return getSharedPreferences().getString(key, defaultValue);
    }

    public static boolean getBoolean(String key, boolean defaultValue) {
        if (ToolCommon.isEmpty(key)) {
            return defaultValue;
        }
        return getSharedPreferences().getBoolean(key, defaultValue);
    }

    public static void saveBoolean(String key, boolean value) {
        if (ToolCommon.isEmpty(key)) {
            return;
        }
        SharedPreferences.Editor editor = getSharedPreferences().edit();
        editor.putBoolean(key, value);
        editor.commit();
    }

    public static void saveInt(String key, int value) {
        if (ToolCommon.isEmpty(key)) {
            return;
        }
        SharedPreferences.Editor editor = getSharedPreferences().edit();
        editor.putInt(key, value);
        editor.apply();
    }

    public static int getInt(String key, int defaultInt) {
        if (ToolCommon.isEmpty(key)) {
            return defaultInt;
        }
        return getSharedPreferences().getInt(key, defaultInt);
    }

    private static SharedPreferences getSharedPreferences() {
        if (prefTVT == null) {
            prefTVT = SDKApplication.getInstance().getSharedPreferences("PrefTVT", Context.MODE_PRIVATE);
        }
        return prefTVT;
    }

    public static boolean remove(String key) {
        if (ToolCommon.isEmpty(key)) {
            return false;
        }
        SharedPreferences.Editor editor = getSharedPreferences().edit();
        editor.remove(key);
        return editor.commit();
    }

    public static class Key {
        public static String KEY_IP = "IP";
        public static String KEY_PORT = "PORT";
        public static String KEY_DEVICE_SN = "DEVICE_SN";
        public static String KEY_NAME = "NAME";
        public static String KEY_PWD = "PWD";
        public static String KEY_LOGIN_TYPE = "loginType";
        public static String KEY_FAV_TIP = "firstFav";
    }
}
