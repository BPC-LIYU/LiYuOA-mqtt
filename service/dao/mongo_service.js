var MongoClient = require('mongodb').MongoClient;
var config = require('../../config');
var logging = require('../log_service');
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
exports.addMessage = function (message) {
    return insertOne('message', message);
};