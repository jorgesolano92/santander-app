package com.sdk.codec;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.media.MediaCodec;
import android.media.MediaFormat;
import android.os.Build;
import android.media.MediaCodecInfo;
import android.media.MediaCodecList;

import java.io.IOException;
import java.nio.ByteBuffer;
import com.sdk.interfance.ToolCommon;
import com.sdk.interfance.SDKDefs.WAVEFORMATEX;
import com.sdk.interfance.MyUtil;

// 音频格式常量定义
interface AudioFormatConstants {
    int WAVE_FORMAT_PCM = 0x0001;
    int WAVE_FORMAT_ALAW = 0x0006;    // G711 A-law
    int WAVE_FORMAT_MULAW = 0x0007;   // G711 μ-law  
    int WAVE_FORMAT_DVI_ADPCM = 0x0011; // DVI ADPCM (also covers IMA ADPCM)
    int WAVE_FORMAT_G726_ADPCM = 0x0064; // G726 ADPCM
}

public class AudioCodec {
    private static final String TAG = "AudioCodec";
    private MediaCodec mediaCodec;
    private AudioTrack audioTrack;
    private volatile boolean isInputDone = false;
    private volatile boolean isOutputDone = false;
    private Thread outputThread;
    private volatile boolean shouldStop = false;
    private volatile boolean isReady = false; // 标记解码器是否已准备好
    
    // 音频参数
    private int sampleRate = 44100; // 默认采样率
    private int channelCount = 2; // 默认声道数
    private int channelMask = AudioFormat.CHANNEL_OUT_STEREO;
    private int audioFormat = AudioFormat.ENCODING_PCM_16BIT;
    private int audioFormatTag = 0; // 存储音频格式标识

    /**
     * 根据WAVEFORMATEX初始化解码器（推荐方式）
     */
    public void initDecoder(WAVEFORMATEX waveFormat) throws IOException {
        if (waveFormat == null) {
            throw new IllegalArgumentException("WAVEFORMATEX cannot be null");
        }
        
        this.audioFormatTag = waveFormat.wFormatTag;
        this.sampleRate = waveFormat.nSamplesPerSec;
        this.channelCount = getChannelCountFromWAVEFORMATEX(waveFormat);
        this.channelMask = channelCount == 1 ? AudioFormat.CHANNEL_OUT_MONO : AudioFormat.CHANNEL_OUT_STEREO;
        
        ToolCommon.LOGD(TAG, "Initializing from WAVEFORMATEX - FormatTag: " + audioFormatTag + 
                        ", SampleRate: " + sampleRate + ", Channels: " + channelCount);
        
        String mimeType = getMimeTypeFromFormatTag(audioFormatTag);
        initDecoderInternal(mimeType);
    }

    /**
     * 根据wFormatTag初始化解码器
     */
    public void initDecoder(int wFormatTag, int sampleRate, int channelCount) throws IOException {
        this.audioFormatTag = wFormatTag;
        this.sampleRate = sampleRate;
        this.channelCount = channelCount;
        this.channelMask = channelCount == 1 ? AudioFormat.CHANNEL_OUT_MONO : AudioFormat.CHANNEL_OUT_STEREO;
        
        String mimeType = getMimeTypeFromFormatTag(wFormatTag);
        initDecoderInternal(mimeType);
    }

    /**
     * 根据MIME类型初始化解码器
     */
    public void initDecoder(String mimeType, int sampleRate, int channelCount) throws IOException {
        this.sampleRate = sampleRate;
        this.channelCount = channelCount;
        this.channelMask = channelCount == 1 ? AudioFormat.CHANNEL_OUT_MONO : AudioFormat.CHANNEL_OUT_STEREO;
        initDecoderInternal(mimeType);
    }
    
