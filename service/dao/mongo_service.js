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
        return Q.nfcall(collection.insertOne.bind(collection), obj);
    });
};
var find = exports.find = function (table, query) {
    query = query || {};
    return mongoConnect().then(function (db) {
        return db.collection(table).find(query);
    });
};