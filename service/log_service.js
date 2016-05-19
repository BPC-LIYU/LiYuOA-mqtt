/**
 * Created by fanjunwei on 16/4/28.
 */
/*jslint node: true */
"use strict";
var log4js = require('log4js');
var config = require('../config');
log4js.configure(config.logging);
log4js.setGlobalLogLevel(log4js.levels.DEBUG);
var exports = module.exports;
var debug = log4js.getLogger("debug");
var error = log4js.getLogger("error");
function timestamp() {
    return (new Date()).valueOf();
}
exports.log = function () {
    debug.debug.apply(debug, arguments);
};
exports.debug = function () {
    debug.debug.apply(debug, arguments);
};
exports.info = function () {
    debug.info.apply(debug, arguments);
};
exports.error = function () {
    error.error.apply(error, arguments);
};