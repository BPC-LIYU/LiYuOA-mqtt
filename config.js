/**
 * Created by fanjunwei on 16/4/27.
 */
var mosca = require('mosca');
module.exports = {
    // database: {
    //     name: "database",
    //     username: "username",
    //     password: "password",
    //     options: {
    //         host: 'localhost',
    //         dialect: 'sqlite',
    //
    //         pool: {
    //             max: 5,
    //             min: 0,
    //             idle: 10000
    //         },
    //
    //         // SQLite only
    //         storage: '/Users/wangjian/work/django/LiYuOA/db.sqlite3'
    //     }
    // },
    database: {
        name: "ly",
        username: "root",
        password: "root",
        options: {
            host: 'localhost',
            dialect: 'mysql',
            pool: {
                max: 5,
                min: 0,
                idle: 10000
            }
        }
    },
    mqtt: {
        port: 5112,
        backend: {
            type: 'zmq',
            json: false,
            zmq: require("zmq"),
            port: "tcp://127.0.0.1:33333",
            controlPort: "tcp://127.0.0.1:33334",
            delay: 5
        },
        persistence: {
            factory: mosca.persistence.Memory,
            url: "mongodb://localhost:27017/mosca2"
        },
        http: {
            port: 1884,
            bundle: true,
            static: './'
        }
    }
};