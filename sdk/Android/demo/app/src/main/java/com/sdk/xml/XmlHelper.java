package com.sdk.xml;

import com.sdk.interfance.ToolCommon;


public class XmlHelper
{

    /**
     * 按名单类型查询人员ID
     * <?xml version="1.0" encoding="utf-8"?>
     * <config xmlns="http://www.ipc.com/ver10" version="1.0">
     * <types>
     * <queryType>
     * <enum>byPersonID</enum>
     * <enum>byListType</enum>
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
    public static String queryFaceIdByNameListType()
    {
        XmlNode root = new XmlNode(NodeName.Config);   //创建根节点
        root
                .addProperty(Property.Xmlns, "http://www.ipc.com/ver10")
                .addProperty(Property.Version, "1.0");
        //1
        XmlNode typesNode = new XmlNode(NodeName.Types);
        //1.1
        XmlNode queryTypeNode = new XmlNode(NodeName.QueryType);
        root.addChildNode(typesNode);//
        typesNode.addChildNode(queryTypeNode);
        queryTypeNode
                .addChildNode(createEnumNode("byPersonID"))
                .addChildNode(createEnumNode("byListType"))
                .addChildNode(createEnumNode("byName"))
                .addChildNode(createEnumNode("byIdentifyNumber"));
        //1.2
        XmlNode listTypeNode = new XmlNode(NodeName.ListType);
        typesNode.addChildNode(listTypeNode);
        listTypeNode
                .addChildNode(createEnumNode("strangerList"))
                .addChildNode(createEnumNode("whiteList"))
                .addChildNode(createEnumNode("blackList"));
        //2
        XmlNode queryActionNode = new XmlNode(NodeName.QueryAction);
        //2.1
        queryTypeNode = new XmlNode(NodeName.QueryType);
        queryTypeNode
                .addProperty(Property.Type, "queryType")
                .setNodeValue("byListType");
        //2.2
        listTypeNode = new XmlNode(NodeName.ListType);
        listTypeNode
                .addProperty(Property.Type, "listType")
                .setNodeValue("whiteList");
        root.addChildNode(queryActionNode);//
        queryActionNode.addChildNode(queryTypeNode);
        queryActionNode.addChildNode(listTypeNode);
        //创建XmlHandler
        XmlHandler xmlhandler = new XmlHandler();
        String xmlString = xmlhandler.createXml(root);  //调用xmlHandler的接口方法, 获取xml字符串
        ToolCommon.LOGD("","android create Xml : " + xmlString);
        //        return xmlString;

        return xmlString;

    }

    public static String queryFaceDetailByFaceId(String faceId)
    {
        XmlNode root = new XmlNode(NodeName.Config);   //创建根节点
        root
                .addProperty(Property.Xmlns, "http://www.ipc.com/ver10")
                .addProperty(Property.Version, "1.0");
        //1.
        XmlNode typesNode = new XmlNode(NodeName.Types);
        //1.1
        XmlNode queryTypeNode = new XmlNode(NodeName.QueryType);
        root.addChildNode(typesNode);//
        typesNode.addChildNode(queryTypeNode);
        queryTypeNode
                .addChildNode(createEnumNode("byPersonID"))
                .addChildNode(createEnumNode("byListType"))
                .addChildNode(createEnumNode("byName"))
                .addChildNode(createEnumNode("byIdentifyNumber"));

        //1.2
        XmlNode personIdNode = new XmlNode(NodeName.ListType);
        typesNode.addChildNode(personIdNode);
        personIdNode
                .addChildNode(createEnumNode("strangerList"))
                .addChildNode(createEnumNode("whiteList"))
                .addChildNode(createEnumNode("blackList"));

        //2
        XmlNode queryActionNode = new XmlNode(NodeName.QueryAction);
        //2.1
        queryTypeNode = new XmlNode(NodeName.QueryType);
        queryTypeNode
                .addProperty(Property.Type, "queryType")
                .setNodeValue("byPersonID");
        //2.2
        personIdNode = new XmlNode(NodeName.PersonID);
        personIdNode
                .addProperty(Property.Type, "uint32")
                .setNodeValue(faceId);
        root.addChildNode(queryActionNode);//
        queryActionNode.addChildNode(queryTypeNode);
        queryActionNode.addChildNode(personIdNode);
        //创建XmlHandler
        XmlHandler xmlhandler = new XmlHandler();
        String xmlString = xmlhandler.createXml(root);  //调用xmlHandler的接口方法, 获取xml字符串
        ToolCommon.LOGD("xmlHelper","android create Xml : " + xmlString);
        //        return xmlString;

        return xmlString;

    }

    public static String deleteMemberByFaceId(String faceId)
    {
        XmlNode root = new XmlNode(NodeName.Config);   //创建根节点
        root
                .addProperty(Property.Xmlns, "http://www.ipc.com/ver10")
                .addProperty(Property.Version, "1.0");
        //1.
        XmlNode typesNode = new XmlNode(NodeName.Types);
        //1.1
        XmlNode deleteTypeNode = new XmlNode(NodeName.DeleteType);
        root.addChildNode(typesNode);//
        typesNode.addChildNode(deleteTypeNode);
        deleteTypeNode
                .addChildNode(createEnumNode("byPersonID"))
                .addChildNode(createEnumNode("byListType"))
                .addChildNode(createEnumNode("byName"))
                .addChildNode(createEnumNode("byIdentifyNumber"))
                .addChildNode(createEnumNode("removeAll"))
        ;
        //1.2
        XmlNode personIdNode = new XmlNode(NodeName.ListType);
        typesNode.addChildNode(personIdNode);
        personIdNode
                .addChildNode(createEnumNode("strangerList"))
                .addChildNode(createEnumNode("whiteList"))
                .addChildNode(createEnumNode("blackList"));
        //2
        XmlNode deleteActionNode = new XmlNode(NodeName.DeleteAction);
        //2.1
        deleteTypeNode = new XmlNode(NodeName.DeleteType);
        deleteTypeNode
                .addProperty(Property.Type, "queryType")
                .setNodeValue("byPersonID");
        personIdNode = new XmlNode(NodeName.PersonID);
        personIdNode
                .addProperty(Property.Type, "uint32")
                .setNodeValue(faceId);
        root.addChildNode(deleteActionNode);//
        deleteActionNode.addChildNode(deleteTypeNode);
        deleteActionNode.addChildNode(personIdNode);
        //创建XmlHandler
        XmlHandler xmlhandler = new XmlHandler();
        String xmlString = xmlhandler.createXml(root);  //调用xmlHandler的接口方法, 获取xml字符串
        ToolCommon.LOGD("xmlHelper","android create Xml : " + xmlString);
        //        return xmlString;

        return xmlString;

    }

    private static XmlNode createEnumNode(String nodeValue)
    {
        XmlNode node = new XmlNode(NodeName.Enum);
        node.setNodeValue(nodeValue);
        return node;
    }

    public static class NodeName
    {
        public static final String Config = "config";
        public static final String Types = "types";
        public static final String QueryType = "queryType";
        public static final String Enum = "enum";
        public static final String ListType = "listType";
        public static final String QueryAction = "queryAction";
        public static final String PersonID = "personID";
        public static final String DeleteType = "deleteType";
        public static final String DeleteAction = "deleteAction";
    }

    public static class Property
    {
        public static final String Version = "version";
        public static final String Xmlns = "xmlns";
        public static final String Type = "type";
    }
}
