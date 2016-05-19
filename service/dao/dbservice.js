/**
 * Created by wangjian on 16/4/26.
 */
/*jslint node: true */
"use strict";
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
    realname: {
        type: Sequelize.STRING,
        field: 'realname'
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


var TalkGroupUser = sequelize.define("liyuim_talkuser", {
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

var TalkGroup = sequelize.define("liyuim_talkgroup", {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        field: 'id'
    },
    owner_id: {
        type: Sequelize.INTEGER,
        field: 'owner_id'
    },
    name: {
        type: Sequelize.STRING,
        field: 'name'
    },
    max_member_count: {
        type: Sequelize.INTEGER,
        field: 'max_member_count'
    },
    group_type: {
        type: Sequelize.INTEGER,
        field: 'group_type'
    },
    is_add: {
        type: Sequelize.BOOLEAN,
        field: 'is_add'
    },
    flag: {
        type: Sequelize.STRING,
        field: 'flag'
    },
    icon_url: {
        type: Sequelize.STRING,
        field: 'icon_url'
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
            defered.reject({message: "im login error:用户名或密码错误", code: 501});
        }

    }, function (error) {
        defered.reject(error);
    });
    return defered.promise;
};

/**
 * 修改获取分组函数,使用正确参数, 除去cb 使用promise
 * by:王健 at:2016-04-29
 * @param user_id
 * @returns {*}
 */
module.exports.query_group_list = function (user_id) {
    var defered = Q.defer();
    TalkGroupUser.findAll({
        where: {
            user_id: user_id,
            is_active: true
        }
    }).then(function (talkgroups) {
        defered.resolve(talkgroups.dataValues);
    }, function (error) {
        defered.reject(error);
    });
    return defered.promise;
};


module.exports.query_group_members = function (group_id) {
    var defered = Q.defer();
    TalkGroupUser.findAll({
        where: {
            talkgroup_id: group_id,
            is_active: true
        }
    }).then(function (users) {
        defered.resolve(users.dataValues);
    }, function (error) {
        defered.reject(error);
    });
    return defered.promise;
};

module.exports.get_group_info = function (group_id) {
    var defered = Q.defer();
    TalkGroup.findOne({
        where: {
            id: group_id
        }
    }).then(function (talkgroup) {
        if (talkgroup) {
            defered.resolve(talkgroup.dataValues);
        }
        else {
            defered.reject({message: "不存在此分组"});
        }

    }, function (error) {
        defered.reject(error);
    });
    return defered.promise;
};

module.exports.get_user_info = function (user_id) {
    var defered = Q.defer();
    //var self = this;
    User.findOne({
        where: {
            id: user_id
        }
    }).then(function (user) {
        if (user) {
            defered.resolve(user.dataValues);
        }
        else {
            defered.reject({message: "不存在此用户"});
        }

    }, function (error) {
        defered.reject(error);
    });
    return defered.promise;
};
