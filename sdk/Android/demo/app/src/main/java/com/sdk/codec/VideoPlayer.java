package com.sdk.codec;

import android.content.Context;
import android.graphics.SurfaceTexture;
import android.util.AttributeSet;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.TextureView;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.GridLayout;
import android.widget.RelativeLayout;
import android.os.Build;

import com.sdk.interfance.ToolCommon;
import com.sdk.interfance.SDKDefs.WAVEFORMATEX;


class VideoChannelState{
    String mineType;
    VideoCodec decoder;
    AudioCodec audioDecoder;
    TextureView textureView;
    RelativeLayout container;
    WAVEFORMATEX audioFormat;  // 音频格式信息
}

public class VideoPlayer extends LinearLayout {

    private static final String TAG = "VideoPlayer";

    public enum PlayMode {
        SINGLE,
        QUAD
    }
    
    /**
     * VideoPlayer 配置类
     */
    public static class Config {
        private PlayMode initialMode = PlayMode.QUAD;  // 默认四视图模式
        private boolean enableDoubleClickSwitch = true; // 默认启用双击切换
        
        public Config() {
        }
        
        /**
         * 设置初始播放模式
         */
        public Config setInitialMode(PlayMode mode) {
            this.initialMode = mode;
            return this;
        }
        
        /**
         * 设置是否启用双击切换
         */
        public Config setEnableDoubleClickSwitch(boolean enable) {
            this.enableDoubleClickSwitch = enable;
            return this;
        }
        
        public PlayMode getInitialMode() {
            return initialMode;
        }
        
        public boolean isDoubleClickSwitchEnabled() {
            return enableDoubleClickSwitch;
        }
    }

    private VideoChannelState[] channelStates = new VideoChannelState[4];
    private GridLayout quadGridLayout;
    private int selectedChannel = 0;
    private PlayMode currentMode = PlayMode.QUAD;  // 默认四视图模式
    private boolean isEmulator = false;
    private boolean enableDoubleClickSwitch = true; // 是否启用双击切换

    public VideoPlayer(Context context) {
        super(context);
        init(context, new Config());
    }

    public VideoPlayer(Context context, AttributeSet attrs) {
        super(context, attrs);
        init(context, new Config());
    }

    public VideoPlayer(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init(context, new Config());
    }
    
    /**
     * 带配置的构造函数
     */
    public VideoPlayer(Context context, Config config) {
        super(context);
        init(context, config);
    }

    private void init(Context context) {
        init(context, new Config());
    }
    
    private void init(Context context, Config config) {
        setOrientation(VERTICAL);
        
        // 检测是否在模拟器上运行
        isEmulator = isRunningOnEmulator();
        ToolCommon.LOGD(TAG, isEmulator ? "Running on emulator" : "Running on real device");
        
        // 应用配置
        this.enableDoubleClickSwitch = config.isDoubleClickSwitchEnabled();
        this.currentMode = config.getInitialMode();
        
        ToolCommon.LOGD(TAG, "VideoPlayer initialized with mode: " + currentMode + 
                        ", double-click switch: " + (enableDoubleClickSwitch ? "enabled" : "disabled"));

        // 初始化4个通道的状态
        for (int i = 0; i < 4; i++) {
            channelStates[i] = new VideoChannelState();
            channelStates[i].decoder = null;
            channelStates[i].audioDecoder = null;
            channelStates[i].textureView = null;
            channelStates[i].mineType = null;
            channelStates[i].audioFormat = null;
            channelStates[i].container = new RelativeLayout(context);
        }

        quadGridLayout = new GridLayout(context);
        quadGridLayout.setColumnCount(2);
        quadGridLayout.setRowCount(2);
        
        // 预先创建所有通道的容器和TextureView
        for (int i = 0; i < 4; i++) {
            VideoChannelState state = channelStates[i];
            
            // 确保TextureView存在
            if (state.textureView == null) {
                state.textureView = new TextureView(context);
                state.textureView.setSurfaceTextureListener(new QuadTextureCallback(i));
                
                RelativeLayout.LayoutParams inner = new RelativeLayout.LayoutParams(
                        LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT);
                int borderPadding = dpToPx(1f);
                inner.setMargins(borderPadding, borderPadding, borderPadding, borderPadding);
                state.container.addView(state.textureView, inner);
            }
            
            // 设置边框样式
            int borderColor = (i == selectedChannel) ? Color.BLUE : Color.GRAY;
            state.container.setBackground(buildBorderDrawable(borderColor, dpToPx(1f), 0f));
            
            // 添加到GridLayout
            GridLayout.LayoutParams params = new GridLayout.LayoutParams();
            params.width = 0;
            params.height = 0;
            params.columnSpec = GridLayout.spec(i % 2, 1f);
            params.rowSpec = GridLayout.spec(i / 2, 1f);
            params.setMargins(0, 0, 0, 0);
            quadGridLayout.addView(state.container, params);
        }
        
        // 添加到主布局
        addView(quadGridLayout, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));

