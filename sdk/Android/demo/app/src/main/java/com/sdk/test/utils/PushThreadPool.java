package com.sdk.test.utils;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Created by Administrator on 2018/2/2.
 */

public class PushThreadPool
{
    private static volatile PushThreadPool mPushThreadPool = null;
    private ExecutorService mExecutorService = null;

    public interface PushThreadPoolCallback
    {
//        public void onRet(int code);
        public void onRequestLive(int streamtype, int iichannel);
        public void onGetSubStreamEncodeInfos();

    }

    private PushThreadPool()
    {
        // mExecutorService = Executors.newFixedThreadPool(5);
        mExecutorService = Executors.newCachedThreadPool();
    }

    public static PushThreadPool getInstance()
    {
        if (mPushThreadPool == null)
        {
            synchronized (PushThreadPool.class)
            {
                if (mPushThreadPool == null)
                {
                    mPushThreadPool = new PushThreadPool();
                }
            }
        }
        return mPushThreadPool;
    }

    public ExecutorService getExecutorService()
    {
        return mExecutorService;
    }

    public void PoolExecuteRequestLive(final int streamtype, final int iichannel, final PushThreadPoolCallback callback)
    {
        mExecutorService.execute(new Runnable()
        {
            @Override
            public void run()
            {
                if (callback != null)
                {
                    callback.onRequestLive(streamtype,iichannel);
                }
            }
        });
    }
    public void PoolExecuteGetSubStreamEncodeInfos(final PushThreadPoolCallback callback)
    {
        mExecutorService.execute(new Runnable()
        {
            @Override
            public void run()
            {
                if (callback != null)
                {
                    callback.onGetSubStreamEncodeInfos();
                }
            }
        });
    }


    public static void executeOnThread(Runnable task)
    {
        PushThreadPool instance = getInstance();
        if (instance.mExecutorService.isShutdown() || instance.mExecutorService.isTerminated())
        {
            instance.mExecutorService = Executors.newCachedThreadPool();
        }
        instance.mExecutorService.execute(task);
    }

    public void PoolShutdown()
    {
        mExecutorService.shutdown();
    }
}
