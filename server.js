/**
 * Created by fanjunwei on 16/4/14.
 */
var mosca = require('mosca');
var uuid = require("uuid")
var _ = require('underscore');
var settings = {
    port: 5112,
    backend: {
        type: 'zmq',
        json: false,
        zmq: require("zmq"),
        port: "tcp://127.0.0.1:33333",
        controlPort: "tcp://127.0.0.1:33334",
        delay: 5
    },
    persistence: {
        factory: mosca.persistence.Memory,
        url: "mongodb://localhost:27017/mosca2"
    },
    http: {
        port: 1884,
        bundle: true,
        static: './'
    }
};
var dbservice = require('./service/dao/dbservice')
var server = new mosca.Server(settings);


var clients_callback = {};

server.on('published', function (packet, client, callback) {
    //console.log('Published', packet.payload);
    //callback("sdfsdf")
});

server.authenticate = function (client, username, password, callback) {
    console.log('authenticate---->');

    dbservice.login(username, password.toString(), function (err, user) {
        if (err) {
            callback(err, false);
            return;
        }

        if (server.clients[client.id]) {
            clients_callback[client.id] = callback;


            var event = {
                callid: uuid.v4(), //客户端用来区分回调函数的id，客户端自0~1000循环
                type: 'event',
                compress: 0, //类似pomelo 对键值的压缩需要客户端和服务器端实现相同的压缩解压缩算法 版本
                obj: {
                    message_id: uuid.v4(), //服务器端id，防止重复
                    event_type: 'kick',
                    event_obj: {message:"您的账号在别处登录"} //事件内容
                } //消息json信息
            };
            var message = {
                topic: 'user/'+user.id, //group/{{group_id}}
                payload: event, // or a Buffer
                qos: 1, // 0, 1, or 2
                retain: false // or true
            };

            server.clients[client.id].connection.publish(message);

        } else {
            dbservice.query_group_list(user.id, function (err, groups) {
                if (err) {
                    callback(err, false);
                    return;
                }
                callback(null, true);
                client.handleSubscribe({topic: "/user/" + user.id});
                _(groups).each(function (group) {
                    client.handleSubscribe({topic: "/group/" + group.talkgroup_id});
                });


            });

        }
    });


};
server.authorizeSubscribe = function (client, topic, callback) {
    console.log('authorizeSubscribe---->');
    callback(null, true);
};
server.authorizePublish = function (client, topic, payload, callback) {
    //console.log('authorizePublish---->');
    callback(null, true);
};

server.on('clientConnected', function (client) {
    console.log('Client Connected:', client.id);
});

// fired when a client disconnects
server.on('clientDisconnected', function (client) {
    console.log('Client Disconnected:', client.id);

    if (clients_callback[client.id]) {
        var callback = clients_callback[client.id];
        clients_callback[client.id] = null;

        dbservice.query_group_list(user.id, function (err, groups) {
            if (err) {
                callback(err, false);
                return;
            }
            callback(null, true);
            client.handleSubscribe({topic: "/user/" + user.id});
            _(groups).each(function (group) {
                client.handleSubscribe({topic: "/group/" + group.talkgroup_id});
            });

        });
    }

});

server.on('ready', function () {
    console.log('mqtt is running...');

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
    console.log('sayHello ...');
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