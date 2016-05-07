/**
 * Created by fanjunwei on 16/4/14.
 */
var mosca = require('mosca');
var uuid = require("uuid");
var config = require('./config');
var _ = require('underscore');
var dbservice = require('./service/dao/dbservice');
var mongo_service = require('./service/dao/mongo_service');
var server = new mosca.Server(config.mqtt);
var logging = require('./service/log_service');
var Q = require('q');


var clients_callback = {};
config.mqtt['backend'] = {
    type: 'zmq',
    json: false,
    zmq: require("zmq"),
    port: "tcp://0.0.0.0:33333",
    controlPort: "tcp://0.0.0.0:33334",
    delay: 5
};
function subscribeForClient(client, topic) {
    var pack = {
        "cmd": "subscribe",
        "retain": false,
        "qos": 1,
        "dup": false,
        "topic": null,
        "payload": null,
        "subscriptions": [
            {
                "topic": topic,
                "qos": 1
            }
        ],
        "messageId": (new Date()).valueOf()
    };
    client.handleSubscribe(pack);
}

function publishForClient(client, topic, payload) {

    var message = {
        "topic": topic,
        "payload": payload,
        "qos": 0,
        "messageId": (new Date).valueOf()
    };
    client.connection.publish(message);
}

/**
 * 参数必填校验
 * by:王健 at:2016-04-29
 * @param message
 * @param attr
 * @returns {boolean}
 */
function check_msg(message, attr) {
    var is_ok = true;
    _(attr).each(function (item) {
        if (message[item] === undefined) {
            is_ok = false;
            logging.error(item + "属性没有提供");
        }
    });
    return is_ok;
}


function handleChatSession(message) {
    /*
     session_id: '', //每个会话一个id：好友会话[user_id]_p_[user_id] : 群会话[user_id]_g_[group_id]：系统会话[user_id]_s_[sys_id]
     owner: 1, //用户id
     target: 1, //聊天对象id
     target_type: 1, //聊天对象类型
     is_top: true, //是否置顶
     name: '', //显示昵称
     last_message: {ctype: "", content: '',},//显示最后一条内容
     last_message_time: '', //最后一条时间
     */


    function get_target_name(message) {
        var defered = Q.defer();
        var is_group_message = (message.target_type === 1);
        if (is_group_message) {
            dbservice.get_group_info(message.target).then(function (info) {
                defered.resolve(info.name);
            }, function () {
                defered.resolve();
            })
        }
        else {
            dbservice.get_user_info(message.target).then(function (info) {
                defered.resolve(info.realname);
            }, function () {
                defered.resolve();
            })
        }
        return defered.promise;
    }

    function create_chat_message(message, from, to, name) {
        var chat_session, is_group_message;
        chat_session = {};
        is_group_message = (message.target_type === 1);
        if (is_group_message) {
            chat_session.session_id = from + "_g_" + to;
        }
        else {
            chat_session.session_id = from + "_p_" + to;
        }
        chat_session.owner = from;
        chat_session.target = to;
        chat_session.target_type = message.target_type;
        chat_session.name = name;
        chat_session.last_message = {ctype: message.ctype, content: message.content};
        chat_session.last_message_time = message.time;
        return chat_session;
    }

    get_target_name(message).then(function (target_name) {
        var chat_session, is_group_message, packet, payload;
        is_group_message = (message.target_type === 1);
        if (is_group_message) {
            _(message.userlist).each(function (id) {
                var chat_session;
                chat_session = create_chat_message(message, id, message.target, target_name);
                mongo_service.addChatSession(chat_session);

                payload = {
                    type: 'chat_session',
                    compress: 0, //类似pomelo 对键值的压缩需要客户端和服务器端实现相同的压缩解压缩算法 版本
                    obj: chat_session //消息json信息
                };
                packet = {
                    topic: "group/" + message.target,
                    payload: JSON.stringify(payload),
                    qos: 1,
                    retain: false
                };
                server.publish(packet);

            });
        }
        else {
            chat_session = create_chat_message(message, message.fuser, message.target, target_name);
            mongo_service.addChatSession(chat_session);
            payload = {
                type: 'chat_session',
                compress: 0, //类似pomelo 对键值的压缩需要客户端和服务器端实现相同的压缩解压缩算法 版本
                obj: chat_session //消息json信息
            };
            packet = {
                topic: "user/" + message.fuser,
                payload: JSON.stringify(payload),
                qos: 1,
                retain: false
            };
            server.publish(packet);
            if (message.fuser !== message.target) {
                chat_session = create_chat_message(message, message.target, message.fuser, message.fname);
                mongo_service.addChatSession(chat_session);

                payload = {
                    type: 'chat_session',
                    compress: 0, //类似pomelo 对键值的压缩需要客户端和服务器端实现相同的压缩解压缩算法 版本
                    obj: chat_session //消息json信息
                };
                packet = {
                    topic: "user/" + message.target,
                    payload: JSON.stringify(payload),
                    qos: 1,
                    retain: false
                };
                server.publish(packet);
            }

        }


    });


}

