/**
 * Created by fanjunwei on 16/4/27.
 */
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
        persistence: {
            factory: "mongo",
            url: "mongodb://localhost:27017/mosca2"
        },
        http: {
            port: 1884,
            bundle: true,
            static: './'
        }
    }
};