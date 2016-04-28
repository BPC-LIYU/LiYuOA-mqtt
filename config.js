/**
 * Created by fanjunwei on 16/4/27.
 */
var fs = require("fs");

var sys_config_path = "/etc/mqtt-server.json";
var config = {};
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
if (exists(sys_config_path)) {
    config_path = sys_config_path;
}
var data = fs.readFileSync(config_path, "utf-8");

module.exports = JSON.parse(data);