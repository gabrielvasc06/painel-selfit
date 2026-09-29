const path = require('path');
require('dotenv').config(); // Ajuste o caminho do .env se necessário

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
            directory: './src/database/migrations', // Onde os arquivos de migrate ficarão salvos
        },
    },
};