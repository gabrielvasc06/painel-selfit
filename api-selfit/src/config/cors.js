// Arquivo: api-selfit/src/config/cors.js
// Serve para: arquivo de codigo do sistema; participa da implementacao do painel Selfit.

const defaultLocalOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
];

function parseOrigins(value) {
    return String(value || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

function getAllowedOrigins() {
    // FRONT pode receber uma ou mais origens separadas por virgula.
    // As portas locais abaixo evitam erro de CORS quando o Vite troca de porta.
    return new Set([
        ...parseOrigins(process.env.FRONT),
        ...defaultLocalOrigins,
    ]);
}

function createCorsOptions() {
    const allowedOrigins = getAllowedOrigins();

    return {
        origin(origin, callback) {
            // Requisicoes sem origin aparecem em testes, scripts e ferramentas como Workbench/Postman.
            if (!origin || allowedOrigins.has(origin)) return callback(null, true);
            return callback(new Error(`Origem nao permitida pelo CORS: ${origin}`));
        },
    };
}

module.exports = {
    createCorsOptions,
    getAllowedOrigins,
};
