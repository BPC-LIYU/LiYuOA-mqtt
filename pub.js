/**
 * Created by fanjunwei on 16/4/14.
 */
/*jslint node: true */
"use strict";
var mqtt = require('mqtt');

var client = mqtt.connect("mqtt://localhost:5112",{username:"x","password":"x"});

//client.subscribe('presence');
var num = 0;
setInterval(function (){
    client.publish('test', 'Hello mqtt ' + (num++),{qos:0, retain: true});
}, 1000);