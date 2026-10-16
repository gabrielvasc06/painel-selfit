const mysql = require('mysql2/promise');
const { connectionOptions } = require('./database');
const { positiveInteger } = require('./runtime');

module.exports = mysql.createPool({
    ...connectionOptions(),
    waitForConnections: true,
    connectionLimit: positiveInteger(process.env.DB_POOL_SIZE, 10, 'DB_POOL_SIZE', 100),
    queueLimit: 100,
    enableKeepAlive: true,
});