    /**
     * 内部初始化解码器方法
     */
    private void initDecoderInternal(String mimeType) throws IOException {
        
        ToolCommon.LOGD(TAG, "Initializing audio decoder, mimeType: " + mimeType + 
                        ", sampleRate: " + sampleRate + ", channelCount: " + channelCount);

        // 首先检查是否需要使用原生解码器
        if (!isNativeFormatSupported(mimeType)) {
            // 对于不支持的格式（G711, G726等），直接使用原生解码
            ToolCommon.LOGD(TAG, "Format " + mimeType + " not supported by MediaCodec, using fallback decoder");
            
            // 初始化AudioTrack
            initAudioTrack();
            
            // 初始化原生解码器
            initFallbackDecoder();
            return;
        }

        // 创建 MediaFormat
        MediaFormat format = MediaFormat.createAudioFormat(mimeType, sampleRate, channelCount);
        
        // 创建并配置 MediaCodec
        try {
            // 优先尝试使用硬件解码器
            String decoderName = findHardwareDecoder(mimeType);
            if (decoderName != null) {
                ToolCommon.LOGD(TAG, "Using hardware decoder: " + decoderName);
                mediaCodec = MediaCodec.createByCodecName(decoderName);
            } else {
                ToolCommon.LOGD(TAG, "Hardware decoder not found, using default decoder");
                mediaCodec = MediaCodec.createDecoderByType(mimeType);
            }
        } catch (IOException e) {
            ToolCommon.LOGD(TAG, "Failed to create preferred decoder, trying default decoder");
            mediaCodec = MediaCodec.createDecoderByType(mimeType);
        }
        
        // 检查MediaCodec是否有效
        if (mediaCodec == null) {
            ToolCommon.LOGD(TAG, "Failed to create MediaCodec");
            throw new IllegalStateException("Failed to create MediaCodec");
        }
        
        try {
            // 配置解码器，不需要Surface（音频不需要Surface）
            mediaCodec.configure(format, null, null, 0);
            mediaCodec.start();
            
            // 等待一段时间确保MediaCodec完全进入executing状态
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            
            isReady = true; // 标记解码器已准备好
            ToolCommon.LOGD(TAG, "Audio MediaCodec started and ready");
            
        } catch (IllegalArgumentException e) {
            ToolCommon.LOGD(TAG, "Failed to configure decoder: " + e.getMessage());
            isReady = false;
            release();
            throw e;
        } catch (IllegalStateException e) {
            ToolCommon.LOGD(TAG, "Failed to start decoder: " + e.getMessage());
            isReady = false;
            release();
            throw e;
        }

        // 初始化AudioTrack
        initAudioTrack();
        
        // 启动输出线程
        startOutputThread();
    }

    /**
     * 检查是否为原生支持的格式
     */
    private boolean isNativeFormatSupported(String mimeType) {
        // G711 A-law和μ-law通常不被MediaCodec直接支持
        return !mimeType.equals("audio/g711-alaw") && 
               !mimeType.equals("audio/g711-mlaw") && 
               !mimeType.equals("audio/g726") && 
               !mimeType.equals("audio/adpcm");
    }

    /**
     * 根据wFormatTag获取MIME类型
     */
    private String getMimeTypeFromFormatTag(int wFormatTag) {
        switch (wFormatTag) {
            case AudioFormatConstants.WAVE_FORMAT_ALAW:
                return "audio/g711-alaw";
            case AudioFormatConstants.WAVE_FORMAT_MULAW:
                return "audio/g711-mlaw";
            case AudioFormatConstants.WAVE_FORMAT_G726_ADPCM:
                return "audio/g726";
            case AudioFormatConstants.WAVE_FORMAT_DVI_ADPCM:
                return "audio/adpcm";
            case AudioFormatConstants.WAVE_FORMAT_PCM:
                return "audio/raw";
            default:
                ToolCommon.LOGD(TAG, "Unknown format tag: " + wFormatTag + ", using raw audio");
                return "audio/raw";
        }
    }

    /**
     * 初始化备用解码器（用于不支持MediaCodec的格式）
     */
    private void initFallbackDecoder() {
        // 对于G711、G726、ADPCM等格式，这里应该调用JNI方法来使用原生解码器
        // 现在先初始化为默认状态
        isReady = true;
        ToolCommon.LOGD(TAG, "Fallback decoder initialized for format tag: " + audioFormatTag);
    }

    /**
     * 从WAVEFORMATEX中提取声道数
     */
    private int getChannelCountFromWAVEFORMATEX(WAVEFORMATEX waveFormat) {
        if (waveFormat.nChannels == null || waveFormat.nChannels.length < 2) {
            return 1; // 默认单声道
        }
        
        MyUtil util = new MyUtil();
        return util.bytes2short(waveFormat.nChannels);
    }

