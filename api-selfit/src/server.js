require('./config/env');
const { validateRuntime } = require('./config/runtime');

async function start() {
    const { port, host, production } = validateRuntime();
    const pool = require('./config/db');
    let server;
    try {
        const schema = {
            usuarios: 'id, usuario, senha_hash, senha_provisoria',
            unidades: 'id, nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero',
            equipamentos: 'id, unidade_id, nome_identificacao, categoria, marca, status, data_garantia, deleted_at, created_at, updated_at',
            tvs: 'id, unidade_id, nome_identificacao, categoria, marca, status, data_garantia, deleted_at, created_at, updated_at',
            cameras: 'id, unidade_id, nome_identificacao, categoria, marca, status, data_garantia, deleted_at, created_at, updated_at',
            manutencoes: 'id, item_tipo, item_id, descricao, data_envio, data_retorno, custo, status_manutencao',
        };
        for (const [table, columns] of Object.entries(schema)) {
            await pool.query({ sql: `SELECT ${columns} FROM ${table} LIMIT 0`, timeout: 10000 });
        }
        const { createApp } = require('./app');
        const app = createApp();
        server = await new Promise((resolve, reject) => {
            const listener = app.listen(port, host, () => resolve(listener));
            listener.once('error', reject);
        });
        console.log(`Painel Selfit rodando na porta ${port} (${production ? 'production' : 'development'}).`);
    } catch (error) {
        await pool.end();
        throw error;
    }
    let stopping = false;
    function shutdown(signal) {
        if (stopping) return;
        stopping = true;
        console.log(`Encerrando aplicacao: ${signal}.`);
        const timeout = setTimeout(() => process.exit(1), 25000);
        timeout.unref();
        server.close(async () => {
            try {
                await pool.end();
                clearTimeout(timeout);
                process.exitCode = 0;
            } catch {
                process.exitCode = 1;
            }
        });
        server.closeIdleConnections();
    }
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
}
start().catch((error) => {
    console.error('Falha ao iniciar a aplicacao:', error.code || error.message);
    process.exitCode = 1;
});
