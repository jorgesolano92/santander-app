package com.sdk.codec;

import android.media.MediaCodec;
import android.media.MediaFormat;
import android.os.Build;
import android.view.Surface;
import android.view.TextureView;
import android.graphics.SurfaceTexture;
import android.opengl.EGL14;
import android.opengl.EGLConfig;
import android.opengl.EGLContext;
import android.opengl.EGLDisplay;
import android.opengl.EGLSurface;
import android.opengl.GLES20;

import java.io.IOException;
import java.nio.ByteBuffer;
import android.media.MediaCodecInfo;
import android.media.MediaCodecList;
import com.sdk.interfance.ToolCommon;

public class VideoCodec {
    private static final String TAG = "VideoCodec";
    private MediaCodec mediaCodec;
    private volatile boolean isInputDone = false;
    private volatile boolean isOutputDone = false;
    private Thread outputThread;
    private volatile boolean shouldStop = false;
    private Surface outputSurface;
    private TextureView textureView; // 保存TextureView引用用于无缝切换
    private SurfaceTexture savedSurfaceTexture; // 保存的SurfaceTexture
    private volatile boolean isReady = false; // 标记解码器是否已准备好

    public void initDecoder(TextureView textureView, String mimeType, int width, int height) throws IOException {
        // 保存 TextureView 引用
        this.textureView = textureView;
        
        // 获取 SurfaceTexture 并创建 Surface
        SurfaceTexture surfaceTexture = textureView.getSurfaceTexture();
        if (surfaceTexture == null) {
            throw new IllegalStateException("TextureView's SurfaceTexture is not available");
        }
        
        outputSurface = new Surface(surfaceTexture);

        // 检查 Surface 是否有效
        if (outputSurface == null || !outputSurface.isValid()) {
            throw new IllegalStateException("Surface is not valid");
        }

        // 创建 MediaFormat
        MediaFormat format = MediaFormat.createVideoFormat(mimeType, width, height);

        // 检测是否在模拟器上运行
        boolean isEmulator = isRunningOnEmulator();
        ToolCommon.LOGD(TAG, isEmulator ? "Running on emulator with TextureView" : "Running on real device with TextureView");
        
        // 创建并配置 MediaCodec
        // 优先尝试使用软件解码器（在模拟器上更稳定）
        try {
            if (isEmulator) {
                // 模拟器优先使用软件解码器
                String decoderName = findSoftwareDecoder(mimeType);
                if (decoderName != null) {
                    ToolCommon.LOGD(TAG, "Using software decoder with TextureView: " + decoderName);
                    mediaCodec = MediaCodec.createByCodecName(decoderName);
                } else {
                    ToolCommon.LOGD(TAG, "Software decoder not found, using default decoder with TextureView");
                    mediaCodec = MediaCodec.createDecoderByType(mimeType);
                }
            } else {
                // 真机使用默认解码器（通常是硬件加速）
                mediaCodec = MediaCodec.createDecoderByType(mimeType);
            }
        } catch (IOException e) {
            ToolCommon.LOGD(TAG, "Failed to create preferred decoder with TextureView, trying default decoder");
            mediaCodec = MediaCodec.createDecoderByType(mimeType);
        }
        
        // 再次检查Surface是否有效
        if (outputSurface == null || !outputSurface.isValid()) {
            ToolCommon.LOGD(TAG, "Surface is invalid, cannot configure decoder");
            release(); // 确保释放已创建的MediaCodec
            throw new IllegalStateException("Surface is not valid");
        }
        
        // 检查MediaCodec是否有效
        if (mediaCodec == null) {
            ToolCommon.LOGD(TAG, "Failed to create MediaCodec with TextureView");
            throw new IllegalStateException("Failed to create MediaCodec");
        }
        
        try {
            // 配置前再次检查状态
            if (mediaCodec != null) {
                mediaCodec.configure(format, outputSurface, null, 0);
            } else {
                ToolCommon.LOGD(TAG, "MediaCodec is null, cannot configure");
                throw new IllegalStateException("MediaCodec is null");
            }
            
            // 启动前再次检查状态
            if (mediaCodec != null) {
                mediaCodec.start();
                // 等待一段时间确保MediaCodec完全进入executing状态
                // 模拟器需要更长的等待时间
                int waitTime = isEmulator ? 150 : 50;
                try {
                    Thread.sleep(waitTime); // 模拟器等待150ms，真机等待50ms
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                isReady = true; // 标记解码器已准备好
                ToolCommon.LOGD(TAG, "MediaCodec started and ready with TextureView (wait time: " + waitTime + "ms)");
            } else {
                ToolCommon.LOGD(TAG, "MediaCodec is null, cannot start");
                throw new IllegalStateException("MediaCodec is null");
            }
        } catch (IllegalArgumentException e) {
            ToolCommon.LOGD(TAG, "Failed to configure decoder with TextureView: " + e.getMessage());
            isReady = false;
            release(); // 确保释放MediaCodec
            throw e;
        } catch (IllegalStateException e) {
            ToolCommon.LOGD(TAG, "Failed to start decoder with TextureView: " + e.getMessage());
            isReady = false;
            release(); // 确保释放MediaCodec
            throw e;
        }

        // 启动输出线程
        startOutputThread();
    }

    private void startOutputThread() {
        shouldStop = false;
        outputThread = new Thread(() -> {
            MediaCodec.BufferInfo bufferInfo = new MediaCodec.BufferInfo();
            while (!shouldStop && !isOutputDone && mediaCodec != null) {
                try {
                    int index = mediaCodec.dequeueOutputBuffer(bufferInfo, 10000);
                    if (index >= 0) {
                        if ((bufferInfo.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                            isOutputDone = true;
                        }
                        // 检查Surface是否仍然有效
                        if (outputSurface != null && outputSurface.isValid() && mediaCodec != null) {
                            mediaCodec.releaseOutputBuffer(index, true);
                        } else {
                            // Surface无效时，只释放buffer但不渲染
                            mediaCodec.releaseOutputBuffer(index, false);
                        }
                    } else if (index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                        // handle if needed
                        ToolCommon.LOGD(TAG, "Output format changed");
                    } else if (index == MediaCodec.INFO_TRY_AGAIN_LATER) {
                        // 正常情况，继续循环
                    } else if (index == MediaCodec.INFO_OUTPUT_BUFFERS_CHANGED) {
                        // 输出缓冲区已更改，在较旧的Android版本中处理
                    }
                } catch (IllegalStateException e) {
                    ToolCommon.LOGD(TAG, "MediaCodec state exception: " + e.getMessage());
                    shouldStop = true;
                    break;
                } catch (Exception e) {
                    ToolCommon.LOGD(TAG, "Output thread exception: " + e.getMessage());
                    e.printStackTrace();
                    shouldStop = true;
                    break;
                }
            }
        });
        outputThread.start();
    }

    public void decode(byte[] data, long presentationTimeUs) {
        if (mediaCodec == null || isInputDone || data == null || data.length == 0) return;
        
        // 检查解码器是否已准备好
        if (!isReady) {
            // ToolCommon.LOGD(TAG, "解码器尚未准备好，跳过本次解码"); // 注释掉，避免频繁打印
            return;
        }

        try {
            // 检查MediaCodec状态
            if (mediaCodec != null) {
                int inputBufferIndex = mediaCodec.dequeueInputBuffer(10000);
                if (inputBufferIndex >= 0) {
                    ByteBuffer inputBuffer = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP)
                            ? mediaCodec.getInputBuffer(inputBufferIndex)
                            : mediaCodec.getInputBuffers()[inputBufferIndex];
                    if (inputBuffer != null) {
                        inputBuffer.clear();
                        inputBuffer.put(data);
                        mediaCodec.queueInputBuffer(inputBufferIndex, 0, data.length, presentationTimeUs, 0);
                    }
                }
            }
        } catch (IllegalStateException e) {
            ToolCommon.LOGD(TAG, "MediaCodec state exception during decoding: " + e.getMessage());
            // 检查是否是配置状态异常
            if (e.getMessage() != null && e.getMessage().contains("configure")) {
                ToolCommon.LOGD(TAG, "MediaCodec is still in configure state, please retry later");
            }
            isInputDone = true;
        } catch (Exception e) {
            ToolCommon.LOGD(TAG, "Decoding exception: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void setEndOfStream() {
        if (mediaCodec == null || !isReady) return;
        isInputDone = true;
        try {
            int inputBufferIndex = mediaCodec.dequeueInputBuffer(10000);
            if (inputBufferIndex >= 0) {
                mediaCodec.queueInputBuffer(inputBufferIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM);
            }
        } catch (IllegalStateException e) {
            ToolCommon.LOGD(TAG, "MediaCodec state exception when setting EOS: " + e.getMessage());
        } catch (Exception e) {
            ToolCommon.LOGD(TAG, "Exception when setting EOS: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void release() {
        shouldStop = true;
        isInputDone = true;
        isReady = false; // 标记解码器不再可用
        
        // 等待输出线程结束
        if (outputThread != null) {
            try {
                outputThread.join(2000); // 增加等待时间到2秒
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                ToolCommon.LOGD(TAG, "Interrupted while waiting for output thread to finish");
            }
            outputThread = null;
        }
        
        // 释放MediaCodec
        if (mediaCodec != null) {
            try {
                // 先停止解码器
                mediaCodec.stop();
            } catch (IllegalStateException e) {
                ToolCommon.LOGD(TAG, "MediaCodec state exception when stopping: " + e.getMessage());
            } catch (Exception e) {
                ToolCommon.LOGD(TAG, "Exception when stopping MediaCodec: " + e.getMessage());
                e.printStackTrace();
            }
            
            try {
                // 释放解码器资源
                mediaCodec.release();
            } catch (Exception e) {
                ToolCommon.LOGD(TAG, "Exception when releasing MediaCodec: " + e.getMessage());
                e.printStackTrace();
            }
            mediaCodec = null;
        }
        
        // MediaCodec释放后，再清空画面
        clearSurface();
        
        // 清理Surface引用
        outputSurface = null;
        textureView = null;
        savedSurfaceTexture = null;
        isOutputDone = false;
    }
    
    /**
     * 使用 OpenGL ES 清空Surface画面
     */
    private void clearSurface() {
        if (textureView == null) {
            ToolCommon.LOGD(TAG, "TextureView is null, skip clear");
            return;
        }
        
        SurfaceTexture surfaceTexture = textureView.getSurfaceTexture();
        if (surfaceTexture == null) {
            ToolCommon.LOGD(TAG, "SurfaceTexture is null, skip clear");
            return;
        }
        
        Surface surface = null;
        try {
            surface = new Surface(surfaceTexture);
            if (surface == null || !surface.isValid()) {
                ToolCommon.LOGD(TAG, "Surface is null or invalid, skip clear");
                return;
            }
            
            // 等待一小段时间确保MediaCodec完全释放Surface
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            
            EGLDisplay eglDisplay = EGL14.EGL_NO_DISPLAY;
            EGLContext eglContext = EGL14.EGL_NO_CONTEXT;
            EGLSurface eglSurface = EGL14.EGL_NO_SURFACE;
            
            try {
                // 1. 获取 EGL Display
                eglDisplay = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY);
                if (eglDisplay == EGL14.EGL_NO_DISPLAY) {
                    ToolCommon.LOGD(TAG, "Unable to get EGL14 display");
                    return;
                }
                
                // 2. 初始化 EGL
                int[] version = new int[2];
                if (!EGL14.eglInitialize(eglDisplay, version, 0, version, 1)) {
                    ToolCommon.LOGD(TAG, "Unable to initialize EGL14");
                    return;
                }
                
                // 3. 配置 EGL
                int[] attribList = {
                    EGL14.EGL_RED_SIZE, 8,
                    EGL14.EGL_GREEN_SIZE, 8,
                    EGL14.EGL_BLUE_SIZE, 8,
                    EGL14.EGL_ALPHA_SIZE, 8,
                    EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT,
                    EGL14.EGL_SURFACE_TYPE, EGL14.EGL_WINDOW_BIT,
                    EGL14.EGL_NONE
                };
                
                EGLConfig[] configs = new EGLConfig[1];
                int[] numConfigs = new int[1];
                if (!EGL14.eglChooseConfig(eglDisplay, attribList, 0, configs, 0, configs.length, numConfigs, 0)) {
                    ToolCommon.LOGD(TAG, "Unable to find RGB888+recordable ES2 EGL config");
                    return;
                }
                
                if (numConfigs[0] == 0) {
                    ToolCommon.LOGD(TAG, "No EGL configs found");
                    return;
                }
                
                // 4. 创建 EGL Context
                int[] contextAttribs = {
                    EGL14.EGL_CONTEXT_CLIENT_VERSION, 2,
                    EGL14.EGL_NONE
                };
                eglContext = EGL14.eglCreateContext(eglDisplay, configs[0], EGL14.EGL_NO_CONTEXT, contextAttribs, 0);
                if (eglContext == EGL14.EGL_NO_CONTEXT) {
                    ToolCommon.LOGD(TAG, "Failed to create EGL context");
                    return;
                }
                
                // 5. 创建 Window Surface
                int[] surfaceAttribs = {
                    EGL14.EGL_NONE
                };
                eglSurface = EGL14.eglCreateWindowSurface(eglDisplay, configs[0], surface, surfaceAttribs, 0);
                if (eglSurface == EGL14.EGL_NO_SURFACE) {
                    int error = EGL14.eglGetError();
                    ToolCommon.LOGD(TAG, "Failed to create EGL surface, error code: 0x" + Integer.toHexString(error));
                    return;
                }
                
                // 6. 绑定 Context 和 Surface
                if (!EGL14.eglMakeCurrent(eglDisplay, eglSurface, eglSurface, eglContext)) {
                    ToolCommon.LOGD(TAG, "Failed to make EGL current");
                    return;
                }
                
                // 7. 使用 OpenGL ES 清空为黑色
                GLES20.glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
                GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT);
                
                // 8. 交换缓冲区
                EGL14.eglSwapBuffers(eglDisplay, eglSurface);
                
                ToolCommon.LOGD(TAG, "Surface cleared to black using OpenGL ES");
                
            } catch (Exception e) {
                ToolCommon.LOGD(TAG, "Failed to clear surface with OpenGL ES: " + e.getMessage());
                e.printStackTrace();
            } finally {
                // 9. 清理EGL资源
                if (eglDisplay != EGL14.EGL_NO_DISPLAY) {
                    EGL14.eglMakeCurrent(eglDisplay, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT);
                    
                    if (eglSurface != EGL14.EGL_NO_SURFACE) {
                        EGL14.eglDestroySurface(eglDisplay, eglSurface);
                    }
                    
                    if (eglContext != EGL14.EGL_NO_CONTEXT) {
                        EGL14.eglDestroyContext(eglDisplay, eglContext);
                    }
                    
                    EGL14.eglTerminate(eglDisplay);
                }
            }
        } finally {
            // 10. 释放Surface对象（修复资源泄漏）
            if (surface != null) {
                surface.release();
                ToolCommon.LOGD(TAG, "Surface released");
            }
        }
    }
    
    /**
     * 检查解码器是否处于有效状态
     */
    public boolean isValid() {
        return mediaCodec != null && isReady && !shouldStop && !isOutputDone;
    }
    
    /**
     * 检查是否已完成输入
     */
    public boolean isInputDone() {
        return isInputDone;
    }
    
    /**
     * 检查是否已完成输出
     */
    public boolean isOutputDone() {
        return isOutputDone;
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
    
    /**
     * 保存当前的SurfaceTexture（用于无缝切换）
     * @return 是否保存成功
     */
    public boolean saveSurfaceTexture() {
        if (textureView == null) {
            ToolCommon.LOGD(TAG, "TextureView is null, cannot save SurfaceTexture");
            return false;
        }
        
        SurfaceTexture surfaceTexture = textureView.getSurfaceTexture();
        if (surfaceTexture == null) {
            ToolCommon.LOGD(TAG, "SurfaceTexture is null, cannot save");
            return false;
        }
        
        savedSurfaceTexture = surfaceTexture;
        ToolCommon.LOGD(TAG, "SurfaceTexture saved successfully");
        return true;
    }
    
    /**
     * 将保存的SurfaceTexture设置到新的TextureView（用于无缝切换）
     * @param newTextureView 新的TextureView
     * @return 是否设置成功
     */
    public boolean switchToTextureView(TextureView newTextureView) {
        if (newTextureView == null) {
            ToolCommon.LOGD(TAG, "New TextureView is null, cannot switch");
            return false;
        }
        
        if (savedSurfaceTexture == null) {
            ToolCommon.LOGD(TAG, "No saved SurfaceTexture available, cannot switch");
            return false;
        }
        
        try {
            // 更新TextureView引用
            this.textureView = newTextureView;
            
            // 将保存的SurfaceTexture设置到新的TextureView
            newTextureView.setSurfaceTexture(savedSurfaceTexture);
            
            // 重新创建Surface（因为Surface与特定的SurfaceTexture绑定）
            if (outputSurface != null) {
                outputSurface.release();
            }
            outputSurface = new Surface(savedSurfaceTexture);
            
            ToolCommon.LOGD(TAG, "Successfully switched to new TextureView with saved SurfaceTexture");
            return true;
        } catch (Exception e) {
            ToolCommon.LOGD(TAG, "Failed to switch to new TextureView: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
    
    
    /**
     * 获取保存的SurfaceTexture
     * @return 保存的SurfaceTexture，如果没有则返回null
     */
    public SurfaceTexture getSavedSurfaceTexture() {
        return savedSurfaceTexture;
    }
    
    /**
     * 清除保存的SurfaceTexture
     */
    public void clearSavedSurfaceTexture() {
        savedSurfaceTexture = null;
        ToolCommon.LOGD(TAG, "Saved SurfaceTexture cleared");
    }
    
    /**
     * 查找软件解码器
     */
    private String findSoftwareDecoder(String mimeType) {
        try {
            MediaCodecList codecList = new MediaCodecList(MediaCodecList.ALL_CODECS);
            MediaCodecInfo[] codecInfos = codecList.getCodecInfos();
            
            for (MediaCodecInfo codecInfo : codecInfos) {
                // 跳过编码器
                if (codecInfo.isEncoder()) {
                    continue;
                }
                
                // 检查是否支持该 mimeType
                String[] types = codecInfo.getSupportedTypes();
                for (String type : types) {
                    if (type.equalsIgnoreCase(mimeType)) {
                        String name = codecInfo.getName();
                        // 软件解码器通常包含 "OMX.google" 或 "c2.android"
                        if (name.contains("OMX.google") || name.contains("c2.android")) {
                            ToolCommon.LOGD(TAG, "Found software decoder: " + name);
                            return name;
                        }
                    }
                }
            }
        } catch (Exception e) {
            ToolCommon.LOGD(TAG, "Failed to find software decoder: " + e.getMessage());
        }
        return null;
    }
}