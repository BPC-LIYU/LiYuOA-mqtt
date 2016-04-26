/**
 * Created by fanjunwei on 16/4/14.
 */
var mosca = require('mosca');
var settings = {
    port: 5112,
    backend:{
        type: 'zmq',
        json: false,
        zmq: require("zmq"),
        port: "tcp://127.0.0.1:33333",
        controlPort: "tcp://127.0.0.1:33334",
        delay: 5
    },
    persistence:{
        factory: mosca.persistence.Memory,
        url: "mongodb://localhost:27017/mosca2"
    },
    http: {
        port: 1884,
        bundle: true,
        static: './'
    }
};
var server = new mosca.Server(settings);

server.on('published', function(packet, client,callback) {
     //console.log('Published', packet.payload);
    //callback("sdfsdf")
});

server.authenticate = function(client, username, password, callback) {
    console.log('authenticate---->');
    if(server.clients[client.id]){
        var message = {
            topic: 'test',
            payload: 'beiti', // or a Buffer
            qos: 1, // 0, 1, or 2
            retain: false // or true
        };
        server.publish(message, function(){
            console.log('=------------------------------------------------');
            callback(null, true);
        });
    }else{
        callback(null, true);
    }

};
server.authorizeSubscribe = function(client, topic, callback) {
    console.log('authorizeSubscribe---->');
    callback(null, true);
};
server.authorizePublish = function(client, topic,payload, callback) {
    //console.log('authorizePublish---->');
    callback(null, true);
};

server.on('clientConnected', function(client) {
    console.log('Client Connected:', client.id);
});

// fired when a client disconnects
server.on('clientDisconnected', function(client) {
    console.log('Client Disconnected:', client.id);
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