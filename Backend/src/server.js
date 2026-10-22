// Entrada do processo: valida ambiente/banco, monta dependencias e gerencia desligamento.
﻿require('./config/env');
const { validateRuntime } = require('./config/runtime');

async function start() {
    const { port, host, production } = validateRuntime();
    const pool = require('./config/database');
    let server;
    try {
        await require('./config/verify-schema').verifySchema(pool);
        const { createApp } = require('./config/app');
        const app = createApp();
        server = await new Promise((resolve, reject) => {
            const listener = app.listen(port, host, () => resolve(listener));
            listener.once('error', reject);
        });
        console.log(`Painel Selfit rodando na :  ${port} (${production ? 'production' : 'development'}).`);
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
