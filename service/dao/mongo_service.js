var MongoClient = require('mongodb').MongoClient;
var logging = require('../log_service');
MongoClient.connect(url, function (err, db) {
    if (err)
        logging.error(err);

    db.close();
});