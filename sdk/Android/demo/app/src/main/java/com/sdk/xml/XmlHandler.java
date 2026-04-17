package com.sdk.xml;

import com.sdk.interfance.ToolCommon;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map.Entry;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

/***
 * 创建xml字符串
 * */
public class XmlHandler
{
    Document document = null;

    public XmlHandler()
    {
        try
        {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();  //创建DocumentBuilderFactory工厂对象
            DocumentBuilder builder = factory.newDocumentBuilder();  //通过工厂对象, 创建DocumentBuilder制作对象
            document = builder.newDocument();                //通过制作对象, 创建一个Document对象,该对象代表一个XML文件
            document.setXmlStandalone(true);
        }
        catch (ParserConfigurationException e)
        {
            e.printStackTrace();
        }
    }


    /***
     * @return 返回rootElement
     * */
    private Element createDom(XmlNode rootNode, Document document)
    {
        if (ToolCommon.isEmpty(rootNode.nodeName))
        {
            return null;
        }
        //创建根节点
        Element rootElement = document.createElement(rootNode.nodeName);
        setNodeProperty(rootElement, rootNode.nodePropertys);
        if (!ToolCommon.isEmpty(rootNode.nodeValue))
        {
            rootElement.setTextContent(rootNode.nodeValue);       // 设置该属性节点的值
        }
        document.appendChild(rootElement);
        if (!ToolCommon.isListEmpty(rootNode.childNodes))
        {
            createXmlOfChildNode(rootNode.childNodes, rootElement, document);
        }
        return rootElement;
    }

    private void createXmlOfChildNode(List<XmlNode> childNodes, Element parentElement, Document document)
    {
        if (!ToolCommon.isListEmpty(childNodes))
        {
            for (XmlNode childNode : childNodes)
            {
                if (ToolCommon.isEmpty(childNode.nodeName))
                {
                    continue;
                }
                Element element = document.createElement(childNode.nodeName);
                setNodeProperty(element, childNode.nodePropertys);//设置属性值
                if (!ToolCommon.isEmpty(childNode.nodeValue))
                {// 设置该属性节点的值
                    element.setTextContent(childNode.nodeValue);
                }
                if (!ToolCommon.isListEmpty(childNode.childNodes))
                {//递归查找
                    createXmlOfChildNode(childNode.childNodes, element, document);
                }
                parentElement.appendChild(element);
            }
        }
    }

    private void setNodeProperty(Element element, HashMap<String, Object> nodePropertys)
    {
        if (null != nodePropertys && !nodePropertys.isEmpty())
        {
            for (Entry<String, Object> entryProperty : nodePropertys.entrySet())
            {
                element.setAttribute(entryProperty.getKey(), entryProperty.getValue().toString());
            }
        }
    }


    /**
     * 生成xml字符串
     * 参数: Document树对象
     * 返回String: 整个xml字符串
     */
    private String createXmlToString(Document document)
    {
        String xmlString = null;
        try
        {
            // 创建TransformerFactory工厂对象
            TransformerFactory transFactory = TransformerFactory.newInstance();
            // 通过工厂对象, 创建Transformer对象
            Transformer transformer = transFactory.newTransformer();
            transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
            //使Xml自动换行, 并自动缩进
            transformer.setOutputProperty(OutputKeys.DOCTYPE_PUBLIC, "");
            transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "4");  //中间的参数网址固定写法(这里还没搞懂)
            transformer.setOutputProperty(OutputKeys.INDENT, "yes");                          //是否设置缩进（indent: yes|no）
            // 创建DOMSource对象并将Document加载到其中
            DOMSource domSource = new DOMSource(document);
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            // 使用Transformer的transform()方法将DOM树转换成XML
            transformer.transform(domSource, new StreamResult(bos));
            xmlString = bos.toString();
        }
        catch (TransformerException e)
        {
            e.printStackTrace();
        }
        return xmlString;
    }


    /**
     * 生成xml文件
     * 参数: url存放文件路径, Document树对象
     * 返回String: 反馈信息
     */
    private String createXmlToFile(String url, Document document)
    {
        String message = null;
        try
        {
            // 创建TransformerFactory对象
            TransformerFactory transFactory = TransformerFactory.newInstance();
            // 创建Transformer对象
            Transformer transformer = transFactory.newTransformer();
            //使Xml自动换行, 并自动缩进
            transformer.setOutputProperty(OutputKeys.DOCTYPE_PUBLIC, "");
            transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "4");  //中间的参数网址固定写法(这里还没搞懂)
            transformer.setOutputProperty(OutputKeys.INDENT, "yes");                          //是否设置缩进（indent: yes|no）
            // 建DOMSource对象并将Document加载到其中
            DOMSource domSource = new DOMSource(document);
            //生成xml文件
            File file = new File(url);
            if (!file.exists())
            {       //判断文件是否存在
                file.createNewFile();   //不存在生存文件
            }
            FileOutputStream out = new FileOutputStream(file);     //文件输出流
            StreamResult xmlResult = new StreamResult(out);        //设置输入源
            // 使用Transformer的transform()方法将DOM树转换成XML(参数:DOMSource, 输入源)
            transformer.transform(domSource, xmlResult);
            message = "生成本地XML成功!";
        }
        catch (Exception e)
        {
            e.printStackTrace();
            message = "生成本地XML失败!";
        }
        return message;
    }

    /**
     * 接口方法(重载)
     * 创建Xml字符串
     * 返回String: xml字符串
     */
    public String createXml(XmlNode root)
    {
        String xmlString = "";
        if (root != null)
        {    //判断是否存在xml格式和内容
            createDom(root, document);                //调用 生成Dom树 的方法
            xmlString = createXmlToString(document);        //调用 生成xml字符串 的方法
            //ToolCommon.LOGD("createXmlToString ：" + xmlString);
        }
        return xmlString;
    }

    /**
     * 接口方法(重载)
     * 创建Xml本地文件(参数: 路径)
     * 返回String: 成功/失败消息
     */
    public String createXml(String url, XmlNode root)
    {
        String xmlMessage = null;
        if (root != null)
        {    //判断是否存在xml格式和内容
            createDom(root, document);                //调用 生成Dom树 的方法
            xmlMessage = createXmlToFile(url, document);   //调用 生成xml文件 的方法
        }
        return xmlMessage;
    }
}
