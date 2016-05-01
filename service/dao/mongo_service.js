var MongoClient = require('mongodb').MongoClient;
var config = require('../../config');
var logging = require('../log_service');
var _ = require('underscore');
var Q = require('q');
var exports = module.exports;
function mongoConnect() {
    var defered = Q.defer();
    MongoClient.connect(config.mongo.url, function (err, db) {
        if (err) {
            logging.error(err);
            defered.reject(err);
        }
        else {
            defered.resolve(db);
        }
    });
    return defered.promise;
}

var insertOne = exports.insertOne = function (table, obj) {
    return mongoConnect().then(function (db) {
        var collection = db.collection(table);
        var result = Q.nfcall(collection.insertOne.bind(collection), obj);
        result.then(function () {
            db.close();
        }, function () {
            db.close();
        });
        return result;
    });
};
var find = exports.find = function (table, query) {
    query = query || {};
    return mongoConnect().then(function (db) {
        var defered = Q.defer();
        var cursor = db.collection(table).find(query);
        var result = cursor.toArray();
        result.then(function (result) {
            defered.resolve(result);
            db.close();
        }, function (error) {
            defered.reject(error);
            db.close();
        });
        return defered.promise;
    });
};
var eval = exports.eval = function (js, parameters) {
    return mongoConnect().then(function (db) {
        var defered = Q.defer();
        db.eval(js, parameters, function (err, result) {
            if (err) {
                defered.reject(err);
            }
            else {
                defered.resolve(result);
            }
            db.close();
        });
        return defered.promise;
    });
};
var update = exports.update = function (table, query, set_obj) {
    query = query || {};
    set_obj = set_obj || {};
    return mongoConnect().then(function (db) {
        var collection = db.collection(table);
        var result = Q.nfcall(collection.updateOne.bind(collection), query, {"$set": set_obj});
        result.then(function () {
            db.close();
        }, function () {
            db.close();
        });
        return result;
    });
};

var updateOrInsert = exports.updateOrInsert = function (table, query, set_obj, default_obj) {
    query = query || {};
    set_obj = set_obj || {};
    return mongoConnect().then(function (db) {
        var collection = db.collection(table);
        var result = Q.nfcall(collection.updateOne.bind(collection), query, {"$set": set_obj}).then(function (update_result) {
            if (update_result.modifiedCount > 0) {
                return update_result;
            }
            else {
                if (default_obj) {
                    _(set_obj).extend(default_obj);
                }
                return Q.nfcall(collection.insertOne.bind(collection), set_obj);
            }
        });
        result.then(function (result) {
            db.close();
        }, function () {
            db.close();
        });
        return result;
    });
};
exports.addMessage = function (message) {
    return insertOne('message', message);
};

exports.addChatSession = function (chat_session) {
    return updateOrInsert('chat_session', {session_id: chat_session.session_id}, chat_session, {read_time: (new Date).valueOf()});
};

exports.queryChatSessionList = function (user_id) {
    var query = function (owner) {
        var result = [];
        db.getCollection('chat_session').find({"owner": owner}).sort({"last_message_time": -1}).limit(50).forEach(function (item) {
            var read_time = item.read_time;
            var unread = db.getCollection('message').find({"time": {"$gt": read_time}}).count();
            item.unread = unread;
            result.push(item);
        });
        return result;

    };
    return eval(query.toString(), [user_id]);
};

exports.setChatSessionReadTime = function (session_id, time) {
    return update('chat_session', {session_id: session_id}, {read_time: time});
};
exports.getChatHistory = function (session_id, last_time) {
    var query = function (fuser, target, target_type, last_time) {
        var q_json = {
            "target_type": target_type,
            "$or": [{"fuser": fuser, "target": target}, {"fuser": target, "target": fuser}]
        };
        if (last_time) {
            q_json['time'] = {"$lt": last_time};
        }
        return db.getCollection('message').find(q_json).sort({"time": 1}).limit(20).toArray();
    };
    var parms = session_id.split('_');
    if (parms.length === 3) {
        var fuser = parseInt(parms[0]);
        var target = parseInt(parms[2]);
        var target_type;
        if (parms[1] == 'g') {
            target_type = 1;
        }
        else {
            target_type = 0;
        }
        return eval(query.toString(), [fuser, target, target_type, last_time]);
    }
    else {
        var defered = Q.defer();
        defered.reject({message: "session_id格式错误"});
        return defered.promise;
    }

};