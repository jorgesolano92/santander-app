package com.sdk.test.app;

import android.app.Application;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.PackageManager.NameNotFoundException;
import android.os.Environment;
import android.os.StrictMode;
import android.util.Log;
import android.view.inputmethod.InputMethodManager;
//import com.tencent.bugly.crashreport.CrashReport;
import com.sdk.interfance.BaseActivity;
import com.sdk.interfance.NET_SDK_DEVICEINFO;
import com.sdk.interfance.nvrsdk;
import com.sdk.test.utils.CrashHandler;
import com.sdk.test.utils.LocalDisplay;
import com.sdk.test.utils.PushThreadPool;
//import com.squareup.leakcanary.LeakCanary;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class SDKApplication extends Application
{
    public static final String DIR = "SDK_NVR/";
    private static final String TAG = "SDKApplication" ;
    private static SDKApplication mInstace;
    private int mUserId1 = -1;
    private int mUserId2 = -1;
    private nvrsdk mNvrSdk = null;
    private int m_iChannelCount1 = 0;
    private int m_iChannelCount2 = 0;
    private String m_ServerAddr1 = "";
    private String m_ServerAddr2 = "";
    private String m_strLocalFilePath = "";
    private NET_SDK_DEVICEINFO deviceinfo;//登录设备信息
    List<BaseActivity> mActivityList = new ArrayList<>();
    //	private PushThreadPool mPushThreadPool = null;

    @Override
    public void onCreate()
    {
        super.onCreate();
        mInstace = this;
        ApplicationInfo appInfo = this.getApplicationInfo();
        int appFlags = appInfo.flags;
        if ((appFlags & ApplicationInfo.FLAG_DEBUGGABLE) != 0)
        {
            StrictMode.setVmPolicy(new StrictMode.VmPolicy.Builder().detectLeakedSqlLiteObjects().penaltyLog().penaltyDeath().build());
        }
        LocalDisplay.init(this);
        initDir();
//        LeakCanary.install(this);
//        //bugly 注册时bugly创建的appid "e6ef8b0576", 建议在测试阶段建议设置成true，发布时设置为false
//        CrashReport.initCrashReport(getApplicationContext(), "4436d6392c", true);
        PushThreadPool.getInstance();
        CrashHandler handler = CrashHandler.getInstance();
        handler.init(getApplicationContext());
        Thread.setDefaultUncaughtExceptionHandler(handler);
    }

    public static SDKApplication getInstance()
    {
        return mInstace;
    }


    public String getStrLocalFilePath()
    {
        return m_strLocalFilePath;
    }

    public void setStrLocalFilePath(String strLocalFilePath)
    {
        this.m_strLocalFilePath = strLocalFilePath;
    }

    @Override
    public void onTerminate()
    {
        super.onTerminate();
        if (mNvrSdk == null)
        {
            return;
        }
        mNvrSdk.Cleanup();
        logout();
        System.exit(0);
    }

    public String getSDPath()
    {
        File sdDir = null;
        boolean sdCardExist = Environment.getExternalStorageState().equals(Environment.MEDIA_MOUNTED);
        if (sdCardExist)
        {
            sdDir = Environment.getExternalStorageDirectory();
            return sdDir.toString();
        }
        else
        {
            return null;
        }
    }

    private void initDir()
    {
        if (getSDPath() != null)
        {
            File file;
            String path = getSDPath() + "/" + DIR;
            file = new File(path);
            if (!file.exists())
            {
                file.mkdir();
            }
        }
    }


    public void setUserId1(int userId)
    {
        mUserId1 = userId;
    }

    public void setUserId2(int userId)
    {
        mUserId2 = userId;
    }

    public int getUserId1()
    {
        return mUserId1;
    }

    public int getUserId2()
    {
        return mUserId2;
    }

    public void setChannelCount1(int channelcount)
    {
        m_iChannelCount1 = channelcount;
    }

    public int getChannelCount1()
    {
        return m_iChannelCount1;
    }

    public void setChannelCount2(int channelcount)
    {
        m_iChannelCount2 = channelcount;
    }

    public int getChannelCount2()
    {
        return m_iChannelCount2;
    }

    public void setServerAddr1(String serveraddr)
    {
        m_ServerAddr1 = serveraddr;
    }

    public String getServerAddr1()
    {
        return m_ServerAddr1;
    }

    public void setServerAddr2(String serveraddr)
    {
        m_ServerAddr2 = serveraddr;
    }

    public String getServerAddr2()
    {
        return m_ServerAddr2;
    }

    public void setNvrSdk(nvrsdk invrsdk)
    {
        mNvrSdk = invrsdk;
    }

    public nvrsdk getNvrSdk()
    {
        return mNvrSdk;
    }

    public boolean logout()
    {
        if (mNvrSdk == null)
        {
            return false;
        }
        PushThreadPool.getInstance().PoolShutdown();
        boolean res1 = false;
        boolean res2 = false;
        if (mUserId1 != -1)
        {
            res1 = mNvrSdk.Logout(mUserId1);
            mUserId1 = -1;
        }
        if (mUserId2 != -1)
        {
            res2 = mNvrSdk.Logout(mUserId2);
            mUserId2 = -1;
        }
        System.out.println("logout userid1 = " + res1 + ",logout userid2 = " + res2);
        return res1 || res2;
    }

    public String getVersionName()
    {
        String version = null;
        try
        {
            PackageManager pm = getPackageManager();
            PackageInfo info = pm.getPackageInfo(getPackageName(), 0);
            version = info.versionName;
        }
        catch (NameNotFoundException e)
        {
            e.printStackTrace();
        }
        return version;
    }

    public void closeSoftInput()
    {
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm.isActive())
        {
            imm.toggleSoftInput(InputMethodManager.SHOW_IMPLICIT, InputMethodManager.HIDE_NOT_ALWAYS);
        }
    }

    public void setLoginDeviceInfo(NET_SDK_DEVICEINFO deviceinfo)
    {
        this.deviceinfo = deviceinfo;
    }

    public NET_SDK_DEVICEINFO getLoginDeviceInfo()
    {
        return deviceinfo;
    }

    public void addActivity(BaseActivity activity) {
        if (!mActivityList.contains(activity)) {
            mActivityList.add(activity);
        }

    }

    //提供一个移除activity的方法
    public void removeActivity(BaseActivity activity) {
        if (mActivityList.contains(activity)) {
            mActivityList.remove(activity);
        }
    }
    /**
     * 提供一个清空集合的方法
     * 就是使用循环对集合里的activity逐个销魂
     */
    public void clearAllActivity() {
//        last =mActivityList.get(mActivityList.size()-1);
        for (int i = 0; i< mActivityList.size(); i++) {
            BaseActivity activity = mActivityList.get(i);
            activity.finish();
            Log.d(TAG, "销毁了：" + activity);
        }
        mActivityList.clear();
        System.exit(0);
    }
}
