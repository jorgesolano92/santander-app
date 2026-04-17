package com.sdk.interfance;

import static com.sdk.interfance.SDKDefs.VIDEO_ENCODE_TYPE.VIDEO_ENCODE_TYPE_H265;
import static com.sdk.interfance.Utils.getScreenHeight;
import static com.sdk.interfance.Utils.getScreenWidth;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Paint;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Message;
import android.provider.Settings;
import android.text.InputType;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.View.OnTouchListener;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.AbsoluteLayout;
import android.widget.AdapterView;
import android.widget.AdapterView.OnItemSelectedListener;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CompoundButton;
import android.widget.CompoundButton.OnCheckedChangeListener;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.RadioButton;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;

import com.sdk.codec.VideoPlayer;
import com.sdk.interfance.bean.N9000SmartASDContainer;
import com.sdk.interfance.bean.N9000SmartCommonContainer;
import com.sdk.interfance.bean.N9000SmartVSDContainer;
import com.sdk.interfance.bean.N900AlarmFaceIPCContainer;
import com.sdk.interfance.bean.N900AlarmVFDContainer;
import com.sdk.interfance.bean.NET_SDK_IVE_AVD_T;
import com.sdk.interfance.bean.NET_SDK_IVE_FACE_MATCH_T;
import com.sdk.test.app.SDKApplication;
import com.sdk.test.utils.FileOperation;
import com.sdk.test.utils.PushThreadPool;

import com.switchbee.technician.R;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

public class SDKLiveActivity extends BaseActivity implements  NVRSDKCallback/*, ReadCFrameDataInterface*/, PushThreadPool.PushThreadPoolCallback
{
    private static class PlayInfo{
        private long handle = -1;
        private int channel = -1;
        private int viewChannel = -1;
    }
    private static final String TAG = "SDKLiveActivity";
    public static final int UP = 0x101;
    public static final int DOWN = 0x102;
    public static final int LEFT = 0x103;
    public static final int RIGHT = 0x104;
    public static final int LEFT_UP = 0x105;
    public static final int LEFT_DOWN = 0x106;
    public static final int RIGHT_UP = 0x107;
    public static final int RIGHT_DOWN = 0x108;
    public static final int FOCUS_ADD = 0x109;
    public static final int FOCUS_SUB = 0x10a;
    public static final int ZOOM_ADD = 0x10b;
    public static final int ZOOM_SUB = 0x10c;
    public static final int APERTURE_ADD = 0x10d;
    public static final int APERTURE_SUB = 0x10e;
    public static final int CLOSE_CHANNEL = 0x10f;
    private static final int MSG_CAPTURE_SUCC = 2;
    private static final int MSG_CAPTURE_FAIL = 3;

    private AbsoluteLayout m_LiveLayout;
    private int SCREENWIDTH, SCREENHEIGHT;

    private Button m_btnOpenAudio = null;
    private Button m_btnStartRecord = null;
    private RadioButton m_rbMainCodeStream = null;
    private RadioButton m_rbSubCodeStream = null;
    private nvrsdk mNVRSDK = null;
    private EditText m_etChannel = null; // 统一的通道输入框
    private int m_iChannelCount1 = 0;
    private int m_iViewType = ViewType.LiveView;
    private AbsoluteLayout m_PTZLayout;
    private Spinner m_spSpeed = null;
    private ArrayList<String> m_SpeedList = null;
    private Spinner m_spPreset = null;
    private ArrayList<String> m_PresetList = null;
    private Spinner m_spCruise = null;
    private ArrayList<String> m_CruiseList = null;
    private int mUserID1 = 0;
    private AbsoluteLayout m_SetLayout;
    private EditText m_etBright = null;
    private EditText m_etSaturation = null;
    private EditText m_etContrast = null;
    private EditText m_etHue = null;
    Spinner m_spSubStreamResolution = null;
    private ArrayList<String> m_SubStreamResolutionList = null;
    ArrayAdapter m_SubStreamResolutionAdapter = null;
    private ArrayList<DD_ENCODE_CONFIG_N9000_Ex> m_EncodeInfoList = null;
    private ArrayList<DD_ENCODE_CONFIG_N9000_Ex> m_EncodeInfoList1 = null;
    private ArrayList<DD_ENCODE_CONFIG_N9000_Ex> m_EncodeInfoList2 = null;
    private ArrayList<DD_ENCODE_CONFIG_N9000_Ex> m_EncodeInfoList3 = null;


    private static final int REQUEST_EXTERNAL_STORAGE = 1;
    private static String[] PERMISSIONS_STORAGE = {
            "android.permission.READ_EXTERNAL_STORAGE",
            "android.permission.WRITE_EXTERNAL_STORAGE" };


    private HashMap<Integer, String> m_ResolutionMap = new HashMap<Integer, String>();
    private int m_PreStreamtype = 0;
    private FileOperation m_fileoperation = null;
    ScrollView m_scrollview = null;
    private TextView tvfirstdevice;
    private Context mContext;

    private VideoPlayer videoPlayer;
    private boolean m_bAudioEnabled = false; // 音频开启状态
    private PlayInfo[] playInfos = new PlayInfo[4];
    private int streamType = 1;

    @Override
    public void onRequestLive(int streamtype, int iichannel)
    {
        RequestLive(streamtype, iichannel, false);
    }

    @Override
    public void onGetSubStreamEncodeInfos()
    {

    }

    class ViewType
    {
        public final static int LiveView = 1;
        public final static int SetView = 2;
        public final static int PTZView = 3;
    }


   private Handler mHandler = new Handler()
    {
        long time;
        int i =0;
        public void handleMessage(Message msg)
        {
            switch (msg.what)
            {
                case MSG_CAPTURE_SUCC:
                    i++;
                    ToolCommon.LOGD(TAG,i+" Capture success work time ms : "+(System.currentTimeMillis()-time));
                    ToolCommon.LOGD(TAG,i+" Capture path : "+msg.obj);
                    time= System.currentTimeMillis();
                    scanFile(mContext,msg.obj.toString());
                    Toast.makeText(SDKLiveActivity.this, "Capture success! 保存位置："+ msg.obj, Toast.LENGTH_SHORT).show();
                    break;
                case MSG_CAPTURE_FAIL:
                    i++;
                    ToolCommon.LOGD(TAG,i+" Capture fail work time ms : "+(System.currentTimeMillis()-time));
                    ToolCommon.LOGD(TAG,i+" Capture path : "+msg.obj);
                    time= System.currentTimeMillis();
                    Toast.makeText(SDKLiveActivity.this, "Capture fail", Toast.LENGTH_SHORT).show();
                    break;
                case 4:
                    Toast.makeText(SDKLiveActivity.this, "-----StartVoiceComMR,m_lVoiceComHandle = " + msg.obj, Toast.LENGTH_SHORT).show();
                    break;
                case 5:
                    Toast.makeText(SDKLiveActivity.this, "-----StopVoiceCom res=  " + msg.obj, Toast.LENGTH_SHORT).show();
                    break;
                case 6:
                    Toast.makeText(SDKLiveActivity.this, "-----device offline--------- ", Toast.LENGTH_SHORT).show();
                    break;
                case 7:
                    Toast.makeText(SDKLiveActivity.this, "-----device online--------", Toast.LENGTH_SHORT).show();
                    break;
                case 8:
                    int ichannel = msg.arg1;
                    SetSubStreamEncodeInfo(ichannel);
                    break;
                case 9:
                    //			Toast.makeText(SDKLiveActivity.this, "---------onVideoDataFormatHead m_iCurEncodeType = " + msg.arg1 + ",channel = " + channel, Toast
                    // .LENGTH_SHORT).show();
                    break;
                case 10:
                    Toast.makeText(SDKLiveActivity.this, "-----GetDVRConfigSubStreamEncodeInfoEx success----encodeinfodata.length = " + msg.arg1 + ",channel = " + msg.arg2, Toast
                            .LENGTH_SHORT)
                            .show();
                    break;
                case 11:
                    Toast.makeText(SDKLiveActivity.this, "-----GetDVRConfigSubStreamEncodeInfoEx----encodeinfodata is null ,channel = " + msg.arg1, Toast.LENGTH_SHORT)
                            .show();
                    break;
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);
        mContext = this;
        this.getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        mNVRSDK = SDKApplication.getInstance().getNvrSdk();
        if (mNVRSDK == null)
        {
            return;
        }
        SCREENWIDTH = getScreenWidth(this);
        SCREENHEIGHT = getScreenHeight(this);

        mNVRSDK.SetCallback(this);
        mNVRSDK.SetID(111);

        videoPlayer= new VideoPlayer(this);
        playInfos[0] = new PlayInfo();
        playInfos[1] = new PlayInfo();
        playInfos[2] = new PlayInfo();
        playInfos[3] = new PlayInfo();

        mUserID1 = SDKApplication.getInstance().getUserId1();
        m_iChannelCount1 = SDKApplication.getInstance().getChannelCount1();
//        mUserID2 = SDKApplication.getInstance().getUserId2();
//        m_iChannelCount2 = SDKApplication.getInstance().getChannelCount2();

        m_scrollview = new ScrollView(this);
        m_scrollview.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT, 0, 0));


        SetupLiveUI();
        setContentView(m_scrollview);

        m_ResolutionMap.put(0x0001, "640x480"); // VGA
        m_ResolutionMap.put(0x0002, "720x480"); // NTSC
        m_ResolutionMap.put(0x0004, "720x576"); // EDTV
        m_ResolutionMap.put(0x0008, "800x600"); // SVGA
        m_ResolutionMap.put(0x0010, "1024x768"); //
        m_ResolutionMap.put(0x0020, "1280x960");
        m_ResolutionMap.put(0x0040, "1280x1024");
        m_ResolutionMap.put(0x0080, "1920x1080");
        m_ResolutionMap.put(0x0100, "320x240"); // QVGA
        m_ResolutionMap.put(0x0200, "352x240"); // SIF
        m_ResolutionMap.put(0x0400, "480x240"); // HVGA
        m_ResolutionMap.put(0x0800, "704x480"); // 4SIF
        m_ResolutionMap.put(0x1000, "704x576"); // D1
        m_ResolutionMap.put(0x2000, "960x480");
        m_ResolutionMap.put(0x4000, "960x576");
        m_ResolutionMap.put(0x8000, "960x1080");
        m_ResolutionMap.put(0x00010000, "1280x720");
        m_ResolutionMap.put(0x00020000, "1600x1200");
        m_ResolutionMap.put(0x00040000, "1920x1536");
        m_ResolutionMap.put(0x00080000, "2048x1536");
        m_ResolutionMap.put(0x00100000, "2304x1296");
        m_ResolutionMap.put(0x00200000, "2592x1520");
        m_ResolutionMap.put(0x00400000, "2560x1440");
        m_ResolutionMap.put(0x00800000, "2592x1944");
        m_ResolutionMap.put(0x01000000, "3840x2160");
        m_ResolutionMap.put(0x02000000, "352x288");// CIF

