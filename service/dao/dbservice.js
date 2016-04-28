/**
 * Created by wangjian on 16/4/26.
 */

var Sequelize = require('sequelize');
var config = require('../../config');
var Q = require('q');

var sequelize = new Sequelize(config.database.name, config.database.username, config.database.password, config.database.options);

//用户 、群
var User = sequelize.define("liyuoa_lyuser", {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        field: 'id'
    },
    imusername: {
        type: Sequelize.STRING,
        field: 'imusername'
    },
    impassword: {
        type: Sequelize.STRING,
        field: 'impassword'
    },
    is_active: {
        type: Sequelize.BOOLEAN,
        field: 'is_active'
    }
}, {freezeTableName: true, timestamps: false});


var TalkGroup = sequelize.define("liyuim_talkuser", {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        field: 'id'
    },
    talkgroup_id: {
        type: Sequelize.INTEGER,
        field: 'talkgroup_id'
    },
    user_id: {
        type: Sequelize.INTEGER,
        field: 'user_id'
    },
    is_active: {
        type: Sequelize.BOOLEAN,
        field: 'is_active'
    }
}, {freezeTableName: true, timestamps: false});

module.exports.login = function (username, passowrd) {
    var defered = Q.defer();
    //var self = this;
    User.findOne({
        where: {
            imusername: username,
            impassword: passowrd
        }
    }).then(function (user) {
        if (user) {
            defered.resolve(user.dataValues);
        }
        else {
            defered.reject({message: "im login error:用户名或密码错误", code: 501})
        }

    }, function (error) {
        defered.reject(error);
    });
    return defered.promise;
};


module.exports.query_group_list = function (user_id, cb) {
    var defered = Q.defer();
    TalkGroup.findAll({
        where: {
            user_id: 1,
            is_active: true
        }
    }).then(function (talkgroups) {
        defered.resolve(talkgroups.dataValues);
    }, function (error) {
        defered.reject(error);
    });
    return defered.promise;
};
