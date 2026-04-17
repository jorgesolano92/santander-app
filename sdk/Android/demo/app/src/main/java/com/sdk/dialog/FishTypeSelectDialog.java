package com.sdk.dialog;

import android.app.Activity;
import android.app.Dialog;
import android.content.DialogInterface;
import android.graphics.Rect;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ListView;
import android.widget.TextView;

import com.sdk.interfance.ToolCommon;
import com.sdk.test.utils.LocalDisplay;
import com.switchbee.technician.R;

import java.util.ArrayList;
import java.util.List;


/**
 * 视频类型选择：鱼眼：
 */
public class FishTypeSelectDialog extends Dialog implements View.OnClickListener
{
    /**
     * 冷漠无视、标题提示、吐槽、鼓励
     */
    private Activity activity;
    private ListView lvSelectType;
    private TextView tvSelectedType;
    private Button btnOk;
    List<String> dataSourceList = new ArrayList<>();
    private int selectType;

    /***第一次点击收藏弹窗提示*/
    public static FishTypeSelectDialog createAndShow(Activity activity)
    {
        FishTypeSelectDialog fishTypeSelectDialog = new FishTypeSelectDialog(activity);
        fishTypeSelectDialog.show();
        return fishTypeSelectDialog;
    }

    public FishTypeSelectDialog(Activity activity)
    {
        super(activity, R.style.search_type_dialog);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setContentView(R.layout.search_type_dialog);
        this.activity = activity;
        initView();
        setWindowSize();
        // 设置触摸对话框以外的地方取消对话框
        setCanceledOnTouchOutside(false);
    }


    /**
     * 初始化各个控件
     */
    private void initView()
    {
        lvSelectType = findViewById(R.id.lv_type_select);
        tvSelectedType = findViewById(R.id.tv_selected_type);
        btnOk = findViewById(R.id.btn_select_ok);
        btnOk.setOnClickListener(this);
        //构造数据源
        addSource();
        //为适配器添加数据源
        ArrayAdapter adapter = new ArrayAdapter(activity, android.R.layout.simple_list_item_1, dataSourceList);
        //为listView的容器添加适配器
        lvSelectType.setAdapter(adapter);
        //设置点击事件mlv
        lvSelectType.setOnItemClickListener(new AdapterView.OnItemClickListener()
        {
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int position, long id)
            {

                if (selectType == position)
                {//反选
                    ToolCommon.toastShow(activity, "取消" + position);
                }
                else
                {
                    ToolCommon.toastShow(activity, "选中" + position);
                    selectType = position;
                }
                tvSelectedType.setText(dataSourceList.get(selectType));
            }
        });
        setOnKeyListener(new OnKeyListener()
        {
            @Override
            public boolean onKey(DialogInterface dialog, int keyCode, KeyEvent event)
            {
                if (keyCode == KeyEvent.KEYCODE_BACK && event.getRepeatCount() == 0)
                {//系统返回键监听
                    //                    hideDialog();
                }
                return true;//屏蔽系统返回键
            }
        });

    }

    private void addSource()
    {
        dataSourceList.add("NORMAL");
        dataSourceList.add("BALL");
        dataSourceList.add("CYLINDER");
        dataSourceList.add("SQUARE");
        dataSourceList.add("SPHERE");
        dataSourceList.add("VR");
    }

    /**
     * 设置显示窗口大小和位置
     */
    private void setWindowSize()
    {
        Window window = getWindow(); // 得到对话框
        //        window.setBackgroundDrawableResource(R.color.transparent); // 设置对话框背景为透明
        WindowManager.LayoutParams wl = window.getAttributes();
        // 根据x，y坐标设置窗口需要显示的位置
        wl.x = 0; // x小于0左移，大于0右移
        wl.y = 0; // y小于0上移，大于0下移
        //         wl.alpha = 0.6f; //设置透明度
        wl.gravity = Gravity.CENTER; //设置重力
        Rect rect = new Rect();
        View view = window.getDecorView();
        view.getWindowVisibleDisplayFrame(rect);
        //        wl.height = mDm.heightPixels - rect.top;
        wl.width = LocalDisplay.SCREEN_WIDTH_PIXELS;
        window.setAttributes(wl);
    }


    @Override
    public void onClick(View v)
    {
        if (v == btnOk)
        {
            hideDialog();
        }
    }

    @Override
    public void show()
    {
        super.show();
        //        mShowAnim.start();
    }

    public void hideDialog()
    {
        if (null != mOnSelectTypeCallB)
        {
            mOnSelectTypeCallB.onSelectType(getSelectedType(), tvSelectedType.getText().toString());
        }
        dismiss();
    }

    private int getSelectedType()
    {

        int type = 0;
        switch (selectType)
        {
            case 0:
//                type = State.RenderModel.RENDER_MODEL_NORMAL;
                break;
            case 1:
//                type = State.RenderModel.RENDER_MODEL_FISH_EYE_BALL;
                break;
            case 2:
//                type = State.RenderModel.RENDER_MODEL_FISH_EYE_CYLINDER;
                break;
            case 3:
//                type = State.RenderModel.RENDER_MODEL_FISH_EYE_SQUARE;
                break;
            case 4:
//                type = State.RenderModel.RENDER_MODEL_FISH_EYE_SPHERE;
                break;
            case 5:
//                type = State.RenderModel.RENDER_MODEL_FISH_EYE_VR;
                break;
            default:
//                type = State.RenderModel.RENDER_MODEL_NORMAL;
                break;
        }
        return type;
    }


    private OnSelectTypeCallB mOnSelectTypeCallB = null;

    public void setOnSelectTypeCallB(OnSelectTypeCallB onSelectTypeCallB)
    {
        this.mOnSelectTypeCallB = onSelectTypeCallB;
    }

    public interface OnSelectTypeCallB
    {
        void onSelectType(int type, String selectText);
    }

}