        if (m_fileoperation == null)
        {
            //写入本地记录文件
            m_fileoperation = new FileOperation(this, null);
        }

        reqSupportFishEye(mUserID1,m_iChannelCount1);
        //The subcode flow resolution of the channel is obtained first, before the subcode flow resolution is set.
        //        PushThreadPool.getInstance().PoolExecuteGetSubStreamEncodeInfos(SDKLiveActivity.this);
        //鱼眼VR模式监听
        verifyStoragePermissions(this);
    }

    /**
     * 动态请求权限
     * @param activity
     */
    public static void verifyStoragePermissions(Activity activity) {

        try {
            //Android11存储 有需要了申请
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !Environment.isExternalStorageManager()) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                activity.startActivity(intent);
            }

            //检测是否有写的权限
            int permission = ActivityCompat.checkSelfPermission(activity,
                    "android.permission.WRITE_EXTERNAL_STORAGE");
            if (permission != PackageManager.PERMISSION_GRANTED) {
                // 没有写的权限，去申请写的权限
                ActivityCompat.requestPermissions(activity, PERMISSIONS_STORAGE,REQUEST_EXTERNAL_STORAGE);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private List<Integer> supportFishEyeChls = new ArrayList<>();
    /***是否支持鱼眼的通道请求*/
    private void reqSupportFishEye(final int userID1,final  int channelCount)
    {
        PushThreadPool.executeOnThread(new Runnable()
        {
            @Override
            public void run()
            {
                FishEye[] fishEyes = mNVRSDK.supportFishEye(userID1, channelCount);
                ToolCommon.LOGD(TAG,"null != fishEyes ? " + (null != fishEyes));
                if (null != fishEyes && fishEyes.length > 0)
                {
                    ToolCommon.LOGD(TAG,"fishEyes.length =  ? "+(fishEyes.length));
                    supportFishEyeChls.clear();
                    for (int i = 0; i < fishEyes.length; i++)
                    {
                        FishEye fishEye = fishEyes[i];
                        if(fishEye == null)
                        {
                            continue;
                        }
                        ToolCommon.LOGD(TAG,i + " supportFisheye : " + fishEye.supportFisheye+" fishEye.channel : "+fishEye.channel);
                        if (fishEye.supportFisheye)
                        {
                            supportFishEyeChls.add(fishEye.channel);
                        }
                    }
                    ToolCommon.LOGD(TAG,supportFishEyeChls.size()+" info : "+(supportFishEyeChls.toString()));
                }

            }
        });
    }

    //设置横竖屏:VR旋转方向
    public boolean setGyroScopeState(boolean start)
    {
        return true;
    }
    public void setMyRequestedOrientation(int requestedOrientation)
    {
    }
    @Override
    protected void onDestroy()
    {
        super.onDestroy();
        CloseAllLiveChannel();
        mHandler.removeCallbacksAndMessages(null);
        mdecodeHandler.removeCallbacksAndMessages(null);
        if (mNVRSDK != null)
        {
            mNVRSDK.SetCallback(null);
        }
        mNVRSDK = null;
    }

    public void SetupLiveUI()
    {
        if (m_LiveLayout == null)
        {
            // 动态计算尺寸，考虑屏幕密度和设备特性（紧凑布局）
            float density = getResources().getDisplayMetrics().density;
            float scaledDensity = getResources().getDisplayMetrics().scaledDensity;
            
            // 基础尺寸（dp单位）- 更紧凑的设计
            int baseButtonWidth = 100;  // 减小最小按钮宽度
            int baseButtonHeight = 40;  // 减小按钮高度（从48dp减到40dp）
            int baseMargin = 6;         // 减小边距（从8dp减到6dp）
            int baseTextSize = 13;      // 减小基础文字大小（从14减到13）
            
            // 转换为像素
            int itextwidth = Math.max(SCREENWIDTH / 3, (int)(baseButtonWidth * density));
            int itextheight = (int)(baseButtonHeight * density);
            int ihdistance = (int)(baseMargin * density);
            int ieditwidth = SCREENWIDTH - ihdistance * 2 - itextwidth;


            m_LiveLayout = new AbsoluteLayout(this);
            m_LiveLayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT, 0, 0));
            m_LiveLayout.setBackgroundColor(Color.WHITE);

            m_scrollview.addView(m_LiveLayout);

            final Button btnLogout = createOptimizedButton("Return", itextwidth, itextheight, ihdistance, ihdistance);
            m_LiveLayout.addView(btnLogout);
            btnLogout.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    if (m_iViewType == ViewType.LiveView)
                    {
                        CloseAllLiveChannel();
                        startActivity(new Intent(SDKLiveActivity.this, SDKMainActivity.class));
                        SDKLiveActivity.this.finish();
                    }
                    else if (m_iViewType == ViewType.PTZView)
                    {
                        if (m_PTZLayout != null)
                        {
                            m_PTZLayout.setVisibility(View.INVISIBLE);
                            m_iViewType = ViewType.LiveView;
                        }
                    }
                    else if (m_iViewType == ViewType.SetView)
                    {
                        if (m_SetLayout != null)
                        {
                            m_SetLayout.setVisibility(View.INVISIBLE);
                            m_iViewType = ViewType.LiveView;
                        }
                    }
                }
            });
            tvfirstdevice = new TextView(this);
            tvfirstdevice.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - 1, itextheight, 0, ihdistance + itextheight));
            tvfirstdevice.setTextColor(Color.BLUE);
            tvfirstdevice.setTextSize(13); // 从16减小到13
            tvfirstdevice.setText("the first videoview");
            tvfirstdevice.setGravity(Gravity.LEFT | Gravity.BOTTOM);
            m_LiveLayout.addView(tvfirstdevice);


            videoPlayer.setBackgroundColor(Color.BLACK);
            // VideoPlayer的高度与宽度比固定为3:4（宽高比4:3）
            int videoPlayerWidth = SCREENWIDTH - 2 * ihdistance;
            int videoPlayerHeight = (int)(videoPlayerWidth * 3.0 / 4.0); // 高度 = 宽度 × 3/4
            int videoPlayerY = ihdistance + itextheight * 2; // VideoPlayer 的 Y 坐标
            videoPlayer.setLayoutParams(new AbsoluteLayout.LayoutParams(videoPlayerWidth, videoPlayerHeight, ihdistance, videoPlayerY));
            m_LiveLayout.addView(videoPlayer);
            
            // 根据VideoPlayer的实际高度计算底部布局的位置
            int itopdistance = videoPlayerY + videoPlayerHeight + ihdistance;

            // 动态计算按钮宽度，确保有足够空间显示文本
            int ibtnwidth = (SCREENWIDTH - ihdistance * 4) / 3;



            AbsoluteLayout bottomlayout = new AbsoluteLayout(this);
            bottomlayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT * 2, 0, itopdistance));
            m_LiveLayout.addView(bottomlayout);

            // 通道选择输入框
            m_etChannel = new EditText(this);
            m_etChannel.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth / 2, itextheight, ihdistance, ihdistance));
            m_etChannel.setTextSize(13);
            m_etChannel.setHint("Channel");
            m_etChannel.setText("1");
            m_etChannel.setGravity(Gravity.CENTER);
            bottomlayout.addView(m_etChannel);

            // 通道切换按钮
            Button btnChangeCH = createOptimizedButton("View Channel", ibtnwidth, itextheight, ihdistance * 2 + ibtnwidth / 2, ihdistance);
            bottomlayout.addView(btnChangeCH);
            btnChangeCH.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    try
                    {
                        int ichannel = Integer.valueOf(m_etChannel.getText().toString().trim());
                        if (ichannel >= 1 && ichannel <= m_iChannelCount1)
                        {
                            // 获取当前选中的通道索引
                            int selectedChannel = videoPlayer.getSelectedChannel();
                            
                            // 关闭当前选中通道的播放
                            CloseLiveChannel(selectedChannel);
                            
                            long newPlayHandle = StartLiveChannel(selectedChannel);
                            
                            if (newPlayHandle == -1)
                            {
                                long errorcode = mNVRSDK.GetLastError();
                                Toast.makeText(SDKLiveActivity.this, "Play fail, errorcode = " + errorcode, Toast.LENGTH_SHORT).show();
                            }
                            else
                            {
                                playInfos[selectedChannel].handle = newPlayHandle;
                                playInfos[selectedChannel].channel = ichannel - 1;

                                ToolCommon.LOGD(TAG, "Channel switched to " + ichannel + " for view " + (selectedChannel + 1));
                                Toast.makeText(SDKLiveActivity.this, "Channel " + ichannel + " playing on view " + (selectedChannel + 1), Toast.LENGTH_SHORT).show();
                            }
                        }
                        else
                        {
                            Toast.makeText(SDKLiveActivity.this, "Invalid channel (Range: 1-" + m_iChannelCount1 + ")", Toast.LENGTH_SHORT).show();
                        }
                    }
                    catch (NumberFormatException e)
                    {
                        Toast.makeText(SDKLiveActivity.this, "Please enter a valid channel number", Toast.LENGTH_SHORT).show();
                        e.printStackTrace();
                    }
                }
            });

            // 关闭选中通道按钮
            Button btnCloseChannel = createOptimizedButton("Close View", ibtnwidth*2/3, itextheight, ihdistance * 3 + ibtnwidth  + ibtnwidth / 2, ihdistance);
            bottomlayout.addView(btnCloseChannel);
            btnCloseChannel.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    // 获取当前选中的通道索引
                    int selectedChannel = videoPlayer.getSelectedChannel();
                    
                    // 关闭当前选中通道的播放
                    CloseLiveChannel(selectedChannel);
                    
                    Toast.makeText(SDKLiveActivity.this, "View " + (selectedChannel + 1) + " closed", Toast.LENGTH_SHORT).show();
                    ToolCommon.LOGD(TAG, "Closed channel view: " + (selectedChannel + 1));
                }
            });

            final Button CloseChannel = new Button(this);
            CloseChannel.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth*2/3 , itextheight, ihdistance * 4 + ibtnwidth  + ibtnwidth / 2 + ibtnwidth*2/3 , ihdistance));
            CloseChannel.setTextColor(Color.BLACK);
            CloseChannel.setTextSize(15);
            CloseChannel.setText("Close all");
            bottomlayout.addView(CloseChannel);
            CloseChannel.setOnClickListener(new OnClickListener() {
                @Override
                public void onClick(View v) {
                    CloseAllLiveChannel();
                }
            });
            
            int itopposition = ihdistance * 2 + itextheight;
            
            // 显示通道范围（移到下一行）
            TextView tvChRange = new TextView(this);
            tvChRange.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH - ihdistance * 2, itextheight, ihdistance, itopposition));
            tvChRange.setGravity(Gravity.CENTER);
            tvChRange.setTextColor(Color.BLUE);
            tvChRange.setTextSize(13);
            tvChRange.setText("Current Channel Range: 1-" + m_iChannelCount1);
            bottomlayout.addView(tvChRange);

            itopposition += itextheight + ihdistance;

            TextView tvdevice = new TextView(this);
            tvdevice.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, itextheight, 0, itopposition));
            tvdevice.setTextColor(Color.BLUE);
            tvdevice.setTextSize(16);
            tvdevice.setText("The following settings take effect on the first videoview !!!");
            tvdevice.setGravity(Gravity.CENTER);
            bottomlayout.addView(tvdevice);

            itopposition += itextheight;
            m_rbMainCodeStream = new RadioButton(this);
            m_rbMainCodeStream.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2, itextheight, 0, itopposition));
            m_rbMainCodeStream.setText("Main Stream");
            m_rbMainCodeStream.setTextColor(Color.BLACK);
            m_rbMainCodeStream.setChecked(false);
            //			bottomlayout.addView(m_rbMainCodeStream);

            m_rbMainCodeStream.setOnCheckedChangeListener(new OnCheckedChangeListener()
            {
                @Override
                public void onCheckedChanged(CompoundButton buttonView, boolean isChecked)
                {
                    m_rbSubCodeStream.setChecked(!isChecked);
                    streamType = 0;
                }
            });

            m_rbSubCodeStream = new RadioButton(this);
            m_rbSubCodeStream.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2, itextheight, SCREENWIDTH / 2, itopposition));
            m_rbSubCodeStream.setText("Sub Stream");
            m_rbSubCodeStream.setTextColor(Color.BLACK);
            m_rbSubCodeStream.setChecked(true);
            //			bottomlayout.addView(m_rbSubCodeStream);
            m_rbSubCodeStream.setOnCheckedChangeListener(new OnCheckedChangeListener()
            {
                @Override
                public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                    m_rbMainCodeStream.setChecked(!isChecked);
                    streamType = 1;
                }
            });

            ibtnwidth = (SCREENWIDTH - ihdistance * 4) / 3;
            //			itopposition = ihdistance * 3 + itextheight * 2;

            TextView btnSetResolution = new TextView(this);
            btnSetResolution.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth, itextheight, ihdistance, itopposition));
            btnSetResolution.setTextColor(Color.BLACK);
            btnSetResolution.setTextSize(15);
            btnSetResolution.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
            btnSetResolution.setText("Modify Resolution:");
            bottomlayout.addView(btnSetResolution);

            m_spSubStreamResolution = new Spinner(this);
            m_spSubStreamResolution.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, SCREENWIDTH / 2, itopposition));
            bottomlayout.addView(m_spSubStreamResolution);
            m_spSubStreamResolution.setOnItemSelectedListener(new OnItemSelectedListener()
            {
                @Override
                public void onItemSelected(AdapterView<?> parent, View view, int position, long id)
                {
                    streamType = position==0 ? 1: 0;
                    int selectedChannel = videoPlayer.getSelectedChannel();
                    if(selectedChannel >=0 && selectedChannel < playInfos.length && playInfos[selectedChannel].handle!=-1){
                        CloseCurrentChannel();
                        StartLiveCurrentChannel();
                    }

                }

                @Override
                public void onNothingSelected(AdapterView<?> parent)
                {

                }
            });
            m_SubStreamResolutionList = new ArrayList<String>();
            m_SubStreamResolutionList.add("Sub Stream");
            m_SubStreamResolutionList.add("Main Stream");

            m_SubStreamResolutionAdapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, m_SubStreamResolutionList);
            m_SubStreamResolutionAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            m_spSubStreamResolution.setAdapter(m_SubStreamResolutionAdapter);


            ibtnwidth = (SCREENWIDTH - ihdistance * 4) / 3;
            itopposition += ihdistance * 1 + itextheight * 1;
            Button btnCapture = createOptimizedButton("Capture BMP", ibtnwidth, itextheight, ihdistance, itopposition);
            bottomlayout.addView(btnCapture);
            btnCapture.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                }
            });

            m_btnOpenAudio = createOptimizedButton("Open Audio", ibtnwidth, itextheight, ihdistance * 2 + ibtnwidth, itopposition);
            bottomlayout.addView(m_btnOpenAudio);
            m_btnOpenAudio.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    if (videoPlayer == null)
                    {
                        Toast.makeText(SDKLiveActivity.this, "VideoPlayer not initialized", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    
                    // 开启音频
                    m_bAudioEnabled = true;
                    
                    // 恢复所有通道的音频播放
                    for (int i = 0; i < 4; i++) {
                        try {
                            videoPlayer.setAudioEnabled(i, true);
                        } catch (Exception e) {
                            ToolCommon.LOGD(TAG, "Failed to enable audio for channel " + i + ": " + e.getMessage());
                        }
                    }
                    
                    m_btnOpenAudio.setText("Audio ON");
                    Toast.makeText(SDKLiveActivity.this, "Audio enabled", Toast.LENGTH_SHORT).show();
                    ToolCommon.LOGD(TAG, "Audio enabled for all channels");
                }
            });

            m_btnStartRecord = createOptimizedButton("Start Record", ibtnwidth, itextheight, ihdistance * 3 + ibtnwidth * 2, itopposition);
            bottomlayout.addView(m_btnStartRecord);
            m_btnStartRecord.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v) {
                }
            });

            itopposition += ihdistance * 1 + itextheight * 1;
            Button btnPTZ = createOptimizedButton("PTZ", ibtnwidth, itextheight, ihdistance, itopposition);
            bottomlayout.addView(btnPTZ);
            btnPTZ.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    SetupPTZUI();
                }
            });

            Button btnCloseAudio = createOptimizedButton("Close Audio", ibtnwidth, itextheight, ihdistance * 2 + ibtnwidth, itopposition);
            bottomlayout.addView(btnCloseAudio);
            btnCloseAudio.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    if (videoPlayer == null)
                    {
                        Toast.makeText(SDKLiveActivity.this, "VideoPlayer not initialized", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    
                    // 关闭音频
                    m_bAudioEnabled = false;
                    
                    // 暂停所有通道的音频播放
                    for (int i = 0; i < 4; i++) {
                        try {
                            videoPlayer.setAudioEnabled(i, false);
                        } catch (Exception e) {
                            ToolCommon.LOGD(TAG, "Failed to disable audio for channel " + i + ": " + e.getMessage());
                        }
                    }
                    
                    m_btnOpenAudio.setText("Open Audio");
                    Toast.makeText(SDKLiveActivity.this, "Audio disabled", Toast.LENGTH_SHORT).show();
                    ToolCommon.LOGD(TAG, "Audio disabled for all channels");
                }
            });

            Button btnStopRecord = createOptimizedButton("Stop Record", ibtnwidth, itextheight, ihdistance * 3 + ibtnwidth * 2, itopposition);
            bottomlayout.addView(btnStopRecord);
            btnStopRecord.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {

                }
            });

            itopposition += ihdistance * 1 + itextheight * 1;
            Button btnSet = createOptimizedButton("Get and set video parameters", SCREENWIDTH - ihdistance * 2, itextheight, ihdistance, itopposition);
            bottomlayout.addView(btnSet);
            btnSet.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    SetupSetUI();
                }
            });

            itopposition += ihdistance * 1 + itextheight * 1;
            TextView tvblank = new TextView(this);
            tvblank.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH - ihdistance * 2, itextheight, ihdistance, itopposition));
            bottomlayout.addView(tvblank);

            Button CaptureJpg = createOptimizedButton("Capture JPG", ibtnwidth, itextheight, ihdistance , itopposition);
            bottomlayout.addView(CaptureJpg);
            CaptureJpg.setOnClickListener(new OnClickListener() {
                @Override
                public void onClick(View v) {
                    String  path = ToolCommon.getFileName(mContext, "capture", "jpg");
                    ToolCommon.LOGD(TAG, "onClick: jpg path :"+ path);
                }
            });

            Button CaptureJpgbg = createOptimizedButton("Capture JPEG Background", ibtnwidth*2 +  ihdistance, itextheight, ihdistance * 2 + ibtnwidth , itopposition);
            bottomlayout.addView(CaptureJpgbg);
            CaptureJpgbg.setOnClickListener(new OnClickListener() {
                @Override
                public void onClick(View v) {
                    int index = videoPlayer.getSelectedChannel();
                    if(index >= 0 && index< playInfos.length) {
                        int channel = playInfos[index].channel;
                        String path = ToolCommon.getFileName(mContext, "capture", "jpg");
                        ToolCommon.LOGD(TAG, "onClick: jpg path :" + path + ",channel:" + channel);
                        byte[] image = mNVRSDK.CaptureJEPGbg(mUserID1, channel);
                        boolean ret = ToolCommon.bytesToImageFile(image, path);
                        if (ret) {
                            Toast.makeText(SDKLiveActivity.this, "capture success", Toast.LENGTH_SHORT).show();
                        } else
                            Toast.makeText(SDKLiveActivity.this, "capture fail", Toast.LENGTH_SHORT).show();
                    }
                }
            });

            itopposition += ihdistance * 1 + itextheight * 1;
            final Button openDoorBtn = new Button(this);
            final EditText openDoorChannel= new EditText(this);
            openDoorChannel.setHint("access control channel");
            openDoorChannel.setInputType(InputType.TYPE_CLASS_NUMBER);
            openDoorChannel.setTextSize(15);
            openDoorChannel.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth*2 , itextheight, ihdistance  , itopposition));
            bottomlayout.addView(openDoorChannel);
            openDoorBtn.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth , itextheight + 5, ihdistance * 2 + ibtnwidth*2  , itopposition));
            openDoorBtn.setTextColor(Color.BLACK);
            openDoorBtn.setTextSize(15);
            openDoorBtn.setText("open door");
            bottomlayout.addView(openDoorBtn);
            openDoorBtn.setOnClickListener(new OnClickListener() {
                @Override
                public void onClick(View v) {
                    try {
                        long channel = Long.parseLong(openDoorChannel.getText().toString());
                        openDoor(channel - 1);
                    }catch (NumberFormatException e){
                        ToolCommon.toastShow( SDKLiveActivity.this, "please input channel number");
                    }
                }
            });

        } else {
            //			HideSubViews();
            m_LiveLayout.setVisibility(View.VISIBLE);
        }
    }

    private void setupFishEyeUI(int parentViewW, int parentViewH, int parentViewX, int parentViewY,final int videoIndex)
    {
        ImageView ivFish = new ImageView(this);
        ivFish.setLayoutParams(new AbsoluteLayout.LayoutParams(100, 100, parentViewW - 100, parentViewY));
        ivFish.setImageResource(R.drawable.fish_eye_selector);
        m_LiveLayout.addView(ivFish);
        ivFish.setOnClickListener(new OnClickListener()
        {
            @Override
            public void onClick(View v)
            {

            }
        });

    }

    /**
     * 通知媒体库更新文件
     * @param context
     * @param filePath 文件全路径
     *
     * */
    public void scanFile(Context context, String filePath) {
        Intent scanIntent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
        scanIntent.setData(Uri.fromFile(new File(filePath)));
        context.sendBroadcast(scanIntent);
    }

    @Override
    public void onCaptureRet(boolean bSucc, String path)
    {
        if (bSucc)
        {
            Message obtain = Message.obtain();
            obtain.what = MSG_CAPTURE_SUCC;
            obtain.obj = path;
            mHandler.sendMessage(obtain);
        }
        else
        {
            Message obtain = Message.obtain();
            obtain.what = MSG_CAPTURE_FAIL;
            obtain.obj = path;
            mHandler.sendMessage(obtain);
        }
    }

    @Override
    public void onDecodeFrameTime(boolean bKeyFrame, long frameTime, int frameIndex)
    {

    }

    long time1 =  System.currentTimeMillis();
    long time2 = 0;
    long dwLowDateTime1 = 0;
    long dwLowDateTime2 = 0;

    boolean btest = true;
    int m_iframecount = 0;
    boolean bWaitKeyFrame = true;

    boolean m_bSetSubStreamEncodeInfo1 = true;
    boolean m_bSetSubStreamEncodeInfo2 = true;
    boolean m_bSetSubStreamEncodeInfo3 = true;
    boolean m_bSetSubStreamEncodeInfo4 = true;
    long time0 = 0;
    int frameCount;
    @Override
    public void onVideoData(long livehandle, int iNodeID, byte[] data, int frameLen, long timeStamp, boolean isKeyFrame, int width, int height, int frameIndex, int encodeType,
                            int frameType)
    {
        // 据livehandle判断视频数据属于哪个通道
        if(videoPlayer != null)
        {
            for(PlayInfo playInfo: playInfos)
            {
                // 解码到对应的通道
                if(livehandle == playInfo.handle && playInfo.viewChannel>=0 && playInfo.viewChannel<4) {
                    videoPlayer.decodeToChannel(playInfo.viewChannel, data, timeStamp);
                }
            }
        }


    }
    Handler mdecodeHandler = new Handler(){
        @Override
        public void dispatchMessage(Message msg)
        {

        }
    };
    public void CloseAllLiveChannel()
    {
        ToolCommon.LOGD(TAG,"------------CloseAllLiveChannel----------");
        if (mNVRSDK != null )
        {
            for (int i=0; i<playInfos.length; i++) {
                CloseLiveChannel(i);
            }
        }

        if(videoPlayer!=null) {
            videoPlayer.release();
        }

    }


    public void CloseCurrentChannel(){
        // 获取当前选中的通道索引
        int selectedChannel = videoPlayer.getSelectedChannel();

        // 关闭当前选中通道的播放
        CloseLiveChannel(selectedChannel);
    }

    public long StartLiveChannel(int index){
        if (mNVRSDK != null && index>=0 && index < playInfos.length)
        {
            int userID = SDKApplication.getInstance().getUserId1();
            int ichannel = Integer.valueOf(m_etChannel.getText().toString().trim()) - 1;
            if (ichannel >= 0 && ichannel < m_iChannelCount1)
            {
                playInfos[index].handle = mNVRSDK.LivePlay(userID, ichannel, streamType);
                playInfos[index].channel = ichannel;
                playInfos[index].viewChannel = videoPlayer.getSelectedChannel();
                return  playInfos[index].handle;
            }

        }
        return -1;
    }

    public void StartLiveCurrentChannel(){
        int selectedIndex = videoPlayer.getSelectedChannel();
        if(selectedIndex>=0 && selectedIndex < playInfos.length){
            int userID = SDKApplication.getInstance().getUserId1();
            playInfos[selectedIndex].handle = mNVRSDK.LivePlay(userID, playInfos[selectedIndex].channel, streamType);
            playInfos[selectedIndex].viewChannel = selectedIndex;
        }
    }



    public void CloseLiveChannel(int index)
    {
        ToolCommon.LOGD(TAG,"------------CloseLiveChannel----------bvideoviewindex = " + index);
        if (mNVRSDK != null && index>=0 && index < playInfos.length)
        {
            mNVRSDK.StopLivePlay(playInfos[index].handle);
            playInfos[index].handle = -1;
            playInfos[index].viewChannel = -1;
            videoPlayer.closeChannel(index);

        }
    }

    public void openDoor(long channel){
        if (mNVRSDK != null){
            boolean ret =  mNVRSDK.UnlockAccessControl(mUserID1,channel);
            if(!ret){
                ToolCommon.toastShow(SDKLiveActivity.this, "open door failed");
            }else{
                ToolCommon.toastShow(SDKLiveActivity.this, "open door success");
            }
        }
    }
    @Override
    public void onAudioData(long livehandle, int iNodeID, byte[] data, int frameLen, long timeStamp, int iSampleRateInHz, int b8BitWidth, int bMono, int encodeType)
    {
        // 只有在音频开启时才解码音频数据
        if (!m_bAudioEnabled) {
            return;
        }

        for (PlayInfo playInfo : playInfos){
            if(playInfo.handle == livehandle){
                videoPlayer.decodeAudioToChannel(playInfo.channel, data, timeStamp);
            }
        }
    }

    public void SetupPTZUI()
    {
        if (m_LiveLayout == null)
        {
            return;
        }
        m_iViewType = ViewType.PTZView;
        if (m_PTZLayout == null)
        {
            // 动态计算PTZ界面尺寸（紧凑版）
            float density = getResources().getDisplayMetrics().density;
            int ihdistance = (int)(6 * density);  // 减小到6dp
            int itextheight = (int)(38 * density); // 减小到38dp（从48减到38）
            int iptzlayoutheight = SCREENHEIGHT - itextheight - ihdistance * 2 - SCREENWIDTH;
            
            // 确保按钮有足够宽度显示文本（更紧凑）
            int minBtnWidth = (int)(70 * density); // 最小70dp（减小10dp）
            int ibtnwidth1 = Math.max((SCREENWIDTH - ihdistance * 6) / 6, minBtnWidth);
            int ibtnwidth2 = Math.max((SCREENWIDTH / 2 - ihdistance * 4) / 3, minBtnWidth);
            int itextwidth = ((int) (SCREENWIDTH * 0.4) - ihdistance * 3) / 3;

            //			m_PTZScrollView = new ScrollView(this);
            //			m_PTZScrollView.setLayoutParams(
            //					new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT - ihdistance - itextheight - SCREENWIDTH * 2 / 3, 0, ihdistance + itextheight + SCREENWIDTH *
            // 2 / 3));
            //			m_PTZScrollView.setBackgroundColor(Color.WHITE);
            //			m_LiveLayout.addView(m_PTZScrollView);

            m_PTZLayout = new AbsoluteLayout(this);
            //			m_PTZLayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT - ihdistance - itextheight - SCREENWIDTH * 2 / 3, 0, 0));
            m_PTZLayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT, 0, ihdistance + itextheight * 2 + SCREENWIDTH * 2 / 3 + 3));
            m_PTZLayout.setBackgroundColor(Color.LTGRAY);
            m_LiveLayout.addView(m_PTZLayout);

            Button btnLeftUp = createPTZButton("leftup", ibtnwidth1, itextheight, ihdistance, ihdistance);
            btnLeftUp.setTag(LEFT_UP);
            btnLeftUp.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnLeftUp);

            Button btnUp = createPTZButton("up", ibtnwidth1, itextheight, ihdistance * 2 + ibtnwidth1, ihdistance);
            btnUp.setTag(UP);
            btnUp.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnUp);

            Button btnRightUp = new Button(this);
            btnRightUp.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance * 3 + ibtnwidth1 * 2, ihdistance));
            btnRightUp.setTextColor(Color.BLACK);
            btnRightUp.setTextSize(14);
            ;
            btnRightUp.setText("rightup");
            btnRightUp.setTag(RIGHT_UP);
            btnRightUp.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnRightUp);

            Button btnLeft = new Button(this);
            btnLeft.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance, ihdistance * 2 + itextheight));
            btnLeft.setTextColor(Color.BLACK);
            btnLeft.setTextSize(14);
            ;
            btnLeft.setText("left");
            btnLeft.setTag(LEFT);
            btnLeft.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnLeft);

            Button btnStop = new Button(this);
            btnStop.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance * 2 + ibtnwidth1, ihdistance * 2 + itextheight));
            btnStop.setTextColor(Color.BLACK);
            btnStop.setTextSize(14);
            ;
            btnStop.setText("stop");
            m_PTZLayout.addView(btnStop);
            btnStop.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    PTZTouch(0, false);
                }
            });

            Button btnRight = new Button(this);
            btnRight.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance * 3 + ibtnwidth1 * 2, ihdistance * 2 + itextheight));
            btnRight.setTextColor(Color.BLACK);
            btnRight.setTextSize(14);
            ;
            btnRight.setText("right");
            btnRight.setTag(RIGHT);
            btnRight.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnRight);

            Button btnLeftDown = new Button(this);
            btnLeftDown.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance, ihdistance * 3 + itextheight * 2));
            btnLeftDown.setTextColor(Color.BLACK);
            btnLeftDown.setTextSize(14);
            ;
            btnLeftDown.setText("leftdown");
            btnLeftDown.setTag(LEFT_DOWN);
            btnLeftDown.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnLeftDown);

            Button btnDown = new Button(this);
            btnDown.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance * 2 + ibtnwidth1, ihdistance * 3 + itextheight * 2));
            btnDown.setTextColor(Color.BLACK);
            btnDown.setTextSize(14);
            ;
            btnDown.setText("down");
            btnDown.setTag(DOWN);
            btnDown.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnDown);

            Button btnRightDown = new Button(this);
            btnRightDown.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, ihdistance * 3 + ibtnwidth1 * 2, ihdistance * 3 + itextheight * 2));
            btnRightDown.setTextColor(Color.BLACK);
            btnRightDown.setTextSize(14);
            ;
            btnRightDown.setText("rightdown");
            btnRightDown.setTag(RIGHT_DOWN);
            btnRightDown.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnRightDown);

            TextView tvAddFocus = new TextView(this);
            tvAddFocus.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH - ihdistance * 5 - ibtnwidth1 * 5, itextheight, (ihdistance + ibtnwidth1) * 3, ihdistance));
            tvAddFocus.setTextColor(Color.BLACK);
            tvAddFocus.setTextSize(14);
            ;
            tvAddFocus.setGravity(Gravity.CENTER);
            tvAddFocus.setText("focus");
            m_PTZLayout.addView(tvAddFocus);

            Button btnAddFocus = new Button(this);
            btnAddFocus.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, SCREENWIDTH - ihdistance * 2 - ibtnwidth1 * 2, ihdistance));
            btnAddFocus.setTextColor(Color.BLACK);
            btnAddFocus.setTextSize(14);
            ;
            btnAddFocus.setText("add");
            btnAddFocus.setTag(FOCUS_ADD);
            btnAddFocus.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnAddFocus);

            Button btnMinusFocus = new Button(this);
            btnMinusFocus.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, SCREENWIDTH - ihdistance - ibtnwidth1, ihdistance));
            btnMinusFocus.setTextColor(Color.BLACK);
            btnMinusFocus.setTextSize(14);
            ;
            btnMinusFocus.setText("minus");
            btnMinusFocus.setTag(FOCUS_SUB);
            btnMinusFocus.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnMinusFocus);

            TextView tvAddZoom = new TextView(this);
            tvAddZoom.setLayoutParams(
                    new AbsoluteLayout.LayoutParams(SCREENWIDTH - ihdistance * 5 - ibtnwidth1 * 5, itextheight, (ihdistance + ibtnwidth1) * 3, ihdistance * 2 + itextheight));
            tvAddZoom.setTextColor(Color.BLACK);
            tvAddZoom.setTextSize(14);
            ;
            tvAddZoom.setText("zoom");
            tvAddZoom.setGravity(Gravity.CENTER);
            m_PTZLayout.addView(tvAddZoom);

            Button btnAddZoom = new Button(this);
            btnAddZoom.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, SCREENWIDTH - ihdistance * 2 - ibtnwidth1 * 2, ihdistance * 2 + itextheight));
            btnAddZoom.setTextColor(Color.BLACK);
            btnAddZoom.setTextSize(14);
            ;
            btnAddZoom.setText("add");
            btnAddZoom.setTag(ZOOM_ADD);
            btnAddZoom.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnAddZoom);

            Button btnMinusZoom = new Button(this);
            btnMinusZoom.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, SCREENWIDTH - ihdistance - ibtnwidth1, ihdistance * 2 + itextheight));
            btnMinusZoom.setTextColor(Color.BLACK);
            btnMinusZoom.setTextSize(14);
            ;
            btnMinusZoom.setText("minus");
            btnMinusZoom.setTag(ZOOM_SUB);
            btnMinusZoom.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnMinusZoom);

            TextView tvAddIris = new TextView(this);
            tvAddIris.setLayoutParams(
                    new AbsoluteLayout.LayoutParams(SCREENWIDTH - ihdistance * 5 - ibtnwidth1 * 5, itextheight, (ihdistance + ibtnwidth1) * 3, ihdistance * 3 + itextheight * 2));
            tvAddIris.setTextColor(Color.BLACK);
            tvAddIris.setTextSize(14);
            ;
            tvAddIris.setGravity(Gravity.CENTER);
            tvAddIris.setText("iris");
            m_PTZLayout.addView(tvAddIris);

            Button btnAddIris = new Button(this);
            btnAddIris.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, SCREENWIDTH - ihdistance * 2 - ibtnwidth1 * 2, ihdistance * 3 + itextheight * 2));
            btnAddIris.setTextColor(Color.BLACK);
            btnAddIris.setTextSize(14);
            ;
            btnAddIris.setText("add");
            btnAddIris.setTag(APERTURE_ADD);
            btnAddIris.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnAddIris);

            Button btnMinusIris = new Button(this);
            btnMinusIris.setLayoutParams(new AbsoluteLayout.LayoutParams(ibtnwidth1, itextheight, SCREENWIDTH - ihdistance - ibtnwidth1, ihdistance * 3 + itextheight * 2));
            btnMinusIris.setTextColor(Color.BLACK);
            btnMinusIris.setTextSize(14);
            ;
            btnMinusIris.setText("minus");
            btnMinusIris.setTag(APERTURE_SUB);
            btnMinusIris.setOnTouchListener(mTouchClick);
            m_PTZLayout.addView(btnMinusIris);

            int iSpinnerWidth = (SCREENWIDTH - ihdistance * 3) / 4;
            TextView tvSpeed = new TextView(this);
            tvSpeed.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, 0, ihdistance * 4 + itextheight * 3));
            tvSpeed.setTextColor(Color.BLACK);
            tvSpeed.setTextSize(15);
            tvSpeed.setGravity(Gravity.CENTER);
            tvSpeed.setText("speed");
            m_PTZLayout.addView(tvSpeed);

            m_spSpeed = new Spinner(this);
            m_spSpeed.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, iSpinnerWidth, ihdistance * 4 + itextheight * 3));
            m_PTZLayout.addView(m_spSpeed);

            m_SpeedList = new ArrayList<String>();
            for (int i = 0; i < 8; i++)
            {
                m_SpeedList.add(String.valueOf(i + 1));
            }
            ArrayAdapter iSpeedAdapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, m_SpeedList);
            iSpeedAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            m_spSpeed.setAdapter(iSpeedAdapter);

            TextView tvPreset = new TextView(this);
            tvPreset.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, 0, ihdistance * 5 + itextheight * 4));
            tvPreset.setTextColor(Color.BLACK);
            tvPreset.setTextSize(15);
            tvPreset.setGravity(Gravity.CENTER);
            tvPreset.setText("preset");
            m_PTZLayout.addView(tvPreset);

            m_spPreset = new Spinner(this);
            m_spPreset.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, iSpinnerWidth, ihdistance * 5 + itextheight * 4));
            m_PTZLayout.addView(m_spPreset);

            m_PresetList = new ArrayList<String>();
            for (int i = 0; i < 128; i++)
            {
                m_PresetList.add("Preset " + String.valueOf(i + 1));
            }
            ArrayAdapter iPresetAdapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, m_PresetList);
            iPresetAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            m_spPreset.setAdapter(iPresetAdapter);

            Button btnGotoPreset = new Button(this);
            btnGotoPreset.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, iSpinnerWidth * 2 + ihdistance, ihdistance * 5 + itextheight * 4));
            btnGotoPreset.setTextColor(Color.BLACK);
            btnGotoPreset.setTextSize(15);
            btnGotoPreset.setText("go");
            m_PTZLayout.addView(btnGotoPreset);
            btnGotoPreset.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    int ipresetindex = 0;
                    if (m_spPreset.getSelectedItemPosition() >= 0 && m_spPreset.getSelectedItemPosition() < m_PresetList.size())
                    {
                        String strpreset = m_PresetList.get(m_spPreset.getSelectedItemPosition());
                        strpreset = strpreset.substring(7, strpreset.length());
                        ipresetindex = Integer.valueOf(strpreset) - 1;
                    }
                    PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_PRESET_GO, ipresetindex);
                }
            });

            TextView tvCruise = new TextView(this);
            tvCruise.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, 0, ihdistance * 6 + itextheight * 5));
            tvCruise.setTextColor(Color.BLACK);
            tvCruise.setTextSize(15);
            tvCruise.setGravity(Gravity.CENTER);
            tvCruise.setText("cruise");

            m_PTZLayout.addView(tvCruise);

            m_spCruise = new Spinner(this);
            m_spCruise.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, iSpinnerWidth, ihdistance * 6 + itextheight * 5));
            m_PTZLayout.addView(m_spCruise);

            m_CruiseList = new ArrayList<String>();
            for (int i = 0; i < 32; i++)
            {
                m_CruiseList.add("Cruise " + String.valueOf(i + 1));
            }
            ArrayAdapter iCruiseAdapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, m_CruiseList);
            iCruiseAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            m_spCruise.setAdapter(iCruiseAdapter);

            Button btnCruiseStart = new Button(this);
            btnCruiseStart.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, iSpinnerWidth * 2 + ihdistance, ihdistance * 6 + itextheight * 5));
            btnCruiseStart.setTextColor(Color.BLACK);
            btnCruiseStart.setTextSize(15);
            btnCruiseStart.setText("run");
            m_PTZLayout.addView(btnCruiseStart);
            btnCruiseStart.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    int icruiseindex = 0;
                    if (m_spCruise.getSelectedItemPosition() >= 0 && m_spCruise.getSelectedItemPosition() < m_CruiseList.size())
                    {
                        String strcruise = m_CruiseList.get(m_spCruise.getSelectedItemPosition());
                        strcruise = strcruise.substring(7, strcruise.length());
                        icruiseindex = Integer.valueOf(strcruise) - 1;

                    }
                    PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_CRUISE_RUN, icruiseindex);
                }
            });

            Button btnCruiseStop = new Button(this);
            btnCruiseStop.setLayoutParams(new AbsoluteLayout.LayoutParams(iSpinnerWidth, itextheight, SCREENWIDTH - ihdistance - iSpinnerWidth, ihdistance * 6 + itextheight * 5));
            btnCruiseStop.setTextColor(Color.BLACK);
            btnCruiseStop.setTextSize(15);
            btnCruiseStop.setText("stop");
            m_PTZLayout.addView(btnCruiseStop);
            btnCruiseStop.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    int icruiseindex = 0;
                    if (m_spCruise.getSelectedItemPosition() >= 0 && m_spCruise.getSelectedItemPosition() < m_CruiseList.size())
                    {
                        String strcruise = m_CruiseList.get(m_spCruise.getSelectedItemPosition());
                        strcruise = strcruise.substring(7, strcruise.length());
                        icruiseindex = Integer.valueOf(strcruise) - 1;
                    }
                    PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_CRUISE_STOP, icruiseindex);
                }
            });

            final Button tvCameraType = new Button(this);
            tvCameraType.setLayoutParams(new AbsoluteLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, itextheight, 0, ihdistance * 7 + itextheight * 6));
            tvCameraType.setTextColor(Color.BLACK);
            tvCameraType.setTextSize(15);
            tvCameraType.setPadding(tvCameraType.getPaddingLeft(), 10, tvCameraType.getPaddingRight(), 10);
            tvCameraType.setGravity(Gravity.CENTER);
            tvCameraType.setText("cameraType = ? ");
            m_PTZLayout.addView(tvCameraType);
            tvCameraType.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    int cameraType = mNVRSDK.GetPTZCameraType(mUserID1);
                    tvCameraType.setText("cameraType = " + cameraType);
                    ToolCommon.toastShow(SDKLiveActivity.this, "cameraType " + cameraType);
                }
            });
        }
        else
        {
            m_PTZLayout.setVisibility(View.VISIBLE);
        }
    }

    private OnTouchListener mTouchClick = new OnTouchListener()
    {
        @Override
        public boolean onTouch(View v, MotionEvent event)
        {
            return false;
        }
    };

    private void PTZTouch(int tag, boolean isStart)
    {
        if (!isStart)
        {
            PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_STOP, -1);
            return;
        }
        switch (tag)
        {
            case UP:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_UP, -1);
                break;
            case DOWN:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_DOWN, -1);
                break;
            case LEFT:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_LEFT, -1);
                break;
            case RIGHT:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_RIGHT, -1);
                break;
            case LEFT_UP:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_LEFT_UP, -1);
                break;
            case LEFT_DOWN:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_LEFT_DOWN, -1);
                break;
            case RIGHT_UP:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_RIGHT_UP, -1);
                break;
            case RIGHT_DOWN:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_RIGHT_DOWN, -1);
                break;
            case FOCUS_ADD:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_FAR, -1);
                break;
            case FOCUS_SUB:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_NEAR, -1);
                break;
            case ZOOM_ADD:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_ZOOM_OUT, -1);
                break;
            case ZOOM_SUB:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_ZOOM_IN, -1);
                break;
            case APERTURE_ADD:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_IRIS_OPEN, -1);
                break;
            case APERTURE_SUB:
                PTZResponse(PTZ_CMD_TYPE.PTZ_CMD_IRIS_CLOSE, -1);
                break;
            default:
        }
    }

    public void PTZResponse(int iPtzCommand, int iIndex)
    {
        if (mNVRSDK != null)
        {
            int viewChannel = videoPlayer.getSelectedChannel();
            if(viewChannel<0 || viewChannel>=4){
                return;
            }

            int ispeed = 4;
            if (m_spSpeed.getSelectedItemPosition() >= 0 && m_spSpeed.getSelectedItemPosition() < m_SpeedList.size())
            {
                ispeed = Integer.valueOf(m_SpeedList.get(m_spSpeed.getSelectedItemPosition()));
            }
            if (iIndex <= -1)
            {
                boolean res = mNVRSDK.PTZControlOther(mUserID1, playInfos[viewChannel].channel, iPtzCommand, ispeed);
                ToolCommon.LOGD(TAG,"---PTZControlOther iPtzCommand = " + iPtzCommand + ",channel = " + playInfos[viewChannel].channel + ",ispeed = " + ispeed + ",res = " + res);
            }
            else
            {
                if (iPtzCommand == PTZ_CMD_TYPE.PTZ_CMD_PRESET_GO)
                {
                    boolean res = mNVRSDK.PTZPresetOther(mUserID1, playInfos[viewChannel].channel, PTZ_CMD_TYPE.PTZ_CMD_PRESET_GO, iIndex);// (mUserID, ichannelid, iIndex, ispeed);
                    ToolCommon.LOGD(TAG,"---------PTZPresetOther res = " + res);
                }
                else if (iPtzCommand == PTZ_CMD_TYPE.PTZ_CMD_CRUISE_RUN)
                {
                    boolean res = mNVRSDK.PTZCruise(playInfos[viewChannel].handle, PTZ_CMD_TYPE.PTZ_CMD_CRUISE_RUN, iIndex);
                    ToolCommon.LOGD(TAG,"--start--PTZCruise res = " + res);
                }
                else if (iPtzCommand == PTZ_CMD_TYPE.PTZ_CMD_CRUISE_STOP)
                {
                    boolean res = mNVRSDK.PTZCruise(playInfos[viewChannel].handle, PTZ_CMD_TYPE.PTZ_CMD_CRUISE_STOP, iIndex);
                    ToolCommon.LOGD(TAG,"--stop--PTZCruise res = " + res);
                }
            }

        }
    }

    public void SetupSetUI()
    {
        m_iViewType = ViewType.SetView;
        if (m_SetLayout == null)
        {
            // 紧凑版尺寸
            float density = getResources().getDisplayMetrics().density;
            int itextwidth = SCREENWIDTH / 3;
            int itextheight = (int)(40 * density); // 减小按钮高度
            int ihdistance = (int)(6 * density);   // 减小边距
            int ieditwidth = SCREENWIDTH - ihdistance * 2 - itextwidth;

            //			m_SetScrollView = new ScrollView(this);
            //			m_SetScrollView.setLayoutParams(
            //					new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT - ihdistance - itextheight - SCREENWIDTH * 2 / 3, 0, ihdistance + itextheight + SCREENWIDTH *
            // 2 / 3));
            //			m_SetScrollView.setBackgroundColor(Color.WHITE);
            //			m_LiveLayout.addView(m_SetScrollView);

            m_SetLayout = new AbsoluteLayout(this);
            m_SetLayout.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, SCREENHEIGHT, 0, ihdistance + itextheight * 2 + SCREENWIDTH * 2 / 3 + 3));
            m_SetLayout.setBackgroundColor(Color.LTGRAY);
            m_LiveLayout.addView(m_SetLayout);

            int iTopPosition = 0;
            TextView tvSDKVersion = new TextView(this);
            tvSDKVersion.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH, itextheight, 0, iTopPosition));
            tvSDKVersion.setTextColor(Color.BLACK);
            tvSDKVersion.setTextSize(15);
            tvSDKVersion.setGravity(Gravity.CENTER);
            tvSDKVersion.setText("Color Adjust(Range0-100)");
            m_SetLayout.addView(tvSDKVersion);

            iTopPosition += itextheight;
            TextView tvBright = new TextView(this);
            tvBright.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, ihdistance, iTopPosition));
            tvBright.setTextColor(Color.BLACK);
            tvBright.setTextSize(15);
            tvBright.setGravity(Gravity.CENTER_VERTICAL);
            tvBright.setText("Bright");
            m_SetLayout.addView(tvBright);

            m_etBright = new EditText(this);
            m_etBright.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, SCREENWIDTH / 2, iTopPosition));
            m_etBright.setTextColor(Color.BLACK);
            m_etBright.setTextSize(15);
            m_etBright.setText("0");
            m_SetLayout.addView(m_etBright);

            iTopPosition += itextheight + ihdistance;
            TextView tvSaturation = new TextView(this);
            tvSaturation.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, ihdistance, iTopPosition));
            tvSaturation.setTextColor(Color.BLACK);
            tvSaturation.setTextSize(15);
            tvSaturation.setGravity(Gravity.CENTER_VERTICAL);
            tvSaturation.setText("Saturation");
            m_SetLayout.addView(tvSaturation);

            m_etSaturation = new EditText(this);
            m_etSaturation.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, SCREENWIDTH / 2, iTopPosition));
            m_etSaturation.setTextColor(Color.BLACK);
            m_etSaturation.setTextSize(15);
            m_etSaturation.setText("0");
            m_SetLayout.addView(m_etSaturation);

            iTopPosition += itextheight + ihdistance;
            TextView tvContrast = new TextView(this);
            tvContrast.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, ihdistance, iTopPosition));
            tvContrast.setTextColor(Color.BLACK);
            tvContrast.setTextSize(15);
            tvContrast.setGravity(Gravity.CENTER_VERTICAL);
            tvContrast.setText("Contrast");
            m_SetLayout.addView(tvContrast);

            m_etContrast = new EditText(this);
            m_etContrast.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, SCREENWIDTH / 2, iTopPosition));
            m_etContrast.setTextColor(Color.BLACK);
            m_etContrast.setTextSize(15);
            m_etContrast.setText("0");
            m_SetLayout.addView(m_etContrast);

            iTopPosition += itextheight + ihdistance;
            TextView tvHue = new TextView(this);
            tvHue.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, ihdistance, iTopPosition));
            tvHue.setTextColor(Color.BLACK);
            tvHue.setTextSize(15);
            tvHue.setGravity(Gravity.CENTER_VERTICAL);
            tvHue.setText("Hue");
            m_SetLayout.addView(tvHue);

            m_etHue = new EditText(this);
            m_etHue.setLayoutParams(new AbsoluteLayout.LayoutParams(SCREENWIDTH / 2 - ihdistance, itextheight, SCREENWIDTH / 2, iTopPosition));
            m_etHue.setTextColor(Color.BLACK);
            m_etHue.setTextSize(15);
            m_etHue.setText("0");
            m_SetLayout.addView(m_etHue);

            iTopPosition += itextheight + ihdistance;
            Button btnGetEffect = new Button(this);
            btnGetEffect.setLayoutParams(new AbsoluteLayout.LayoutParams((SCREENWIDTH - ihdistance * 5) / 4, itextheight, ihdistance, iTopPosition));
            btnGetEffect.setTextColor(Color.BLACK);
            btnGetEffect.setTextSize(15);
            btnGetEffect.setText("Get");
            m_SetLayout.addView(btnGetEffect);
            btnGetEffect.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {

                    int viewChannel = videoPlayer.getSelectedChannel();

                    if (mNVRSDK != null && playInfos[viewChannel].channel >= 0)
                    {
                        int[] m_iVideoEffectResult = mNVRSDK.GetVideoEffect(mUserID1, playInfos[viewChannel].channel);
                        m_etBright.setText(String.valueOf(m_iVideoEffectResult[0]));
                        m_etContrast.setText(String.valueOf(m_iVideoEffectResult[1]));
                        m_etSaturation.setText(String.valueOf(m_iVideoEffectResult[2]));
                        m_etHue.setText(String.valueOf(m_iVideoEffectResult[3]));

                    }
                }
            });

            Button btnGetDefaultEffect = new Button(this);
            btnGetDefaultEffect.setLayoutParams(
                    new AbsoluteLayout.LayoutParams((SCREENWIDTH - ihdistance * 5) / 4, itextheight, ihdistance * 2 + (SCREENWIDTH - ihdistance * 5) / 4, iTopPosition));
            btnGetDefaultEffect.setTextColor(Color.BLACK);
            btnGetDefaultEffect.setTextSize(15);
            btnGetDefaultEffect.setText("Default");
            m_SetLayout.addView(btnGetDefaultEffect);
            btnGetDefaultEffect.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    int viewChannel = videoPlayer.getSelectedChannel();

                    if (mNVRSDK != null && playInfos[viewChannel].channel >= 0)
                    {
                        int[] m_iVideoEffectResult = mNVRSDK.GetDefaultVideoEffect(mUserID1);
                        m_etBright.setText(String.valueOf(m_iVideoEffectResult[0]));
                        m_etContrast.setText(String.valueOf(m_iVideoEffectResult[1]));
                        m_etSaturation.setText(String.valueOf(m_iVideoEffectResult[2]));
                        m_etHue.setText(String.valueOf(m_iVideoEffectResult[3]));

                    }
                }
            });

            Button btnSetEffect = new Button(this);
            btnSetEffect.setLayoutParams(
                    new AbsoluteLayout.LayoutParams((SCREENWIDTH - ihdistance * 5) / 4, itextheight, ihdistance * 3 + (SCREENWIDTH - ihdistance * 5) * 2 / 4, iTopPosition));
            btnSetEffect.setTextColor(Color.BLACK);
            btnSetEffect.setTextSize(15);
            btnSetEffect.setText("Set");
            m_SetLayout.addView(btnSetEffect);
            btnSetEffect.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    try
                    {
                        int viewChannel = videoPlayer.getSelectedChannel();

                        if (mNVRSDK != null && playInfos[viewChannel].channel >= 0)
                        {
                            int ibright = Integer.valueOf(m_etBright.getText().toString().trim());
                            int icontrast = Integer.valueOf(m_etContrast.getText().toString().trim());
                            int isaturation = Integer.valueOf(m_etSaturation.getText().toString().trim());
                            int ihue = Integer.valueOf(m_etHue.getText().toString().trim());

                            if (ibright >= 0 && ibright <= 255 && icontrast >= 0 && icontrast <= 255 && isaturation >= 0 && isaturation <= 255 && ihue >= 0 && ihue <= 255)
                            {
                                boolean res = mNVRSDK.SetVideoEffect(mUserID1, playInfos[viewChannel].channel, ibright, icontrast, isaturation, ihue);
                                if (res)
                                {
                                    Toast.makeText(SDKLiveActivity.this, "set success", Toast.LENGTH_SHORT).show();
                                }
                                else
                                {
                                    Toast.makeText(SDKLiveActivity.this, "set fail", Toast.LENGTH_SHORT).show();
                                }
                            }
                            else
                            {
                                Toast.makeText(SDKLiveActivity.this, "invalid data", Toast.LENGTH_SHORT).show();
                            }
                        }
                    }
                    catch (NumberFormatException e)
                    {
                        e.printStackTrace();
                    }
                }
            });

            Button btnSaveEffect = new Button(this);
            btnSaveEffect.setLayoutParams(
                    new AbsoluteLayout.LayoutParams((SCREENWIDTH - ihdistance * 5) / 4, itextheight, ihdistance * 4 + (SCREENWIDTH - ihdistance * 5) * 3 / 4, iTopPosition));
            btnSaveEffect.setTextColor(Color.BLACK);
            btnSaveEffect.setTextSize(15);
            btnSaveEffect.setText("Save");
            m_SetLayout.addView(btnSaveEffect);
            btnSaveEffect.setOnClickListener(new OnClickListener()
            {
                @Override
                public void onClick(View v)
                {
                    try
                    {
                        int viewChannel = videoPlayer.getSelectedChannel();

                        if (mNVRSDK != null && playInfos[viewChannel].channel >= 0)
                        {
                            int ibright = Integer.valueOf(m_etBright.getText().toString().trim());
                            int icontrast = Integer.valueOf(m_etContrast.getText().toString().trim());
                            int isaturation = Integer.valueOf(m_etSaturation.getText().toString().trim());
                            int ihue = Integer.valueOf(m_etHue.getText().toString().trim());

                            if (ibright >= 0 && ibright <= 255 && icontrast >= 0 && icontrast <= 255 && isaturation >= 0 && isaturation <= 255 && ihue >= 0 && ihue <= 255)
                            {
                                boolean res = mNVRSDK.SaveVideoEffect(mUserID1, playInfos[viewChannel].channel, ibright, icontrast, isaturation, ihue);
                                if (res)
                                {
                                    Toast.makeText(SDKLiveActivity.this, "Save success", Toast.LENGTH_SHORT).show();
                                }
                                else
                                {
                                    Toast.makeText(SDKLiveActivity.this, "save fail", Toast.LENGTH_SHORT).show();
                                }
                            }
                            else
                            {
                                Toast.makeText(SDKLiveActivity.this, "invalid data", Toast.LENGTH_SHORT).show();
                            }
                        }
                    }
                    catch (NumberFormatException e)
                    {
                        e.printStackTrace();
                    }
                }
            });
        }
        else
        {
            m_SetLayout.setVisibility(View.VISIBLE);
        }

    }

    @Override
    public void onRequestSingleFrameData()
    {
        // TODO Auto-generated method stub

    }

    @Override
    public void onTalkData(int byAudioFlag, int frameLen, byte[] data)
    {
        //		ToolCommon.LOGD(TAG,"-------------liveview onTalkData------------dwBufSize = " + frameLen+",byAudioFlag = "+byAudioFlag);
    }

    @Override
    public void onAudioDataFormatHead(long handle, SDKDefs.WAVEFORMATEX waveformatex) {
        // 根据liveHandle初始化对应通道的音频解码器
        for(PlayInfo playInfo: playInfos)
        {
            if (playInfo.viewChannel!=-1 && playInfo.handle == handle) {

                videoPlayer.initializeAudioDecoder(playInfo.viewChannel, waveformatex);

                // 根据当前音频状态设置播放/暂停
                if (!m_bAudioEnabled) {
                    videoPlayer.setAudioEnabled(playInfo.viewChannel, false);
                }

                ToolCommon.LOGD(TAG, "Audio decoder initialized for channel " + playInfo.viewChannel +
                        ", audio " + (m_bAudioEnabled ? "enabled" : "disabled"));
            }
        }
    }

    @Override
    public void ExceptionCallback(int dwType, int lUserID, int lHandle)
    {
        if (dwType == 1)
        {
            ToolCommon.LOGD(TAG,"-------------reconnect-----------lUserID = " + lUserID);
            mUserID1 = lUserID;
            mHandler.sendEmptyMessage(7);
        }
        else if (dwType == 0)
        {
            ToolCommon.LOGD(TAG,"-------------disconnect-----------");
            //			mVideoView1.setPermissionDenied(true);
            mHandler.sendEmptyMessage(6);
            //			CloseLiveChannel(true,true);
        }
    }

    /**
     * @param lUserID
     * @param lRegisterID
     * @param pDeviceInfo
     */
    @Override
    public void AcceptRegisterCallback(int lUserID, int lRegisterID, NET_SDK_DEVICEINFO[] pDeviceInfo) {

    }


    @Override
    public void onVideoDataFormatHead(long handle, int iEncodeType)
    {
        long time = System.currentTimeMillis();
        ToolCommon.LOGD(TAG,"-----------liveview.onVideoDataFormatHead time = " + time);
        Message msg = mHandler.obtainMessage();
        msg.what = 9;
        msg.arg1 = iEncodeType;
        msg.obj = handle;
        mHandler.sendMessage(msg);
        
        if(videoPlayer!=null) {
            String mineType = iEncodeType == VIDEO_ENCODE_TYPE_H265 ? "video/hevc" : "video/avc";
            
            // 根据handle判断应该初始化哪个通道的解码器
            for(PlayInfo playInfo: playInfos)
            {
                if (playInfo.viewChannel!=-1 && playInfo.handle == handle) {
                    videoPlayer.initializeDecoder(playInfo.viewChannel, mineType);
                    ToolCommon.LOGD(TAG, "Video format change for channel " + playInfo.viewChannel + ": " + mineType);
                }
            }
        }
    }

    @Override
    public void onPlaybackEnd()
    {
        // TODO Auto-generated method stub

    }

    @Override
    public void onAlarmTypeVFD(N900AlarmVFDContainer vfdContainer)
    {

    }

    @Override
    public void onAlarmTypeAVD(NET_SDK_IVE_AVD_T avd)
    {

    }

    @Override
    public void onAlarmTypeFaceMatch(NET_SDK_IVE_FACE_MATCH_T faceMatch)
    {

    }

    @Override
    public void onAlarmTypeFaceMatchForIPC(N900AlarmFaceIPCContainer faceMatch)
    {

    }

    @Override
    public void onAlarmASD(N9000SmartASDContainer container) {

    }

    @Override
    public void onAlarmIpcAOIENTRY(N9000SmartCommonContainer n9000SmartCommonContainer) {

    }

    @Override
    public void onAlarmNvrAOIENTRY(N9000SmartCommonContainer n9000SmartCommonContainer) {

    }

    @Override
    public void onAlarmIpcAOILEAVE(N9000SmartCommonContainer n9000SmartCommonContainer) {

    }

    @Override
    public void onAlarmNvrAOILEAVE(N9000SmartCommonContainer n9000SmartCommonContainer) {

    }

    @Override
    public void onAlarmPVD(N9000SmartCommonContainer n9000SmartCommonContainer) {

    }

    @Override
    public void onAlarmLoiter(N9000SmartCommonContainer n9000SmartCommonContainer) {

    }

    @Override
    public void onAlarmVSD(N9000SmartVSDContainer n9000SmartVSDContainer) {

    }

    public static int getKey(HashMap<Integer, String> map, String value)
    {
        int key = -1;
        for (int getKey : map.keySet())
        {
            if (map.get(getKey).equals(value))
            {
                key = getKey;
            }
        }
        return key;
    }

    public boolean RequestLive(int streamtype, int iichannel, boolean bChangeCHOnVideoView1)// 0:mainstram,1:sub stream
    {
        return false;
    }

    public boolean SetSubStreamEncodeInfo(int ichannel)
    {
        if (ichannel == 0)
        //					if (true)
        {
            if (m_EncodeInfoList != null && m_EncodeInfoList.size() > 0)
            {
                m_SubStreamResolutionList.clear();
                for (int i = 0; i < m_EncodeInfoList.size(); i++)
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem = m_EncodeInfoList.get(i);
                    String s = m_ResolutionMap.get(encodeitem.resolution);
                    m_SubStreamResolutionList.add(s);
                    ToolCommon.LOGD(TAG,"----resolution = " + s + ",ichannel = " + (ichannel + 1));
                }
                m_SubStreamResolutionList.add("Main Stream");
                //                m_SubStreamResolutionAdapter.notifyDataSetChanged();

                try
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem1 = m_EncodeInfoList.get(0);
                    encodeitem1.minBitrate = 512;// encodeitem1.bitrateRange[3];
                    encodeitem1.maxBitrate = 512;
                    boolean res = mNVRSDK.SetDVRConfigSubStreamEncodeInfo(mUserID1, ichannel, encodeitem1.serialize());
                    ToolCommon.LOGD(TAG,"----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + ",encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate);
                    Toast.makeText(SDKLiveActivity.this, "----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + "," +
                            "encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate, Toast.LENGTH_SHORT).show();
                    m_spSubStreamResolution.setSelection(0);
                    return true;
                }
                catch (Exception e)
                {
                    e.printStackTrace();
                }
            }
        }
        else if (ichannel == 1)
        {
            if (m_EncodeInfoList1 != null && m_EncodeInfoList1.size() > 0)
            {
                for (int i = 0; i < m_EncodeInfoList1.size(); i++)
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem = m_EncodeInfoList1.get(i);
                    String s = m_ResolutionMap.get(encodeitem.resolution);
                    ToolCommon.LOGD(TAG,"----resolution = " + s + ",ichannel = " + (ichannel + 1));
                }

                try
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem1 = m_EncodeInfoList1.get(0);
                    encodeitem1.minBitrate = encodeitem1.bitrateRange[3];
                    //								encodeitem1.maxBitrate = encodeitem1.rate;
                    boolean res = mNVRSDK.SetDVRConfigSubStreamEncodeInfo(mUserID1, ichannel, encodeitem1.serialize());
                    ToolCommon.LOGD(TAG,"----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + ",encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate);
                    Toast.makeText(SDKLiveActivity.this, "----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + "," +
                            "encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate, Toast.LENGTH_SHORT).show();
                    return true;
                }
                catch (Exception e)
                {
                    e.printStackTrace();
                }
            }
        }
        else if (ichannel == 2)
        {
            if (m_EncodeInfoList2 != null && m_EncodeInfoList2.size() > 0)
            {
                for (int i = 0; i < m_EncodeInfoList2.size(); i++)
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem = m_EncodeInfoList2.get(i);
                    String s = m_ResolutionMap.get(encodeitem.resolution);
                    ToolCommon.LOGD(TAG,"----resolution = " + s + ",ichannel = " + (ichannel + 1));
                }

                try
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem1 = m_EncodeInfoList2.get(0);
                    encodeitem1.minBitrate = encodeitem1.bitrateRange[3];
                    //								encodeitem1.maxBitrate = encodeitem1.rate;
                    boolean res = mNVRSDK.SetDVRConfigSubStreamEncodeInfo(mUserID1, ichannel, encodeitem1.serialize());
                    ToolCommon.LOGD(TAG,"----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + ",encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate);
                    Toast.makeText(SDKLiveActivity.this, "----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + "," +
                            "encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate, Toast.LENGTH_SHORT).show();
                    return true;
                }
                catch (Exception e)
                {
                    e.printStackTrace();
                }
            }
        }
        else if (ichannel == 3)
        {
            if (m_EncodeInfoList3 != null && m_EncodeInfoList3.size() > 0)
            {
                for (int i = 0; i < m_EncodeInfoList3.size(); i++)
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem = m_EncodeInfoList3.get(i);
                    String s = m_ResolutionMap.get(encodeitem.resolution);
                    ToolCommon.LOGD(TAG,"----resolution = " + s + ",ichannel = " + (ichannel + 1));
                }

                try
                {
                    DD_ENCODE_CONFIG_N9000_Ex encodeitem1 = m_EncodeInfoList3.get(0);
                    encodeitem1.minBitrate = encodeitem1.bitrateRange[3];
                    //								encodeitem1.maxBitrate = encodeitem1.rate;
                    boolean res = mNVRSDK.SetDVRConfigSubStreamEncodeInfo(mUserID1, ichannel, encodeitem1.serialize());
                    ToolCommon.LOGD(TAG,"----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + ",encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate);
                    Toast.makeText(SDKLiveActivity.this, "----1------SetDVRConfigSubStreamEncodeInfo res = " + res + ",channel = " + (ichannel + 1) + "," +
                            "encodeitem1.minBitrate = "
                            + encodeitem1.minBitrate, Toast.LENGTH_SHORT).show();
                    return true;
                }
                catch (Exception e)
                {
                    e.printStackTrace();
                }
            }
        }
        return false;
    }

    public void GetSubStreamEncodeInfo(int ichannel)
    {
        byte[] encodeinfodata = mNVRSDK.GetDVRConfigSubStreamEncodeInfoEx(mUserID1, ichannel);
    }

    ArrayList<DD_ENCODE_CONFIG_N9000_Ex> m_TempEncodeInfoList = null;

    public ArrayList<DD_ENCODE_CONFIG_N9000_Ex> SortByResolution(ArrayList<DD_ENCODE_CONFIG_N9000_Ex> encodeInfoList)
    {
        if (encodeInfoList != null && encodeInfoList.size() > 1)
        {
            if (m_TempEncodeInfoList == null)
            {
                m_TempEncodeInfoList = new ArrayList<DD_ENCODE_CONFIG_N9000_Ex>();
            }
            else
            {
                m_TempEncodeInfoList.clear();
            }

            //			String StrResolutions[] = new String[encodeInfoList.size()];
            int resolutions[] = new int[encodeInfoList.size()];

            for (int i = 0; i < encodeInfoList.size(); i++)
            {
                DD_ENCODE_CONFIG_N9000_Ex item = encodeInfoList.get(i);
                String strresolution = m_ResolutionMap.get(item.resolution);
                if (strresolution != null)
                {
                    int a = Integer.valueOf(strresolution.substring(0, strresolution.indexOf("x")));
                    int b = Integer.valueOf(strresolution.substring(strresolution.indexOf("x") + 1, strresolution.length()));
                    resolutions[i] = a * b;
                }
            }
            Arrays.sort(resolutions);// ,String.CASE_INSENSITIVE_ORDER
            m_TempEncodeInfoList.addAll(encodeInfoList);

            for (int i = 0; i < resolutions.length; i++)
            {
                for (int j = 0; j < m_TempEncodeInfoList.size(); j++)
                {
                    DD_ENCODE_CONFIG_N9000_Ex item = m_TempEncodeInfoList.get(j);

                    String strresolution = m_ResolutionMap.get(item.resolution);
                    if (strresolution != null)
                    {
                        int a = Integer.valueOf(strresolution.substring(0, strresolution.indexOf("x")));
                        int b = Integer.valueOf(strresolution.substring(strresolution.indexOf("x") + 1, strresolution.length()));

                        int resolution = a * b;

                        if (resolution == resolutions[i])
                        {
                            encodeInfoList.set(i, item);
                        }
                    }
                }
            }
        }
        return encodeInfoList;
    }

    boolean bfirstframe = true;
    int iframecount = 0;

   /* @Override
    public void PlayCFrameData(CFrameData iCFrameData)
    {
        if (iCFrameData == null)
        {
            //			ToolCommon.LOGD(TAG,"--------------PlayCFrameData().iCFrameData == null-----------");
            return;
        }
        if (mVideoView1 != null && iCFrameData != null)
        {
            long time = 0;
            dwLowDateTime2 = iCFrameData.dwLowDateTime;
            if (dwLowDateTime1 != 0)
            {
                time = dwLowDateTime2 - dwLowDateTime1;
                //				ToolCommon.LOGD(TAG,"-----2-------onVideoData space Time = "+time+",dwLowDateTime2 = "+dwLowDateTime2+",dwLowDateTime1 = "+dwLowDateTime1);
            }
            dwLowDateTime1 = dwLowDateTime2;

            iframecount++;
            ToolCommon.LOGD(TAG,"--------------PlayCFrameData().iCFrameData is not null-----------iCFrameData.width = " + iCFrameData.iFrameWidth + ",iCFrameData.height = "
                    + iCFrameData.iFrameHeight + ",time = " + iCFrameData.dwLowDateTime + ",encodetype = " + iCFrameData.iEncodeType + ",iskeyframe = " + iCFrameData.isKeyFrame
                    + ",GetStructSize = " + iCFrameData.GetStructSize() + ",icount = " + iframecount + ",space time = " + time + ",index = " + iCFrameData.iFrameIndex);

            if (bfirstframe)
            {
                mVideoView1.playVideoDataFormatHead(0, iCFrameData.iEncodeType);
                bfirstframe = false;
                mVideoView1.setLiveHandle(playHandle1);
                mVideoView1.start();
                mVideoView1.setChannelID(channel);
                mVideoView1.setPermissionDenied(false);
                mVideoView1.setDropState(false);
            }
            mVideoView1.playVideoData(iCFrameData);
        }
    }*/
    
    /**
     * 创建优化的按钮，确保文本完整显示（紧凑版）
     */
    private Button createOptimizedButton(String text, int width, int height, int x, int y) {
        Button button = new Button(this);
        
        // 根据文本长度动态调整按钮宽度（紧凑版）
        float textSize = getResources().getDisplayMetrics().scaledDensity * 13; // 13sp（减小1sp）
        Paint paint = new Paint();
        paint.setTextSize(textSize);
        float textWidth = paint.measureText(text);
        
        // 计算最小宽度：文本宽度 + 内边距（减小内边距）
        int minWidth = (int)(textWidth + getResources().getDisplayMetrics().density * 24); // 左右各12dp内边距（减小4dp）
        int actualWidth = Math.max(width, minWidth);
        
        // 设置布局参数
        button.setLayoutParams(new AbsoluteLayout.LayoutParams(actualWidth, height, x, y));
        
        // 设置文本样式
        button.setTextColor(Color.BLACK);
        button.setTextSize(13); // 使用13sp（减小1sp）
        button.setText(text);
        
        // 设置更紧凑的内边距
        int padding = (int)(getResources().getDisplayMetrics().density * 6); // 6dp（减小2dp）
        button.setPadding(padding, padding, padding, padding);
        
        // 设置单行显示，超出时显示省略号
        button.setSingleLine(true);
        button.setEllipsize(TextUtils.TruncateAt.END);
        
        return button;
    }
    
    /**
     * 创建优化的文本输入框（紧凑版）
     */
    private EditText createOptimizedEditText(int width, int height, int x, int y, String hint) {
        EditText editText = new EditText(this);
        
        // 设置布局参数
        editText.setLayoutParams(new AbsoluteLayout.LayoutParams(width, height, x, y));
        
        // 设置文本样式（紧凑版）
        editText.setTextColor(Color.BLACK);
        editText.setTextSize(13); // 减小到13sp
        editText.setHint(hint);
        
        // 设置更紧凑的内边距
        int padding = (int)(getResources().getDisplayMetrics().density * 6); // 减小到6dp
        editText.setPadding(padding, padding, padding, padding);
        
        return editText;
    }
    
    /**
     * 创建优化的文本视图（紧凑版）
     */
    private TextView createOptimizedTextView(String text, int width, int height, int x, int y) {
        TextView textView = new TextView(this);
        
        // 设置布局参数
        textView.setLayoutParams(new AbsoluteLayout.LayoutParams(width, height, x, y));
        
        // 设置文本样式（紧凑版）
        textView.setTextColor(Color.BLACK);
        textView.setTextSize(13); // 减小到13sp
        textView.setText(text);
        
        // 设置更紧凑的内边距
        int padding = (int)(getResources().getDisplayMetrics().density * 3); // 减小到3dp
        textView.setPadding(padding, padding, padding, padding);
        
        return textView;
    }
    
    /**
     * 创建PTZ界面的优化按钮（紧凑版）
     */
    private Button createPTZButton(String text, int width, int height, int x, int y) {
        Button button = new Button(this);
        
        // 设置布局参数
        button.setLayoutParams(new AbsoluteLayout.LayoutParams(width, height, x, y));
        
        // 设置文本样式（更紧凑）
        button.setTextColor(Color.BLACK);
        button.setTextSize(11); // PTZ按钮使用更小的字体（从12减到11）
        button.setText(text);
        
        // 设置更紧凑的内边距
        int padding = (int)(getResources().getDisplayMetrics().density * 3); // 减小到3dp
        button.setPadding(padding, padding, padding, padding);
        
        // 设置单行显示
        button.setSingleLine(true);
        button.setEllipsize(TextUtils.TruncateAt.END);
        
        return button;
    }
}