function handleMessage(client, parms) {
    var defered = Q.defer();
    if (!check_msg(parms, ["fname", "target_type", "target", "ctype", "content", "id_client", "push_content", "is_push", "is_unreadable"])) {
        defered.reject();
    }
    var client_info = client.client_info || {};
    var message = parms;
    message.fuser = client.user.id;
    message.fclient_type = client_info.client_type;
    message.fdevice_id = client_info.device_id;
    message.time = (new Date()).valueOf();
    message.is_read = false;
    var is_group_message = (message.target_type === 1);
    if (is_group_message) {
        dbservice.query_group_members(message.target).then(function (data) {
            message.readuserlist = [];
            message.readuserlist = [];
            _(data).each(function (user) {
                message.readuserlist.push(user.user_id);
                message.readuserlist.push({user_id: user.user_id, is_read: false, time: null});
            });
            save_message(message);
        })
    }
    else {
        save_message(message);
    }
    function save_message(message) {
        mongo_service.addMessage(message).then(function () {
            var packet, payload;
            payload = {
                callid: (new Date()).valueOf(), //客户端用来区分回调函数的id，客户端自0~1000循环
                type: 'chat',
                compress: 0, //类似pomelo 对键值的压缩需要客户端和服务器端实现相同的压缩解压缩算法 版本
                obj: message //消息json信息
            };
            payload = JSON.stringify(payload);
            if (is_group_message) {
                packet = {
                    topic: "group/" + message.target,
                    payload: payload,
                    qos: 1,
                    retain: false
                };
                server.publish(packet);
            } else {

                packet = {
                    topic: "user/" + message.target,
                    payload: payload,
                    qos: 1,
                    retain: false
                };
                server.publish(packet);
                if (message.target !== message.fuser) {
                    packet = {
                        topic: "user/" + message.fuser,
                        payload: payload,
                        qos: 1,
                        retain: false
                    };
                    server.publish(packet);
                }
            }
            handleChatSession(message);
            defered.resolve();
        }, function (error) {
            defered.reject(error);
        })
    }

    return defered.promise;
}

