package com.sdk.xml;

import com.sdk.interfance.ToolCommon;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;


/**
 * <?xml version="1.0" encoding="utf-8"?>
 * <config xmlns="http://www.ipc.com/ver10" version="1.0">
 * <types>//  nodeName:指的是：types
 * <queryType> //  nodeName:指的是:queryType  ;queryType 这是 types 的子节点
 * <enum>byPersonID</enum>   //  nodeName:enum,nodeValue:byPersonID
 * <enum>byListType</enum> //enum 是 queryType 的子节点 ，以此类推
 * <enum>byName</enum>
 * <enum>byIdentifyNumber</enum>
 * </queryType>
 * <listType>
 * <enum>strangerList</enum>
 * <enum>whiteList</enum>
 * <enum>blackList</enum>
 * </listType>
 * </types>
 * <queryAction>
 * <queryType type="queryType">byListType</queryType>
 * <listType type="listType">whiteList</listType>
 * </queryAction>
 * </config>
 */
public class XmlNode
{
    public String nodeName;
    public String nodeValue;
    //子节点
    public List<XmlNode> childNodes;
    //当前节点属性集合
    public HashMap<String, Object> nodePropertys;

    /**
     * 构造函数
     * 参数: 根节点名称
     */
    public XmlNode(String rootName)
    {
        this.nodeName = rootName;
        this.childNodes = new ArrayList<>();
        this.nodePropertys = new HashMap<>();
    }


    public XmlNode addProperty(String propertyName, String value)
    {
        if (!ToolCommon.isEmpty(propertyName))
        {
            nodePropertys.put(propertyName, value);
        }
        return this;
    }

    public XmlNode addChildNode(XmlNode node)
    {
        if (null != node)
        {
            childNodes.add(node);
        }
        return this;
    }

    public void setNodeValue(String nodeValue)
    {
        this.nodeValue = nodeValue;
    }
}
