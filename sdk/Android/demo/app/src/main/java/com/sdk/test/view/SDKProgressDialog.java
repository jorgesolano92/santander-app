package com.sdk.test.view;




import android.app.Dialog;
import android.content.Context;
import android.os.CountDownTimer;
import android.util.Log;
import android.view.Gravity;
import android.widget.TextView;

import com.switchbee.technician.R;

public class SDKProgressDialog extends Dialog
{
	private TextView mTextView;
	private OnTimeOutListener listener;
	private int timeOut;
	private boolean mIsBack = false;
	private CountDownTimer mCountTimer;
	private boolean isShowing = false;
	
	public SDKProgressDialog(Context context, String text)
	{
		super(context, R.style.prograssDialog);
		setContentView(R.layout.prograssdialog_view);
		getWindow().getAttributes().gravity = Gravity.CENTER;
		setCancelable(false);
		mTextView = (TextView) this.findViewById(R.id.prograssdialog_text);
		if (text != null)
		{
			mTextView.setText(text);
		}
	}

	public void setIsBack(boolean isBack)
	{
		mIsBack = isBack;
	}

	@Override
	public void onBackPressed()
	{
		super.onBackPressed();
		dismiss();
		if (listener != null) {
			listener.OnBack();
		}
		Log.d("SDKLoginActivity","dissmiss");
	}

	public void setMessage(String text)
	{
		mTextView.setText(text);

	}
	
	@Override
	public void show()
	{
		super.show();
		isShowing = true;
		if(listener != null && mCountTimer != null)
		{
			mCountTimer.start();
		}
	}

//	@Override
//	public void dismiss()
//	{
//		super.dismiss();
//		isShowing = false;
//		listener = null;
//		if(mCountTimer != null)
//			mCountTimer.cancel();
//	}


	public void setListener(OnTimeOutListener listener)
	{
		this.listener = listener;
		
//		mCountTimer = new CountDownTimer(timeOut, 1000)
//		{
//
//			@Override
//			public void onTick(long millisUntilFinished){
//			}
//
//			@Override
//			public void onFinish() {
//				if(SDKProgressDialog.this.listener != null)
//					SDKProgressDialog.this.listener.OnTimeOut();
//			}
//		};
	}


	public interface OnTimeOutListener
	{
		public void OnBack();
	}
}
