/**
 * Created by wangjian on 16/4/26.
 */
/*jslint node: true */
"use strict";
//主动
//todo:/登录/获取会话列表/获取总未读数/清除未读数/删除会话/查询历史记录/发送消息/发送已读回执/退出
//todo:/获取免打扰（人或群）/设置好友信息（昵称、黑名单、免扰）/获取通知状态（是否通知、声音、震动）/设置通知状态（是否通知、声音、震动）/获取好友列表/获取群列表/获取群成员列表/获取群信息/
//todo:/设置群昵称（自己、他人）

//被动回调
//todo:收到消息（人、群）/会话列表更新/已读回执（人、群）/系统消息/群系统消息（群信息更新、群成员信息更新、入群申请、加人、踢人、退群、解散、管理员变更、群主变更、更新群公告）
// todo:/好友信息变动多端同步(好友昵称、黑名单、免扰)/被踢/

/*
 错误代码
 501:用户名密码错误
 */
//事件消息
var event_message = {
    message_id: '', //服务器端id，防止重复
    event_type: '', //事件类型：session_update|message_read|group_sys_message|friend_sys_message|kick|
    event_obj: 'json' //事件内容
};

var group_sys_message = {
    id: '', //服务器端id，
    group_id: '', //群id
    type: '', //消息类型：update|member|apply|add|remove|quite|dismiss|add_manager|remove_manager|transfer|gonggao
    obj: {}, //消息的对象
    update_time: '' //事件发生时间
};

//好友消息已读事件
var message_read = {
    id: '', //服务器端id，
    session_id: '', //会话一个id
    message_id: '', //消息id
    target: 1, //读消息的对象id
    update_time: '' //事件发生时间

};

//会话更新事件
var session_update = {
    _id: '', //服务器端id，
    session_id: '', //每个会话一个id：好友会话[user_id]_p_[user_id] : 群会话[user_id]_g_[group_id]：系统会话[user_id]_s_[sys_id]
    owner: 1, //用户id
    target: 1, //聊天对象id
    target_type: 1, //聊天对象类型
    is_top: true, //是否置顶
    name: '', //显示昵称
    last_message: {ctype: "", content: ''},//显示最后一条内容
    last_message_time: '', //最后一条时间
    read_time: 112,  //拥有者读区时间
    target_read_time: 112,  //对方读区时间
    unread: 12 //未读消息数
};


//聊天消息
var chat_message = {
    _id: "", //服务器端消息id
    target_type: 0, //目标类型 0:单聊 1:群聊
    fuser: 1, //发送方id
    fname: '', //发送方昵称
    fclient_type: '', //客户端clientid：[phone|web|plugin360|pluginchrome]_[user_id]:phone_12
    fdevice_id: '', //客户端设备id:xdsfsdfsd
    target: 1, //目标id
    time: 1, //时间戳
    ctype: 'txt', //消息类型:txt:文字消息；file：附件消息；location：地理位置消息；vcard：名片消息；href：超链接消息；oa：oa消息;
    is_read: false, //是否已读
    userlist: [1, 2, 3],
    readuserlist: [{user_id: 1, is_read: true, time: ''}, {user_id: 2, is_read: false, time: ''}], //消息的接收人列表 已读未读，已读时间点
    content: 'json', //内容
    ext: 'json', //扩展字段
    id_client: 1, //客户端提供的id
    push_content: '', //推送通知时显示的内容
    push_payload: 'json', //推送通知时显示的自定义字段
    is_push: true, //是否推送
    is_unreadable: true //是否计入未读数
};
//消息体定义
var txt = {
    text: 'xxxx'
};
var file = {
    type: 'jpg',
    url: "http://xxx",
    //缩略图,可空
    thumbnail: 'http://xxx',
    text: '[图片]'
};

// var location = {
//     address: "地址",
//     name: "名称",
//     //纬度
//     latitude: 39.9,
//     //经度
//     longitude: 116.3,
//     text: '[位置]'
//
// };

var vcard = {
    uid: 1,
    text: '[名片]'
};
var href = {
    href: "http://www.baidu.com",
    text: '[网址]'
};
var oa = {};

// var event = {
//     callid: 1, //客户端用来区分回调函数的id，客户端自0~1000循环
//     type: 'chat|event|request',
//     compress: 0, //类似pomelo 对键值的压缩需要客户端和服务器端实现相同的压缩解压缩算法 版本
//     obj: chat_message //消息json信息
// };


//客户端发送单聊 topic send/{id}
var send_user_message = {
    fname: "name",
    target_type: 0, //目标类型 0:单聊 1:群聊
    target: 1, //目标id
    ctype: 'txt', //消息类型:txt:文字消息；file：附件消息；location：地理位置消息；vcard：名片消息；href：超链接消息；oa：oa消息;
    content: 'json', //内容
    ext: 'json', //扩展字段
    id_client: 1, //客户端提供的id
    push_content: '', //推送通知时显示的内容
    push_payload: 'json', //推送通知时显示的自定义字段
    is_push: true, //是否推送
    is_unreadable: true, //是否计入未读数
    readuserlist: [1, 2]
};