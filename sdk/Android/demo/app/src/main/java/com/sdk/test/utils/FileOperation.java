package com.sdk.test.utils;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

import com.sdk.interfance.MyUtil;
import com.sdk.interfance.ToolCommon;
import com.sdk.test.app.SDKApplication;

import android.content.Context;
import android.os.Environment;
import android.os.Handler;
import android.os.Message;
import android.util.Log;
import android.widget.Toast;

/**
 * It's just an example.you can do it yourself.
 * A class dedicated to video recording
 * @author Administrator
 *
 */
public class FileOperation
{
	final int MAX_UDP_SIZEX = 10240 * 6;
	public byte[] m_data = null;//new byte[MAX_UDP_SIZEX];
	public int m_DataBufferReadIndex = 0; // read index
	public int m_DataBufferWriteIndex = 0; // write index
	int m_DataBufferTotalLength = MAX_UDP_SIZEX;
	private Context m_context = null;
	private ReadCFrameDataInterface m_delegate = null;
	FileOutputStream fop = null;
	File file = null;
	private boolean m_bCloseWritingFile = false;
	private boolean m_bCloseReadingFile = false;
	//Split string
	private static String mstrFrameSeperator = "/daisy/";
	private String m_strLocalFilePath = "";
	private static final String TAG = "FileOperation";

	Handler mHandler = new Handler()
	{
		public void handleMessage(Message msg)
		{
			switch (msg.what)
			{
				case 1:
					Toast.makeText(m_context, "No video files", Toast.LENGTH_SHORT).show();
					break;
			}
		}
	};


	public FileOperation(Context context, ReadCFrameDataInterface delegate)
	{
		m_context = context;
		m_delegate = delegate;
	}

	/**
	 * Copy the data to m_data variable and insert a split string to distinguish each frame of data,then record the index written
	 * @param data
	 * @param bclosed = true represent stop record video data,close the file.
	 */
	public void WriterData(byte[] data, boolean bclosed)
	{
		int length = data.length;
		if (length > 0)
		{
			if(m_data == null )
			{
				m_data = new byte[MAX_UDP_SIZEX];
			}
			Log.d("fileOperation", "m_DataBufferWriteIndex : "+ m_DataBufferWriteIndex +",length:"+ mstrFrameSeperator.getBytes().length );
			System.arraycopy(mstrFrameSeperator.getBytes(), 0, m_data, m_DataBufferWriteIndex, mstrFrameSeperator.getBytes().length);
			m_DataBufferWriteIndex += mstrFrameSeperator.getBytes().length;
			System.arraycopy(data, 0, m_data, m_DataBufferWriteIndex, length);
			m_DataBufferWriteIndex += length;
			m_bCloseWritingFile = bclosed;
		}
		WriterFile();
	}

	/**
	 * stop read record file
	 */
	public void StopReadFile()
	{
		m_bCloseReadingFile = true;
	}

	/**
	 * get a path of a file,then write data into this avi file.and record the path for using it in readFileByBytes().
	 * when m_bCloseWritingFile = true, close the file ,stop record video data.
	 */
	public void WriterFile()
	{
		try
		{
			
			if (file == null)
			{
				
				m_strLocalFilePath = ToolCommon.getFileName(m_context);
				SDKApplication.getInstance().setStrLocalFilePath(m_strLocalFilePath);
				Log.d(TAG, "WriterFile: path:" + m_strLocalFilePath);
				file = new File(m_strLocalFilePath);
				fop = new FileOutputStream(file);
			}

			if (!file.exists())
			{
				
				file.createNewFile();
			}

			
			if (m_DataBufferWriteIndex - m_DataBufferReadIndex > 0)
			{
				fop.write(m_data, m_DataBufferReadIndex, m_DataBufferWriteIndex - m_DataBufferReadIndex);
				Log.d("fileoperation","---1---- WriterFile(), m_DataBufferReadIndex = " + m_DataBufferReadIndex + ",m_DataBufferWriteIndex = " + m_DataBufferWriteIndex
						+ ",m_DataBufferWriteIndex - m_DataBufferReadIndex = " + (m_DataBufferWriteIndex - m_DataBufferReadIndex));
				m_DataBufferReadIndex = 0;
				m_DataBufferWriteIndex = 0;
			}
			if (m_bCloseWritingFile)
			{
				fop.flush();
				fop.close();
				System.out.println("-------------close write file thread---------");
			}
		}
		catch (IOException e)
		{
			Log.e(TAG,e.getMessage());

		}
	}

	public Runnable ReadFileThreadProcessing = new Runnable()
	{
		public void run()
		{
			readFileByBytes();
		}
	};

	/**
	 * start to read video record file thread
	 */
	public void StartReadFileThread()
	{
		System.out.println("-------------StartReadFileThread----------");
		Thread thread = new Thread(null, ReadFileThreadProcessing, "ReadFileThreadProcessing");
		thread.start();
	}

	/**
	 *
	 *
	 * @param fileName
	 * �ļ�����
	 */
	boolean btest = true;

	/**
	 * Loop read video record file ,read data into m_data variable
	 */
	public void readFileByBytes()
	{
//		m_strLocalFilePath = "/storage/emulated/0/DVRSDK_DEMO/test/test_file/2018-01-03-16-04-21.avi";
		m_strLocalFilePath = SDKApplication.getInstance().getStrLocalFilePath();
		System.out.println("-----m_strLocalFilePath = "+m_strLocalFilePath);
		if (m_strLocalFilePath.equals(""))
		{
			mHandler.sendEmptyMessage(1);
			return;
		}
		if(m_data == null)
		{
			m_data = new byte[MAX_UDP_SIZEX];
		}
		File file = new File(m_strLocalFilePath);
		if (!file.exists())
		{
			return;
		}
		InputStream in = null;
		try
		{
			byte[] tempbytes = new byte[100];
			int byteread = 0;
			in = new FileInputStream(m_strLocalFilePath);
			while ((byteread = in.read(tempbytes)) != -1 && !m_bCloseReadingFile)
			{
				if (m_DataBufferWriteIndex + byteread >= MAX_UDP_SIZEX)
				{
					int usefullength = m_DataBufferWriteIndex - m_DataBufferReadIndex;
					byte[] copy = new byte[usefullength];
					System.arraycopy(m_data, m_DataBufferReadIndex, copy, 0, usefullength);
					System.arraycopy(copy, 0, m_data, 0, usefullength);
					m_DataBufferReadIndex = 0;
					m_DataBufferWriteIndex = usefullength;
				}

				System.arraycopy(tempbytes, 0, m_data, m_DataBufferWriteIndex, byteread);
				m_DataBufferWriteIndex += byteread;
//				System.out.println("----------readFileByBytes---------");
				ReadCFrameData();
			}
			System.out.println("-----1--------close read file thread---------");
		}
		catch (Exception e1)
		{
			e1.printStackTrace();
		}
		finally
		{
			if (in != null)
			{
				try
				{
					in.close();
					System.out.println("-----2--------close read file thread---------");
				}
				catch (IOException e1)
				{
				}
			}
		}
	}

	String strseperator = "";

	/**
	 * read one frame data,and play it.
	 */
	public void ReadCFrameData()
	{

	}
}
