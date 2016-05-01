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
        db.getCollection('chat_session').find({"owner": owner}).forEach(function (item) {
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