        // 根据配置设置初始视图模式
        if (config.getInitialMode() == PlayMode.SINGLE) {
            setupSingleView(context);
        } else {
            setupQuadView(context);
        }
    }
    
    /**
     * 动态更新配置（运行时调用）
     */
    public void updateConfig(Config config) {
        this.enableDoubleClickSwitch = config.isDoubleClickSwitchEnabled();
        ToolCommon.LOGD(TAG, "Config updated, double-click switch: " + 
                        (enableDoubleClickSwitch ? "enabled" : "disabled"));
        
        // 如果需要切换模式
        if (config.getInitialMode() != this.currentMode) {
            switchPlayMode(config.getInitialMode());
        }
    }
    
    /**
     * 设置是否启用双击切换
     */
    public void setEnableDoubleClickSwitch(boolean enable) {
        this.enableDoubleClickSwitch = enable;
        ToolCommon.LOGD(TAG, "Double-click switch: " + (enable ? "enabled" : "disabled"));
    }
    
    /**
     * 获取当前是否启用双击切换
     */
    public boolean isDoubleClickSwitchEnabled() {
        return enableDoubleClickSwitch;
    }
    
    /**
     * 检测是否在模拟器上运行
     */
    private boolean isRunningOnEmulator() {
        return Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for x86")
                || Build.MANUFACTURER.contains("Genymotion")
                || (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
                || "google_sdk".equals(Build.PRODUCT)
                || Build.HARDWARE.contains("goldfish")
                || Build.HARDWARE.contains("ranchu");
    }

    private void setupSingleView(Context context) {
        currentMode = PlayMode.SINGLE;

        ToolCommon.LOGD(TAG, "Switch to single view mode, keeping decoder running");

        // 真正的无缝切换：只调整布局参数和可见性，不移除任何视图
        for (int i = 0; i < 4; i++) {
            VideoChannelState state = channelStates[i];
            
            if (i == selectedChannel) {
                // 选中的通道：移除边框，调整边距，设置为可见
                state.container.setBackground(null);
                
                // 调整TextureView边距
                RelativeLayout.LayoutParams inner = (RelativeLayout.LayoutParams) state.textureView.getLayoutParams();
                    if (inner != null) {
                    inner.setMargins(0, 0, 0, 0); // 无边框时不需要边距
                    state.textureView.setLayoutParams(inner);
                }
                
                state.container.setVisibility(View.VISIBLE);
                
                // 调整GridLayout参数，让选中的通道占满整个屏幕
                GridLayout.LayoutParams gridParams = (GridLayout.LayoutParams) state.container.getLayoutParams();
                gridParams.columnSpec = GridLayout.spec(0, 1f);
                gridParams.rowSpec = GridLayout.spec(0, 1f);
                state.container.setLayoutParams(gridParams);
                
                // 设置双击切换监听器
        if (enableDoubleClickSwitch) {
                    state.container.setOnClickListener(new View.OnClickListener() {
                private long lastClickTime = 0;
                private static final long DOUBLE_CLICK_TIME_DELTA = 300;

                @Override
                public void onClick(View v) {
                    long clickTime = System.currentTimeMillis();
                    if (clickTime - lastClickTime < DOUBLE_CLICK_TIME_DELTA) {
                        switchToQuadMode();
                    }
                    lastClickTime = clickTime;
                }
            });
        } else {
                    state.container.setOnClickListener(null);
                }
            } else {
                // 其他通道：隐藏但不移除，保持TextureView和解码器运行
                state.container.setVisibility(View.GONE);
            }
        }
        
        ToolCommon.LOGD(TAG, "Single view layout completed, decoder keeps running without interruption");
    }

    private void setupQuadView(Context context) {
        currentMode = PlayMode.QUAD;
        
        ToolCommon.LOGD(TAG, "Switch to quad view mode, keeping decoder running");

        // 真正的无缝切换：只调整布局参数和可见性，不移除任何视图
        for (int i = 0; i < 4; i++) {
            VideoChannelState state = channelStates[i];
            final int channelIndex = i;
            
            // 恢复边框样式
            int borderColor = (i == selectedChannel) ? Color.BLUE : Color.GRAY;
            state.container.setBackground(buildBorderDrawable(borderColor, dpToPx(1f), 0f));
            
            // 恢复TextureView边距
            RelativeLayout.LayoutParams inner = (RelativeLayout.LayoutParams) state.textureView.getLayoutParams();
            if (inner != null) {
                int borderPadding = dpToPx(1f);
                inner.setMargins(borderPadding, borderPadding, borderPadding, borderPadding);
                state.textureView.setLayoutParams(inner);
            }
            
            // 设置为可见
            state.container.setVisibility(View.VISIBLE);
            
            // 调整GridLayout参数，恢复四视图布局
            GridLayout.LayoutParams gridParams = (GridLayout.LayoutParams) state.container.getLayoutParams();
            gridParams.columnSpec = GridLayout.spec(i % 2, 1f);
            gridParams.rowSpec = GridLayout.spec(i / 2, 1f);
            state.container.setLayoutParams(gridParams);
            
            // 设置点击监听器
            if (enableDoubleClickSwitch) {
                // 启用双击切换：单击选中通道，双击切换到单视图
                state.container.setOnClickListener(new View.OnClickListener() {
                    private long lastClickTime = 0;
                    private static final long DOUBLE_CLICK_TIME_DELTA = 300;
                    @Override
                    public void onClick(View v) {
                        long clickTime = System.currentTimeMillis();
                        if (clickTime - lastClickTime < DOUBLE_CLICK_TIME_DELTA) {
                            switchToSingleMode();
                        } else {
                            selectChannel(channelIndex);
                        }
                        lastClickTime = clickTime;
                    }
                });
            } else {
                // 禁用双击切换：只支持单击选中通道
                state.container.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        selectChannel(channelIndex);
                    }
                });
            }
        }
        
        ToolCommon.LOGD(TAG, "Quad view layout completed, decoder keeps running without interruption");
    }

    private void selectChannel(int channel) {
        if (channel < 0 || channel >= 4) return;
        if (selectedChannel == channel) return; // 已经是选中的通道
        
        ToolCommon.LOGD(TAG, "Select channel: " + channel);
        selectedChannel = channel;
        
        if (currentMode == PlayMode.QUAD) {
            updateAllBorders();
        } else if (currentMode == PlayMode.SINGLE) {
            // 无缝切换：只重新布局，不释放解码器
            setupSingleView(getContext());
        }
    }

    private void updateAllBorders() {
        if (currentMode != PlayMode.QUAD) return;
        for (int i = 0; i < 4; i++) {
            VideoChannelState state = channelStates[i];
            int borderColor = (i == selectedChannel) ? Color.BLUE : Color.GRAY;
            state.container.setBackground(buildBorderDrawable(borderColor, dpToPx(1f), 0f));
        }
    }

    public int getSelectedChannel() {
        return selectedChannel;
    }

    private GradientDrawable buildBorderDrawable(int color, int strokeWidthPx, float cornerRadiusPx) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(Color.TRANSPARENT); // 修复：背景透明
        drawable.setStroke(strokeWidthPx, color);
        drawable.setCornerRadius(cornerRadiusPx);
        return drawable;
    }

    private int dpToPx(float dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.max(1, Math.round(dp * density));
    }


    private class QuadTextureCallback implements TextureView.SurfaceTextureListener {
        private int index;

        public QuadTextureCallback(int index) {
            this.index = index;
        }

        @Override
        public void onSurfaceTextureAvailable(SurfaceTexture surface, int width, int height) {
            // TextureView 的 SurfaceTexture 可用时，只在首次创建时初始化解码器
            // 切换视图模式时不需要重新初始化解码器，因为可以共享 SurfaceTexture
                    VideoChannelState state = channelStates[index];
            if (state != null && state.decoder == null) {
                // 只在解码器不存在时才初始化
                        if (state.mineType != null && !state.mineType.isEmpty()) {
                    ToolCommon.LOGD(TAG, "SurfaceTexture available, initializing decoder for channel: " + index);
                            initializeDecoder(index, state.mineType);
                        }
                        
                // 初始化音频解码器（如果之前已配置）
                        if (state.audioFormat != null) {
                    ToolCommon.LOGD(TAG, "SurfaceTexture available, initializing audio decoder for channel: " + index);
                            initializeAudioDecoder(index, state.audioFormat);
                }
            } else if (state != null && state.decoder != null) {
                ToolCommon.LOGD(TAG, "Decoder already exists for channel " + index + ", no need to reinitialize");
            }
        }

        @Override
        public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int width, int height) {
            // ignore
        }

        @Override
        public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) {
            // 只有在真正销毁时才释放解码器
            if (channelStates[index] != null) {
                VideoChannelState state = channelStates[index];
                if (state.decoder != null) {
                    state.decoder.release();
                    state.decoder = null;
                }
                if (state.audioDecoder != null) {
                    state.audioDecoder.release();
                    state.audioDecoder = null;
                }
            }
            return false;
        }

        @Override
        public void onSurfaceTextureUpdated(SurfaceTexture surface) {
            // ignore
        }
    }
    
    public void initializeDecoder(final int index, final String mimeType) {
        if (index < 0 || index >= 4) return;
        
        VideoChannelState state = channelStates[index];
        if (state.textureView == null) return;
        try {
            if(state.decoder != null){
                state.decoder.release();
                state.decoder = null;
            }
            state.mineType = mimeType;
            state.decoder = new VideoCodec();
            state.decoder.initDecoder(state.textureView, mimeType, 400, 300);
            ToolCommon.LOGD(TAG, "Decoder initialized successfully with TextureView, channel: " + index);

        } catch (Exception e) {
            ToolCommon.LOGD(TAG, "Decoder initialization failed, channel: " + index + ", error: " + e.getMessage());
            e.printStackTrace();
            state.decoder = null;
        }
    }

    /**
     * 初始化音频解码器
     */
    public void initializeAudioDecoder(int index, WAVEFORMATEX audioFormat) {
        if (index < 0 || index >= 4) return;
        
        VideoChannelState state = channelStates[index];
        if (audioFormat == null) {
            ToolCommon.LOGD(TAG, "Audio format is null, cannot initialize audio decoder for channel: " + index);
            return;
        }
        
        try {
            // 释放旧的音频解码器
            if (state.audioDecoder != null) {
                state.audioDecoder.release();
                state.audioDecoder = null;
            }
            
            // 保存音频格式信息
            state.audioFormat = audioFormat;
            
            // 创建并初始化新的音频解码器
            state.audioDecoder = new AudioCodec();
            state.audioDecoder.initDecoder(audioFormat);
            
            ToolCommon.LOGD(TAG, "Audio decoder initialized successfully, channel: " + index + 
                           ", format: " + AudioCodec.getFormatDescription(audioFormat));
            
        } catch (Exception e) {
            ToolCommon.LOGD(TAG, "Audio decoder initialization failed, channel: " + index + ", error: " + e.getMessage());
            e.printStackTrace();
            state.audioDecoder = null;
        }
    }

    public void closeChannel(int index) {
        if (index >= 0 && index < 4 && channelStates[index] != null) {
            VideoChannelState state = channelStates[index];
            // 释放视频解码器
            if (state.decoder != null) {
                state.decoder.release();
                state.decoder = null;
            }
            // 释放音频解码器
            if (state.audioDecoder != null) {
                state.audioDecoder.release();
                state.audioDecoder = null;
            }
        }
    }

    public void closeAllChannel() {
        for (int i = 0; i < 4; i++) {
            closeChannel(i);
        }
    }

    // ====== Public API ======

    public void switchPlayMode(PlayMode mode) {
        if (currentMode == mode) return;
        
        ToolCommon.LOGD(TAG, "Start seamless mode switch, from " + currentMode + " to " + mode);
        
        // 直接切换布局，不释放解码器，实现无缝切换
        // TextureView 的 SurfaceTexture 可以在不同视图之间共享，无需重新初始化解码器
        if (mode == PlayMode.SINGLE) {
            setupSingleView(getContext());
        } else {
            setupQuadView(getContext());
        }
        
        ToolCommon.LOGD(TAG, "Mode switch completed, decoder continues running without reinitialization");
    }

    public PlayMode getCurrentMode() {
        return currentMode;
    }

    public void decode(byte[] data, long presentationTimeUs) {
        // 在任何模式下都解码到当前选中的通道
        VideoCodec decoder = channelStates[selectedChannel].decoder;
        if (decoder != null) {
            decoder.decode(data, presentationTimeUs);
        }
    }

    public void decodeToChannel(int channel, byte[] data, long presentationTimeUs) {
        if (channel < 0 || channel >= 4) return;
        VideoCodec decoder = channelStates[channel].decoder;
        if (decoder != null) {
            decoder.decode(data, presentationTimeUs);
        }
    }

    /**
     * 解码音频数据到指定通道
     */
    public void decodeAudioToChannel(int channel, byte[] audioData, long presentationTimeUs) {
        if (channel < 0 || channel >= 4) return;
        
        VideoChannelState state = channelStates[channel];
        if (state.audioDecoder != null && audioData != null && audioData.length > 0) {
            try {
                state.audioDecoder.decode(audioData, presentationTimeUs);
            } catch (Exception e) {
                ToolCommon.LOGD(TAG, "Audio decode failed for channel: " + channel + ", error: " + e.getMessage());
            }
        }
    }

    /**
     * 解码音频数据到当前选中通道（所有视图模式下都支持）
     */
    public void decodeAudio(byte[] audioData, long presentationTimeUs) {
        // 在任何模式下都播放选中通道的音频
        decodeAudioToChannel(selectedChannel, audioData, presentationTimeUs);
    }
    
    /**
     * 设置指定通道的音频开启/关闭状态
     * @param channel 通道索引
     * @param enabled true=开启音频，false=关闭音频
     */
    public void setAudioEnabled(int channel, boolean enabled) {
        if (channel < 0 || channel >= 4) {
            ToolCommon.LOGD(TAG, "Invalid channel index: " + channel);
            return;
        }
        
        VideoChannelState state = channelStates[channel];
        if (state == null) {
            ToolCommon.LOGD(TAG, "Channel state is null for index: " + channel);
            return;
        }
        
        if (state.audioDecoder == null) {
            ToolCommon.LOGD(TAG, "Audio decoder not initialized for channel: " + channel);
            return;
        }
        
        try {
            if (enabled) {
                state.audioDecoder.resumeAudio();
                ToolCommon.LOGD(TAG, "Audio enabled for channel: " + channel);
            } else {
                state.audioDecoder.pauseAudio();
                ToolCommon.LOGD(TAG, "Audio disabled for channel: " + channel);
            }
        } catch (Exception e) {
            ToolCommon.LOGD(TAG, "Failed to set audio state for channel " + channel + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * 获取指定通道的音频开启状态
     * @param channel 通道索引
     * @return true=音频已开启，false=音频已关闭
     */
    public boolean isAudioEnabled(int channel) {
        if (channel < 0 || channel >= 4) {
            return false;
        }
        
        VideoChannelState state = channelStates[channel];
        if (state == null || state.audioDecoder == null) {
            return false;
        }
        
        return state.audioDecoder.isPlaying();
    }


    public void setEndOfStream() {
        for (int i = 0; i < 4; i++) {
            if (channelStates[i] != null) {
                VideoChannelState state = channelStates[i];
                if (state.decoder != null) {
                    state.decoder.setEndOfStream();
                }
                if (state.audioDecoder != null) {
                    state.audioDecoder.setEndOfStream();
                }
            }
        }
    }

    public void release() {
        closeAllChannel();
    }

    public void switchToSingleMode() {
        switchPlayMode(PlayMode.SINGLE);
    }

    public void switchToQuadMode() {
        switchPlayMode(PlayMode.QUAD);
    }

    /**
     * 确保TextureView已创建并准备就绪
     * @param channelIndex 通道索引
     * @return 是否准备成功
     */
    public boolean ensureTextureViewReady(int channelIndex) {
        if (channelIndex < 0 || channelIndex >= 4) {
            ToolCommon.LOGD(TAG, "Invalid channel index: " + channelIndex);
            return false;
        }
        
        VideoChannelState state = channelStates[channelIndex];
        if (state == null) {
            ToolCommon.LOGD(TAG, "Channel state is null for index: " + channelIndex);
            return false;
        }
        
        // 如果TextureView已存在，直接返回
        if (state.textureView != null) {
            ToolCommon.LOGD(TAG, "Channel " + channelIndex + " already has TextureView");
            return true;
        }
        
        ToolCommon.LOGD(TAG, "Creating TextureView for channel " + channelIndex);
        
        try {
            // 创建TextureView
            TextureView newTextureView = new TextureView(getContext());
            
            // 设置布局参数
            RelativeLayout.LayoutParams layoutParams = new RelativeLayout.LayoutParams(
                LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT);
            int borderPadding = dpToPx(1f);
            layoutParams.setMargins(borderPadding, borderPadding, borderPadding, borderPadding);
            
            // 添加到容器
            state.container.addView(newTextureView, layoutParams);
            
            // 设置SurfaceTexture监听器
            newTextureView.setSurfaceTextureListener(new TextureView.SurfaceTextureListener() {
                @Override
                public void onSurfaceTextureAvailable(SurfaceTexture surface, int width, int height) {
                    // 保存TextureView引用
                    state.textureView = newTextureView;
                    
                    // 如果已有解码器配置且解码器不存在，才初始化解码器
                    if (state.mineType != null && !state.mineType.isEmpty() && state.decoder == null) {
                        initializeDecoder(channelIndex, state.mineType);
                    }
                    
                    ToolCommon.LOGD(TAG, "TextureView created and ready for channel " + channelIndex);
                }
                
                @Override
                public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int width, int height) {
                    // 忽略
                }
                
                @Override
                public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) {
                    return false;
                }
                
                @Override
                public void onSurfaceTextureUpdated(SurfaceTexture surface) {
                    // 忽略
                }
            });
            
            return true;
        } catch (Exception e) {
            ToolCommon.LOGD(TAG, "Failed to create TextureView: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
    
    /**
     * 无缝切换TextureView到另一个视图
     * @param fromChannel 源通道
     * @param toChannel 目标通道
     * @return 是否切换成功
     */
    public boolean seamlessSwitchTextureView(int fromChannel, int toChannel) {
        if (fromChannel < 0 || fromChannel >= 4 || toChannel < 0 || toChannel >= 4) {
            ToolCommon.LOGD(TAG, "Invalid channel indices: from=" + fromChannel + ", to=" + toChannel);
            return false;
        }
        
        if (fromChannel == toChannel) {
            ToolCommon.LOGD(TAG, "Source and target channels are the same");
            return true;
        }
        
        VideoChannelState fromState = channelStates[fromChannel];
        VideoChannelState toState = channelStates[toChannel];
        
        if (fromState == null || toState == null) {
            ToolCommon.LOGD(TAG, "Channel states are null");
            return false;
        }
        
        // 确保源通道有TextureView和解码器
        if (fromState.textureView == null || fromState.decoder == null) {
            ToolCommon.LOGD(TAG, "Source channel has no TextureView or decoder is null");
            return false;
        }
        
        ToolCommon.LOGD(TAG, "Starting seamless TextureView switch from channel " + fromChannel + " to " + toChannel);
        
        try {
            // 1. 保存解码器的SurfaceTexture
            if (!fromState.decoder.saveSurfaceTexture()) {
                ToolCommon.LOGD(TAG, "Failed to save SurfaceTexture from source channel");
                return false;
            }
            
            // 2. 创建新的TextureView
            TextureView newTextureView = new TextureView(getContext());
            
            // 3. 设置布局参数
            RelativeLayout.LayoutParams layoutParams = new RelativeLayout.LayoutParams(
                LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT);
            int borderPadding = dpToPx(1f);
            layoutParams.setMargins(borderPadding, borderPadding, borderPadding, borderPadding);
            
            // 4. 添加到目标容器
            toState.container.addView(newTextureView, layoutParams);
            
            // 5. 等待TextureView准备就绪，然后切换解码器
            newTextureView.setSurfaceTextureListener(new TextureView.SurfaceTextureListener() {
                @Override
                public void onSurfaceTextureAvailable(SurfaceTexture surface, int width, int height) {
                    try {
                        // 切换到新的TextureView
                        if (fromState.decoder.switchToTextureView(newTextureView)) {
                            // 更新目标通道状态
                            toState.textureView = newTextureView;
                            toState.decoder = fromState.decoder;
                            toState.mineType = fromState.mineType;
                            toState.audioDecoder = fromState.audioDecoder;
                            toState.audioFormat = fromState.audioFormat;
                            
                            // 清除源通道状态（但保留解码器引用）
                            fromState.textureView = null;
                            
                            ToolCommon.LOGD(TAG, "Seamless TextureView switch completed successfully");
                        } else {
                            ToolCommon.LOGD(TAG, "Failed to switch decoder to new TextureView");
                        }
                    } catch (Exception e) {
                        ToolCommon.LOGD(TAG, "Exception during TextureView switch: " + e.getMessage());
                        e.printStackTrace();
                    }
                }
                
                @Override
                public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int width, int height) {
                    // 忽略
                }
                
                @Override
                public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) {
                    return false;
                }
                
                @Override
                public void onSurfaceTextureUpdated(SurfaceTexture surface) {
                    // 忽略
                }
            });
            
            return true;
        } catch (Exception e) {
            ToolCommon.LOGD(TAG, "Exception during seamless TextureView switch: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }


    /**
     * 获取指定通道的TextureView
     * @param channel 通道索引
     * @return TextureView，如果没有则返回null
     */
    public TextureView getChannelTextureView(int channel) {
        if (channel >= 0 && channel < 4) {
            return channelStates[channel].textureView;
        }
        return null;
    }
    
    /**
     * 检查指定通道是否有TextureView
     * @param channel 通道索引
     * @return 是否有TextureView
     */
    public boolean hasTextureView(int channel) {
        if (channel >= 0 && channel < 4) {
            return channelStates[channel].textureView != null;
        }
        return false;
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        release();
    }
}