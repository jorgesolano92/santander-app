package com.sdk.codec;

import android.content.Context;
import com.sdk.interfance.ToolCommon;

/**
 * VideoPlayer无缝切换功能使用示例
 * 展示如何使用TextureView实现视频流无缝切换
 */
public class VideoPlayerUsageExample {
    private static final String TAG = "VideoPlayerUsageExample";
    
    private VideoPlayer videoPlayer;
    private Context context;
    
    public VideoPlayerUsageExample(Context context) {
        this.context = context;
        initializeVideoPlayer();
    }
    
    /**
     * 初始化VideoPlayer
     */
    private void initializeVideoPlayer() {
        // 创建VideoPlayer配置
        VideoPlayer.Config config = new VideoPlayer.Config()
            .setInitialMode(VideoPlayer.PlayMode.QUAD)  // 初始四视图模式
            .setEnableDoubleClickSwitch(true);          // 启用双击切换
        
        // 创建VideoPlayer实例
        videoPlayer = new VideoPlayer(context, config);
        
        ToolCommon.LOGD(TAG, "VideoPlayer initialized with seamless switching capability");
    }
    
    /**
     * 示例：初始化视频解码器
     */
    public void initializeVideoDecoders() {
        // 初始化4个通道的视频解码器
        for (int i = 0; i < 4; i++) {
            videoPlayer.initializeDecoder(i, "video/avc"); // H.264视频格式
            ToolCommon.LOGD(TAG, "Video decoder initialized for channel " + i);
        }
    }
    
    /**
     * 示例：确保TextureView准备就绪
     */
    public void ensureTextureViewReady() {
        // 确保选中的通道有TextureView
        int selectedChannel = videoPlayer.getSelectedChannel();
        
        if (videoPlayer.ensureTextureViewReady(selectedChannel)) {
            ToolCommon.LOGD(TAG, "Successfully ensured TextureView ready for channel " + selectedChannel);
        } else {
            ToolCommon.LOGD(TAG, "Failed to ensure TextureView ready for channel " + selectedChannel);
        }
    }
    
    /**
     * 示例：无缝切换视频流到另一个通道
     */
    public void seamlessSwitchVideoStream() {
        int fromChannel = videoPlayer.getSelectedChannel();
        int toChannel = (fromChannel + 1) % 4; // 切换到下一个通道
        
        ToolCommon.LOGD(TAG, "Attempting seamless switch from channel " + fromChannel + " to channel " + toChannel);
        
        // 确保源通道有TextureView
        if (!videoPlayer.hasTextureView(fromChannel)) {
            if (!videoPlayer.ensureTextureViewReady(fromChannel)) {
                ToolCommon.LOGD(TAG, "Failed to ensure TextureView ready for source channel");
                return;
            }
        }
        
        // 执行无缝切换
        if (videoPlayer.seamlessSwitchTextureView(fromChannel, toChannel)) {
            // 更新选中通道
            // 注意：这里需要根据实际的通道选择逻辑来更新
            ToolCommon.LOGD(TAG, "Seamless switch completed successfully");
        } else {
            ToolCommon.LOGD(TAG, "Seamless switch failed");
        }
    }
    
    /**
     * 示例：播放模式切换
     */
    public void switchPlayMode() {
        VideoPlayer.PlayMode currentMode = videoPlayer.getCurrentMode();
        
        if (currentMode == VideoPlayer.PlayMode.QUAD) {
            // 切换到单视图模式
            videoPlayer.switchToSingleMode();
            ToolCommon.LOGD(TAG, "Switched to single view mode");
        } else {
            // 切换到四视图模式
            videoPlayer.switchToQuadMode();
            ToolCommon.LOGD(TAG, "Switched to quad view mode");
        }
    }
    
    /**
     * 示例：解码视频数据
     */
    public void decodeVideoData(byte[] videoData, long presentationTimeUs) {
        // 解码到当前选中通道
        videoPlayer.decode(videoData, presentationTimeUs);
    }
    
    /**
     * 示例：解码到指定通道
     */
    public void decodeVideoDataToChannel(int channel, byte[] videoData, long presentationTimeUs) {
        videoPlayer.decodeToChannel(channel, videoData, presentationTimeUs);
    }
    
    /**
     * 示例：获取VideoPlayer实例
     */
    public VideoPlayer getVideoPlayer() {
        return videoPlayer;
    }
    
    /**
     * 示例：释放资源
     */
    public void release() {
        if (videoPlayer != null) {
            videoPlayer.release();
            videoPlayer = null;
        }
        ToolCommon.LOGD(TAG, "VideoPlayer resources released");
    }
    
    /**
     * 完整的使用流程示例
     */
    public void completeUsageExample() {
        ToolCommon.LOGD(TAG, "=== Complete Usage Example ===");
        
        // 1. 初始化
        initializeVideoDecoders();
        
        // 2. 确保TextureView准备就绪（实现无缝切换的前提）
        ensureTextureViewReady();
        
        // 3. 模拟视频数据解码
        byte[] sampleVideoData = new byte[1024]; // 示例数据
        decodeVideoData(sampleVideoData, System.nanoTime() / 1000);
        
        // 4. 执行无缝切换
        seamlessSwitchVideoStream();
        
        // 5. 切换播放模式
        switchPlayMode();
        
        ToolCommon.LOGD(TAG, "=== Complete Usage Example Finished ===");
    }
}