    /**
     * 从WAVEFORMATEX中提取比特率
     */
    private int getBitsPerSampleFromWAVEFORMATEX(WAVEFORMATEX waveFormat) {
        if (waveFormat.wBitsPerSample == null || waveFormat.wBitsPerSample.length < 2) {
            return 16; // 默认16位
        }
        
        MyUtil util = new MyUtil();
        return util.bytes2short(waveFormat.wBitsPerSample);
    }

    private void initAudioTrack() {
        int bufferSize = AudioTrack.getMinBufferSize(sampleRate, channelMask, audioFormat);
        ToolCommon.LOGD(TAG, "AudioTrack buffer size: " + bufferSize);
        
        // 计算合适的缓冲区大小，通常取最小缓冲区的4倍
        int actualBufferSize = Math.max(bufferSize * 4, 16 * 1024);
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MOVIE)
                        .build();
                
                AudioFormat format = new AudioFormat.Builder()
                        .setSampleRate(sampleRate)
                        .setEncoding(audioFormat)
                        .setChannelMask(channelMask)
                        .build();
                
                audioTrack = new AudioTrack.Builder()
                        .setAudioAttributes(attributes)
                        .setAudioFormat(format)
                        .setBufferSizeInBytes(actualBufferSize)
                        .build();
            } else {
                audioTrack = new AudioTrack(
                        AudioManager.STREAM_MUSIC,
                        sampleRate,
                        channelMask,
                        audioFormat,
                        actualBufferSize,
                        AudioTrack.MODE_STREAM
                );
            }
            
            if (audioTrack.getState() == AudioTrack.STATE_INITIALIZED) {
                ToolCommon.LOGD(TAG, "AudioTrack initialized successfully");
            } else {
                ToolCommon.LOGD(TAG, "AudioTrack initialization failed");
                audioTrack = null;
            }
        } catch (Exception e) {
            ToolCommon.LOGD(TAG, "Failed to create AudioTrack: " + e.getMessage());
            e.printStackTrace();
            audioTrack = null;
        }
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
                        
                        // 获取解码后的音频数据
                        ByteBuffer outputBuffer = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP)
                                ? mediaCodec.getOutputBuffer(index)
                                : mediaCodec.getOutputBuffers()[index];
                        
                        if (outputBuffer != null && audioTrack != null && audioTrack.getState() == AudioTrack.STATE_INITIALIZED) {
                            // 将解码后的PCM数据写入AudioTrack播放
                            byte[] audioData = new byte[bufferInfo.size];
                            outputBuffer.position(bufferInfo.offset);
                            outputBuffer.get(audioData, 0, bufferInfo.size);
                            
                            // 如果AudioTrack还没有开始播放，则启动播放
                            if (audioTrack.getPlayState() != AudioTrack.PLAYSTATE_PLAYING) {
                                audioTrack.play();
                            }
                            
                            // 写入音频数据
                            int bytesWritten = audioTrack.write(audioData, 0, audioData.length);
                            if (bytesWritten < 0) {
                                ToolCommon.LOGD(TAG, "Error writing audio data: " + bytesWritten);
                            }
                        }
                        
                        // 释放输出缓冲区
                        mediaCodec.releaseOutputBuffer(index, false);
                    } else if (index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                        MediaFormat newFormat = mediaCodec.getOutputFormat();
                        ToolCommon.LOGD(TAG, "Output format changed: " + newFormat);
                        
                        // 根据新的格式更新音频参数
                        if (newFormat.containsKey(MediaFormat.KEY_SAMPLE_RATE)) {
                            int newSampleRate = newFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE);
                            if (newSampleRate != sampleRate) {
                                ToolCommon.LOGD(TAG, "Sample rate changed from " + sampleRate + " to " + newSampleRate);
                                sampleRate = newSampleRate;
                                // 重新初始化AudioTrack
                                releaseAudioTrack();
                                initAudioTrack();
                            }
                        }
                        
                        if (newFormat.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) {
                            int newChannelCount = newFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
                            if (newChannelCount != channelCount) {
                                ToolCommon.LOGD(TAG, "Channel count changed from " + channelCount + " to " + newChannelCount);
                                channelCount = newChannelCount;
                                channelMask = channelCount == 1 ? AudioFormat.CHANNEL_OUT_MONO : AudioFormat.CHANNEL_OUT_STEREO;
                                // 重新初始化AudioTrack
                                releaseAudioTrack();
                                initAudioTrack();
                            }
                        }
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
        if (isInputDone || data == null || data.length == 0) return;
        
        // 检查解码器是否已准备好
        if (!isReady) {
            return;
        }

        // 如果使用原生解码器（G711、G726、ADPCM）
        if (mediaCodec == null && isNativeFormatRequired()) {
            decodeNative(data, presentationTimeUs);
            return;
        }

        // 使用MediaCodec解码
        if (mediaCodec != null) {
            try {
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
            } catch (IllegalStateException e) {
                ToolCommon.LOGD(TAG, "MediaCodec state exception during decoding: " + e.getMessage());
                if (e.getMessage() != null && e.getMessage().contains("configure")) {
                    ToolCommon.LOGD(TAG, "MediaCodec is still in configure state, please retry later");
                }
                isInputDone = true;
            } catch (Exception e) {
                ToolCommon.LOGD(TAG, "Decoding exception: " + e.getMessage());
                e.printStackTrace();
            }
        }
    }

    /**
     * 检查是否需要使用原生解码器
     */
    private boolean isNativeFormatRequired() {
        return audioFormatTag == AudioFormatConstants.WAVE_FORMAT_ALAW ||
               audioFormatTag == AudioFormatConstants.WAVE_FORMAT_MULAW ||
               audioFormatTag == AudioFormatConstants.WAVE_FORMAT_G726_ADPCM ||
               audioFormatTag == AudioFormatConstants.WAVE_FORMAT_DVI_ADPCM;
    }

    /**
     * 使用原生解码器解码音频数据
     * 这里应该调用JNI方法来调用底层的G711、G726、ADPCM解码器
     */
    private void decodeNative(byte[] data, long presentationTimeUs) {
        try {
            byte[] pcmData = null;
            
            switch (audioFormatTag) {
                case AudioFormatConstants.WAVE_FORMAT_ALAW:
                    // 调用G711 A-law解码
                    pcmData = decodeG711ALaw(data);
                    break;
                case AudioFormatConstants.WAVE_FORMAT_MULAW:
                    // 调用G711 μ-law解码
                    pcmData = decodeG711MuLaw(data);
                    break;
                case AudioFormatConstants.WAVE_FORMAT_G726_ADPCM:
                    // 调用G726解码
                    pcmData = decodeG726(data);
                    break;
                case AudioFormatConstants.WAVE_FORMAT_DVI_ADPCM:
                    // 调用ADPCM解码
                    pcmData = decodeADPCM(data);
                    break;
                default:
                    ToolCommon.LOGD(TAG, "Unknown native format: " + audioFormatTag);
                    return;
            }
            
            if (pcmData != null && audioTrack != null) {
                // 直接播放PCM数据
                playPCMData(pcmData);
            }
        } catch (Exception e) {
            ToolCommon.LOGD(TAG, "Native decoding exception: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * 播放PCM数据
     */
    private void playPCMData(byte[] pcmData) {
        if (audioTrack != null && audioTrack.getState() == AudioTrack.STATE_INITIALIZED) {
            // 如果AudioTrack还没有开始播放，则启动播放
            if (audioTrack.getPlayState() != AudioTrack.PLAYSTATE_PLAYING) {
                audioTrack.play();
                ToolCommon.LOGD(TAG, "AudioTrack started playing");
            }
            
            // 写入音频数据
            int bytesWritten = audioTrack.write(pcmData, 0, pcmData.length);
            if (bytesWritten < 0) {
                ToolCommon.LOGD(TAG, "Error writing PCM data: " + bytesWritten);
            } else if (bytesWritten != pcmData.length) {
                ToolCommon.LOGD(TAG, "Partial write: " + bytesWritten + " / " + pcmData.length + " bytes");
            }
        } else {
            if (audioTrack == null) {
                ToolCommon.LOGD(TAG, "AudioTrack is null, cannot play");
            } else {
                ToolCommon.LOGD(TAG, "AudioTrack state: " + audioTrack.getState() + ", cannot play");
            }
        }
    }

    /**
     * G711 A-law解码（Java实现）
     * 将G711 A-law编码的数据转换为16位PCM数据
     */
    private byte[] decodeG711ALaw(byte[] data) {
        // G711 A-law: 1字节 -> 2字节 (16位PCM)
        byte[] pcmData = new byte[data.length * 2];
        
        for (int i = 0; i < data.length; i++) {
            int alaw = data[i] & 0xFF;
            short pcm = alaw2linear(alaw);
            
            // 将16位PCM值转换为字节（小端序）
            pcmData[i * 2] = (byte) (pcm & 0xFF);
            pcmData[i * 2 + 1] = (byte) ((pcm >> 8) & 0xFF);
        }
        return pcmData;
    }
    
    /**
     * A-law到线性PCM的转换算法
     * 参考标准G.711实现
     */
    private short alaw2linear(int aVal) {
        aVal ^= 0x55;
        
        int t = (aVal & 0x0F) << 4;
        int seg = (aVal & 0x70) >> 4;
        
        switch (seg) {
            case 0:
                t += 8;
                break;
            case 1:
                t += 0x108;
                break;
            default:
                t += 0x108;
                t <<= seg - 1;
                break;
        }
        
        return (short) ((aVal & 0x80) != 0 ? t : -t);
    }

    /**
     * G711 μ-law解码（Java实现）
     * 将G711 μ-law编码的数据转换为16位PCM数据
     */
    private byte[] decodeG711MuLaw(byte[] data) {
        // G711 μ-law: 1字节 -> 2字节 (16位PCM)
        byte[] pcmData = new byte[data.length * 2];
        
        for (int i = 0; i < data.length; i++) {
            int ulaw = data[i] & 0xFF;
            short pcm = ulaw2linear(ulaw);
            
            // 将16位PCM值转换为字节（小端序）
            pcmData[i * 2] = (byte) (pcm & 0xFF);
            pcmData[i * 2 + 1] = (byte) ((pcm >> 8) & 0xFF);
        }
        
        return pcmData;
    }
    
    /**
     * μ-law到线性PCM的转换算法
     * 参考标准G.711实现
     */
    private short ulaw2linear(int uVal) {
        final int BIAS = 0x84;
        final int QUANT_MASK = 0x0F;
        final int SEG_MASK = 0x70;
        
        // 取补码获取正常的μ-law值
        uVal = ~uVal;
        
        // 提取并偏置量化位，然后根据段号向上移位并减去偏置
        int t = ((uVal & QUANT_MASK) << 3) + BIAS;
        t <<= (uVal & SEG_MASK) >> 4;
        
        return (short) ((uVal & 0x80) != 0 ? (BIAS - t) : (t - BIAS));
    }

    /**
     * G726解码（需要JNI实现）
     */
    private byte[] decodeG726(byte[] data) {
        // TODO: 调用JNI方法进行G726解码
        ToolCommon.LOGD(TAG, "G726 decoding (JNI not implemented yet)");
        return data; // 临时返回原数据，实际应该返回解码后的PCM数据
    }

    /**
     * ADPCM解码（需要JNI实现）
     */
    private byte[] decodeADPCM(byte[] data) {
        // TODO: 调用JNI方法进行ADPCM解码
        ToolCommon.LOGD(TAG, "ADPCM decoding (JNI not implemented yet)");
        return data; // 临时返回原数据，实际应该返回解码后的PCM数据
    }

    public void setEndOfStream() {
        if (!isReady) return;
        isInputDone = true;
        
        if (mediaCodec != null) {
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
        } else {
            // 对于原生解码器，直接标记结束
            ToolCommon.LOGD(TAG, "End of stream for native decoder");
        }
    }

    public void release() {
        shouldStop = true;
        isInputDone = true;
        isReady = false; // 标记解码器不再可用
        
        // 等待输出线程结束
        if (outputThread != null) {
            try {
                outputThread.join(2000); // 等待2秒
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                ToolCommon.LOGD(TAG, "Interrupted while waiting for output thread to finish");
            }
            outputThread = null;
        }
        
        // 释放AudioTrack
        releaseAudioTrack();
        
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
        
        isOutputDone = false;
    }
    
    private void releaseAudioTrack() {
        if (audioTrack != null) {
            try {
                if (audioTrack.getPlayState() == AudioTrack.PLAYSTATE_PLAYING) {
                    audioTrack.stop();
                }
                audioTrack.release();
            } catch (Exception e) {
                ToolCommon.LOGD(TAG, "Exception when releasing AudioTrack: " + e.getMessage());
                e.printStackTrace();
            }
            audioTrack = null;
        }
    }
    
    /**
     * 检查解码器是否处于有效状态
     */
    public boolean isValid() {
        return isReady && !shouldStop && !isOutputDone && 
               (mediaCodec != null || isNativeFormatRequired());
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
     * 查找硬件解码器
     */
    private String findHardwareDecoder(String mimeType) {
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
                        // 硬件解码器通常不包含 "OMX.google" 或 "c2.android"
                        if (!name.contains("OMX.google") && !name.contains("c2.android")) {
                            ToolCommon.LOGD(TAG, "Found hardware decoder: " + name);
                            return name;
                        }
                    }
                }
            }
        } catch (Exception e) {
            ToolCommon.LOGD(TAG, "Failed to find hardware decoder: " + e.getMessage());
        }
        return null;
    }
    
    /**
     * 暂停播放
     */
    public void pause() {
        if (audioTrack != null && audioTrack.getState() == AudioTrack.STATE_INITIALIZED) {
            try {
                if (audioTrack.getPlayState() == AudioTrack.PLAYSTATE_PLAYING) {
                    audioTrack.pause();
                    ToolCommon.LOGD(TAG, "Audio playback paused");
                }
            } catch (Exception e) {
                ToolCommon.LOGD(TAG, "Exception when pausing AudioTrack: " + e.getMessage());
            }
        }
    }
    
    /**
     * 恢复播放
     */
    public void resume() {
        if (audioTrack != null && audioTrack.getState() == AudioTrack.STATE_INITIALIZED) {
            try {
                if (audioTrack.getPlayState() == AudioTrack.PLAYSTATE_PAUSED) {
                    audioTrack.play();
                    ToolCommon.LOGD(TAG, "Audio playback resumed");
                }
            } catch (Exception e) {
                ToolCommon.LOGD(TAG, "Exception when resuming AudioTrack: " + e.getMessage());
            }
        }
    }
    
    /**
     * 设置音量
     */
    public void setVolume(float volume) {
        if (audioTrack != null && audioTrack.getState() == AudioTrack.STATE_INITIALIZED) {
            try {
                audioTrack.setVolume(volume);
                ToolCommon.LOGD(TAG, "Audio volume set to: " + volume);
            } catch (Exception e) {
                ToolCommon.LOGD(TAG, "Exception when setting volume: " + e.getMessage());
            }
        }
    }
    
    /**
     * 暂停音频播放（别名方法，与pause()相同）
     */
    public void pauseAudio() {
        pause();
    }
    
    /**
     * 恢复音频播放（别名方法，与resume()相同）
     */
    public void resumeAudio() {
        resume();
    }
    
    /**
     * 检查音频是否正在播放
     */
    public boolean isPlaying() {
        if (audioTrack != null && audioTrack.getState() == AudioTrack.STATE_INITIALIZED) {
            try {
                return audioTrack.getPlayState() == AudioTrack.PLAYSTATE_PLAYING;
            } catch (Exception e) {
                ToolCommon.LOGD(TAG, "Exception when checking play state: " + e.getMessage());
                return false;
            }
        }
        return false;
    }
    
    /**
     * 静音（设置音量为0）
     */
    public void mute() {
        setVolume(0.0f);
    }
    
    /**
     * 取消静音（设置音量为最大）
     */
    public void unmute() {
        setVolume(1.0f);
    }
    
    /**
     * 获取当前音频格式标识
     */
    public int getAudioFormatTag() {
        return audioFormatTag;
    }
    
    /**
     * 获取当前采样率
     */
    public int getSampleRate() {
        return sampleRate;
    }
    
    /**
     * 获取当前声道数
     */
    public int getChannelCount() {
        return channelCount;
    }
    
    /**
     * 静态方法：根据WAVEFORMATEX创建AudioCodec实例（推荐方式）
     */
    public static AudioCodec createDecoder(WAVEFORMATEX waveFormat) throws IOException {
        AudioCodec codec = new AudioCodec();
        codec.initDecoder(waveFormat);
        return codec;
    }
    
    /**
     * 静态方法：根据wFormatTag创建AudioCodec实例
     */
    public static AudioCodec createDecoder(int wFormatTag, int sampleRate, int channelCount) throws IOException {
        AudioCodec codec = new AudioCodec();
        codec.initDecoder(wFormatTag, sampleRate, channelCount);
        return codec;
    }
    
    /**
     * 静态方法：根据MIME类型创建AudioCodec实例
     */
    public static AudioCodec createDecoder(String mimeType, int sampleRate, int channelCount) throws IOException {
        AudioCodec codec = new AudioCodec();
        codec.initDecoder(mimeType, sampleRate, channelCount);
        return codec;
    }
    
    /**
     * 获取支持的音频格式列表
     */
    public static String[] getSupportedFormats() {
        return new String[]{
            "G711 A-law (" + AudioFormatConstants.WAVE_FORMAT_ALAW + ")",
            "G711 μ-law (" + AudioFormatConstants.WAVE_FORMAT_MULAW + ")",
            "G726 ADPCM (" + AudioFormatConstants.WAVE_FORMAT_G726_ADPCM + ")",
            "DVI ADPCM (" + AudioFormatConstants.WAVE_FORMAT_DVI_ADPCM + ")",
            "PCM (" + AudioFormatConstants.WAVE_FORMAT_PCM + ")"
        };
    }
    
    /**
     * 从WAVEFORMATEX获取格式信息的字符串描述
     */
    public static String getFormatDescription(WAVEFORMATEX waveFormat) {
        if (waveFormat == null) {
            return "NULL WAVEFORMATEX";
        }
        
        int channels = 1;
        if (waveFormat.nChannels != null && waveFormat.nChannels.length >= 2) {
            MyUtil util = new MyUtil();
            channels = util.bytes2short(waveFormat.nChannels);
        }
        
        int bitsPerSample = 16;
        if (waveFormat.wBitsPerSample != null && waveFormat.wBitsPerSample.length >= 2) {
            MyUtil util = new MyUtil();
            bitsPerSample = util.bytes2short(waveFormat.wBitsPerSample);
        }
        
        String formatName = getFormatName(waveFormat.wFormatTag);
        return String.format("%s, %dHz, %d channels, %d bits", 
                           formatName, waveFormat.nSamplesPerSec, channels, bitsPerSample);
    }
    
    /**
     * 根据wFormatTag获取格式名称
     */
    private static String getFormatName(int wFormatTag) {
        switch (wFormatTag) {
            case AudioFormatConstants.WAVE_FORMAT_ALAW:
                return "G711 A-law";
            case AudioFormatConstants.WAVE_FORMAT_MULAW:
                return "G711 μ-law";
            case AudioFormatConstants.WAVE_FORMAT_G726_ADPCM:
                return "G726 ADPCM";
            case AudioFormatConstants.WAVE_FORMAT_DVI_ADPCM:
                return "DVI ADPCM";
            case AudioFormatConstants.WAVE_FORMAT_PCM:
                return "PCM";
            default:
                return "Unknown (" + wFormatTag + ")";
        }
    }
    
    /**
     * 检查WAVEFORMATEX是否为支持的格式
     */
    public static boolean isSupportedFormat(WAVEFORMATEX waveFormat) {
        if (waveFormat == null) return false;
        
        int formatTag = waveFormat.wFormatTag;
        return formatTag == AudioFormatConstants.WAVE_FORMAT_ALAW ||
               formatTag == AudioFormatConstants.WAVE_FORMAT_MULAW ||
               formatTag == AudioFormatConstants.WAVE_FORMAT_G726_ADPCM ||
               formatTag == AudioFormatConstants.WAVE_FORMAT_DVI_ADPCM ||
               formatTag == AudioFormatConstants.WAVE_FORMAT_PCM;
    }
}
