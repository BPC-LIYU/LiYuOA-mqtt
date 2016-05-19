/*jslint node: true */
"use strict";
/**
 * Created by fanjunwei on 16/4/14.
 */
var mqtt = require('mqtt');

var client = mqtt.connect("mqtt://localhost:5112", {clientId: '123', username:'11', password:'22', clean: false});

client.subscribe('test', {qos: 1});

client.on('message', function (topic, message) {
    if(message.toString() === "beiti"){
        client.end();
    }
    console.log(topic, message.toString());
});