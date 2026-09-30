// Arquivo: api-selfit/knexfile.js
// Serve para: arquivo de codigo do sistema; participa da implementacao do painel Selfit.

const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env'), quiet: true });

module.exports = {
    development: {
        client: 'mysql2',
        connection: {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
        },
        migrations: {
            directory: './src/database/migrations',
        },
    },
};
