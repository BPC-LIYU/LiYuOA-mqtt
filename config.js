/**
 * Created by fanjunwei on 16/4/27.
 */
var fs = require("fs");
var _ = require('underscore');

var sys_config_path = "/etc/mqtt-server.json";
var config = {};
var data;
function exists(path) {
    try {
        fs.lstatSync(path);
        return true;
    }
    catch (e) {
        return false;
    }
}
var config_path = "./config.json";
data = fs.readFileSync(config_path, "utf-8");
_.extend(config, JSON.parse(data));
if (exists(sys_config_path)) {
    data = fs.readFileSync(sys_config_path, "utf-8");
    _.extend(config, JSON.parse(data));
}


module.exports = config;