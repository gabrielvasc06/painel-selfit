require('../src/config/env');
const pool = require('../src/config/database');
const { createContainer } = require('../src/config/container');

// A CLI reutiliza o mesmo caso de uso do HTTP. Nao sobrescreve contas existentes.
async function main() {
    try {
        const users = createContainer(pool).users;
        await users.create({ usuario: process.env.BOOTSTRAP_USER, senha: process.env.BOOTSTRAP_PASSWORD }, { provisional: false });
        console.log('Usuario criado com sucesso.');
    } finally { await pool.end(); }
}
main().catch((error) => {
    console.error('Falha ao criar usuario:', error.code || error.message);
    process.exitCode = 1;
});
