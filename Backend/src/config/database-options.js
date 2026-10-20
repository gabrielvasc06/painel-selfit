const fs = require('node:fs');
require('./env');
const { positiveInteger } = require('./runtime');

function connectionOptions(env = process.env) {
    for (const key of ['DB_HOST', 'DB_USER', 'DB_DATABASE']) {
        if (!env[key]) throw new Error(`${key} deve ser definido no ambiente da API.`);
    }
    if (env.DB_SSL !== undefined && !['true', 'false'].includes(env.DB_SSL)) {
        throw new Error('DB_SSL deve ser true ou false.');
    }
    return {
        host: env.DB_HOST,
        port: positiveInteger(env.DB_PORT, 3306, 'DB_PORT'),
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_DATABASE,
        connectTimeout: 10000,
        ...(env.DB_SSL === 'true' ? {
            ssl: {
                rejectUnauthorized: true,
                ...(env.DB_SSL_CA_FILE ? { ca: fs.readFileSync(env.DB_SSL_CA_FILE, 'utf8') } : {}),
            },
        } : {}),
    };
}

module.exports = { connectionOptions };
