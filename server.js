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
function handleRequest(route, parms, cb) {
    if (route === 'test') {
        cb(parms);
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
            handleRequest(route, parms, function (result) {
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
            })
        }
    }


});

server.authenticate = function (client, username, password, callback) {
    logging.log('authenticate---->');

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
            publishForClient(server.clients[client.id], 'user/' + user.id, JSON.stringify(event))

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

var PROTO_PATH = __dirname + '/api/helloworld.proto';

var grpc = require('grpc');
var hello_proto = grpc.load(PROTO_PATH).helloworld;

/**
 * Implements the SayHello RPC method.
 */
function sayHello(call, callback) {
    var message = {
        topic: 'test',
        payload: '1111111', // or a Buffer
        qos: 1, // 0, 1, or 2
        retain: false // or true
    };
    server.publish(message);
    logging.log('sayHello ...');
    callback(null, {message: 'Hello ' + call.request.name});
}

/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
function main() {
    var server = new grpc.Server();
    server.addProtoService(hello_proto.Greeter.service, {sayHello: sayHello});
    server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
    server.start();
}