function handleGetChatSession(client, parms) {
    if (client.user) {
        return mongo_service.queryChatSessionList(client.user.id)
    }
    else {
        var defered = Q.defer();
        defered.reject('未登录');
        return defered.promise;
    }

}
function handleDeleteChatSession(client, parms) {
    var payload, packet;
    var session_id;
    var is_group_message = (parms.target_type === 1);
    if (is_group_message) {
        session_id = client.user.id + "_g_" + parms.target;
    }
    else {
        session_id = client.user.id + "_p_" + parms.target;
    }
    var result = mongo_service.deleteChatSession(session_id);
    result.then(function () {
        payload = {
            type: 'event',
            compress: 0, //类似pomelo 对键值的压缩需要客户端和服务器端实现相同的压缩解压缩算法 版本
            obj: {
                message_id: server.generateUniqueId(), //服务器端id，防止重复
                event_type: 'delete_chat_session',
                event_obj: {session_id: session_id} //事件内容
            }
        };
        packet = {
            topic: "user/" + client.user.id,
            payload: JSON.stringify(payload),
            qos: 1,
            retain: false
        };
        server.publish(packet);
    });
    return result;
}
function handleRequest(client, route, parms) {
    var defered;
    if (route === 'test') {
        defered = Q.defer();
        defered.resolve(parms);
        return defered.promise;
    }
    else if (route === 'send_client_info') {
        defered = Q.defer();
        client.client_info = parms;
        defered.resolve();
        return defered.promise;
    }
    else if (route === 'send_message') {
        return handleMessage(client, parms);
    }
    else if (route === 'get_chat_session') {
        return handleGetChatSession(client, parms);
    } else if (route === 'set_chat_session_read_time') {
        return mongo_service.setChatSessionReadTime(parms.session_id, parms.time);
    } else if (route === 'get_chat_history') {
        return mongo_service.getChatHistory(parms.session_id, parms.last_time);
    } else if (route === 'delete_chat_session') {
        return handleDeleteChatSession(client, parms);
    }

}
server.on('published', function (packet, client, callback) {
    //logging.log('Published', packet.payload);
    //callback("sdfsdf")

    var topic = packet.topic;
    if (client) {
        var payload = packet.payload.toString();
        var user_id;
        if (client.user) {
            user_id = client.user.id;
        }
        else {
            user_id = 0;
        }
        if (topic.indexOf('request/') === 0) {
            payload = JSON.parse(payload);
            var callid = payload.callid;
            var route = payload.route;
            var parms = payload.parms;
            handleRequest(client, route, parms).then(function (result) {
                if (callid) {
                    var obj = {
                        callback_id: callid,
                        result: result
                    };
                    var event = {
                        callid: server.generateUniqueId(), //客户端用来区分回调函数的id，客户端自0~1000循环
                        type: 'request',
                        compress: 0, //类似pomelo 对键值的压缩需要客户端和服务器端实现相同的压缩解压缩算法 版本
                        obj: obj
                    };
                    publishForClient(client, "user/" + user_id, JSON.stringify(event));
                }

            }, function (error) {
                logging.error("request error", route, parms, error);
            })
        }
    }


});

server.authenticate = function (client, username, password, callback) {
    logging.log('authenticate---->');
    if (!username || !password) {
        logging.log('用户名或密码为空');
        callback(null, false);
        return;
    }
    dbservice.login(username, password.toString()).then(function (user) {
        var event;
        client.user = user;
        if (server.clients[client.id]) {
            clients_callback[client.id] = callback;
            event = {
                callid: server.generateUniqueId(), //客户端用来区分回调函数的id，客户端自0~1000循环
                type: 'event',
                compress: 0, //类似pomelo 对键值的压缩需要客户端和服务器端实现相同的压缩解压缩算法 版本
                obj: {
                    message_id: server.generateUniqueId(), //服务器端id，防止重复
                    event_type: 'kick',
                    event_obj: {message: "您的账号在别处登录"} //事件内容
                } //消息json信息
            };
            publishForClient(server.clients[client.id], 'user/' + user.id, JSON.stringify(event));
        } else {
            callback(null, true);

        }
    }, function (err) {
        var event = {
            callid: server.generateUniqueId(), //客户端用来区分回调函数的id，客户端自0~1000循环
            type: 'event',
            compress: 0, //类似pomelo 对键值的压缩需要客户端和服务器端实现相同的压缩解压缩算法 版本
            obj: {
                message_id: server.generateUniqueId(), //服务器端id，防止重复
                event_type: 'login_error',
                event_obj: err //事件内容
            } //消息json信息
        };
        publishForClient(client, "user/0", JSON.stringify(event));
        callback(err, false);
    });


};
server.authorizeSubscribe = function (client, topic, callback) {
    logging.log('authorizeSubscribe---->');
    callback(null, true);
};
server.authorizePublish = function (client, topic, payload, callback) {
    //logging.log('authorizePublish---->');
    callback(null, true);
};

