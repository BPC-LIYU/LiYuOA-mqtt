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
        if(message[item] === undefined){
            is_ok = false;
            console.log(item + "属性没有提供");
        }
    });
    return is_ok;
}


function handleMessage(client, parms, cb) {
    if(check_msg(parms, ["fname","target_type", "target", "ctype", "content", "id_client", "push_content", "is_push", "is_unreadable"])){
        cb(false);
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
        message.session_id = message.fuser + "_g_" + message.target;
        message.readuserlist = [];
        _(message.userlist).each(function (id) {
            message.readuserlist.push({user_id: id, is_read: false, time: null});
        })
    }
    else {
        message.session_id = message.fuser + "_p_" + message.target;
    }
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
        cb(true);
    }, function () {
        cb(false);
    })
}

function handleRequest(client, route, parms, cb) {
    if (route === 'test') {
        cb(parms);
    }
    else if (route === 'send_client_info') {
        client.client_info = parms;
    }
    else if (route === 'send_message') {

        handleMessage(client, parms, cb);
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
            handleRequest(client, route, parms, function (result) {
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
    dbservice.login(username, password).then(function (user) {
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



function handleIMCommend(route, parms, cb) {
    if (route === 'test') {
        cb(parms);
    }
    else if (route === 'send_client_info') {
        client.client_info = parms;
    }
    else if (route === 'send_message') {

        handleMessage(client, parms, cb);
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
    request = JSON.parse(call.request.commend);
    handleIMCommend(request.route, request.parms, function (err, result) {
        var msg = null;
        if(err){
            msg ={success:false, message:err}
        }else{
            msg = {success:true, result: result}
        }
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
