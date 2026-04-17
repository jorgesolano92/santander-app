package com.sdk.test.utils;

import java.text.SimpleDateFormat;
import java.util.Date;


import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.util.TypedValue;

public class SDKUtils
{
	/**
	 * format:yyyy-MM-dd HH:mm:ss
	 * */
	public static String getCurrentTime(String format) 
	{
		SimpleDateFormat df = new SimpleDateFormat(format);
		return df.format(new Date());
	}
	
	/**
	 * dp change to px
	 * 
	 * @param context
	 * @param val
	 * @return
	 */
	public static int dp2px(Context context, float dpVal)
	{
		return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP,
				dpVal, context.getResources().getDisplayMetrics());
	}
	
	/**
	 *
	 * 
	 * @param context
	 * @return
	 */
	public static boolean isNetWorkConnected(Context context)
	{
		if (context != null)
		{
			ConnectivityManager mConnectivityManager = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
			NetworkInfo mNetworkInfo = mConnectivityManager.getActiveNetworkInfo();
			if (mNetworkInfo != null) {
				return mNetworkInfo.isAvailable();
			}
		}
		return false;
	}
	
	public static String longToTimeWitSecond(long value)
	{
		SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
		return sdf.format(new Date(value));
	}
}