server.on('clientConnected', function (client) {
    logging.log('Client Connected:', client.id);
    if (client.user) {
        subscribeForClient(client, "user/" + client.user.id);
        dbservice.query_group_list(client.user.id).then(function (groups) {
            _(groups).each(function (group) {
                subscribeForClient(client, "group/" + group.talkgroup_id);
            });
        });
    }
});

// fired when a client disconnects
server.on('clientDisconnected', function (client) {
    logging.log('Client Disconnected:', client.id);

    if (clients_callback[client.id]) {
        var callback = clients_callback[client.id];
        clients_callback[client.id] = null;
        callback(null, true);
    }

});

server.on('ready', function () {
    logging.log('mqtt is running...');

    //var message = {
    //    topic: 'test',
    //    payload: 'beiti1', // or a Buffer
    //    qos: 1, // 0, 1, or 2
    //    retain: false // or true
    //};
    //var num = 0;
    //setInterval(function (){
    //    server.publish(message);
    //}, 1000);
    main();
});

function handleOrgCommend(event, parms) {
    var defered;
    var event_type = parms.event_type;
    var user_ids = parms.event_obj.user_ids;
    delete parms.event_obj['user_ids'];
    if (event_type == 'org_change' || event_type == 'org_group_change' || event_type == 'org_member_change') {

    }
    defered = Q.defer();
    var payload = {
        callid: server.generateUniqueId(),
        type: 'event',
        compress: 0,
        obj: parms
    };
    _(user_ids).each(function (item) {
        var packet = {
            topic: "user/" + item,
            payload: JSON.stringify(payload),
            qos: 0,
            retain: false
        };
        server.publish(packet);
    });
    defered.resolve({});
    return defered.promise;

    return defered.promise;
}


function handleImGroupCommend(event, group_id, parms) {
    var defered = Q.defer();

    return defered.promise;
}

function handleImFriendCommend(event, group_id, parms) {
    var defered = Q.defer();

    return defered.promise;
}


function handleIMCommend(route, parms) {
    var defered;
    if (route === 'test') {
        defered = Q.defer();
        defered.resolve(parms);
        return defered.promise;
    } else if (route === 'org') {
        return handleOrgCommend(parms.event, parms);
    } else if (route === 'imgroup') {
        return handleImGroupCommend(parms.event, parms.group_id, parms);
    } else if (route === 'imfriend') {
        return handleImFriendCommend(parms.event, parms.group_id, parms);
    } else if (route === 'send_message') {
        return handleMessage(parms.from, parms);
    }
    else {
        defered = Q.defer();
        defered.reject("未知路由");
        return defered.promise;
    }
}


var PROTO_PATH = __dirname + '/api/liyuim.proto';

var grpc = require('grpc');
var im_proto = grpc.load(PROTO_PATH).im;

/**
 * Implements the SayHello RPC method.
 */
function commendIm(call, callback) {

    logging.log('im commend ...');
    var request = JSON.parse(call.request.commend);
    var route = request.route;
    var parms = request.parms;
    handleIMCommend(route, parms).then(function (result) {
        var msg = {success: true, result: result};
        callback(null, {result: JSON.stringify(msg)});
    }, function (err) {
        var msg = {success: false, message: err};
        callback(null, {result: JSON.stringify(msg)});
    });


}

/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
function main() {
    var server = new grpc.Server();
    server.addProtoService(im_proto.MqttCommend.service, {commendIm: commendIm});
    server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
    server.start();
}
