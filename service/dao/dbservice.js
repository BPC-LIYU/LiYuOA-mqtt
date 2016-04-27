/**
 * Created by wangjian on 16/4/26.
 */

var Sequelize = require('sequelize');
var config = require('../../config');

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

module.exports.login = function (username, passowrd, cb) {
    //var self = this;
    User.findOne({
        where: {
            imusername: username,
            impassword: passowrd
        }
    }).then(function (user) {
        //self.query_group_list(user.id, function(err, talkgroups){
        //    if(err){
        //        cb(err, null);
        //        return;
        //    }
        //
        //});
        cb(false, user.dataValues);

    }, function (error) {
        cb(true, null);
    });
};


module.exports.query_group_list = function (user_id, cb) {
    TalkGroup.findAll({
        where: {
            user_id: 1,
            is_active: true
        }
    }).then(function (talkgroups) {
        cb(false, talkgroups.dataValues);
    }, function (error) {
        cb(true, null);
    });
};
