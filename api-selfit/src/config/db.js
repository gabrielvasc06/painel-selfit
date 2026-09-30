// Arquivo: api-selfit/src/config/db.js
// Serve para: arquivo de codigo do sistema; participa da implementacao do painel Selfit.

const mysql = require('mysql2/promise');
const { envPath } = require('./env');

for (const key of ['DB_HOST', 'DB_USER', 'DB_DATABASE']) {
    if (!process.env[key]) {
        throw new Error(`${key} nao definido. Verifique o arquivo .env da API em: ${envPath}`);
    }
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Conexão com o MySQL estabelecida com sucesso!');
        connection.release();
    } catch (error) {
        console.error('Erro ao conectar ao MySQL:', error.message);
    }
}

testConnection();

module.exports = pool;
