package com.sdk.test.utils;

import android.content.Context;

public class CrashHandler implements Thread.UncaughtExceptionHandler {
        // 需求是 整个应用程序 只有一个 MyCrash-Handler
        private static CrashHandler INSTANCE ;
        private Context context;

        //私有化构造方法
        private CrashHandler(){

        }

        public static synchronized CrashHandler getInstance(){
            if (INSTANCE == null)
                INSTANCE = new CrashHandler();
            return INSTANCE;
        }

        public void init(Context context){
            this.context = context;
        }


        public void uncaughtException(Thread arg0, Throwable arg1) {
            System.out.println("程序挂掉了 ");
            // 在此可以把用户手机的一些信息以及异常信息捕获并上传

            //干掉当前的程序
            android.os.Process.killProcess(android.os.Process.myPid());
        }

    }

