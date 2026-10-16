require('../src/config/env');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { connectionOptions } = require('../src/config/database');

async function main() {
    const usuario = process.env.BOOTSTRAP_USER?.trim().toUpperCase();
    const senha = process.env.BOOTSTRAP_PASSWORD;
    if (!usuario || usuario.length > 100 || !senha || senha.trim() !== senha || senha.length < 12 || Buffer.byteLength(senha, 'utf8') > 72) {
        throw new Error('Defina BOOTSTRAP_USER (ate 100 caracteres) e BOOTSTRAP_PASSWORD (12 a 72 bytes, sem espacos nas extremidades).');
    }
    const db = await mysql.createConnection(connectionOptions());
    try {
        const [existing] = await db.query('SELECT id FROM usuarios WHERE usuario = ? LIMIT 1', [usuario]);
        if (existing.length) throw new Error('Usuario ja existe. Nenhuma senha foi alterada.');
        await db.query('INSERT INTO usuarios (usuario, senha_hash, senha_provisoria) VALUES (?, ?, ?)',
            [usuario, await bcrypt.hash(senha, 12), false]);
        console.log('Usuario criado com sucesso.');
    } finally {
        await db.end();
    }
}
main().catch((error) => {
    console.error('Falha ao criar usuario:', error.code || error.message);
    process.exitCode = 1;
});
