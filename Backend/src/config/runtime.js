require('./env');
const proxyaddr = require('proxy-addr');

function parseList(value) {
    return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function positiveInteger(value, fallback, name, maximum = 65535) {
    const parsed = Number(value ?? fallback);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > maximum) {
        throw new Error(`${name} deve ser um inteiro entre 1 e ${maximum}.`);
    }
    return parsed;
}

function validateRuntime(env = process.env) {
    for (const key of ['DB_HOST', 'DB_USER', 'DB_DATABASE', 'JWT_SECRET']) {
        if (!env[key]?.trim()) throw new Error(`${key} deve ser definido no ambiente da API.`);
    }
    const production = env.NODE_ENV === 'production';
    const origins = parseList(env.FRONT);
    const networks = parseList(env.ACCESS_ALLOWED_CIDRS);
    const users = parseList(env.ACCESS_ALLOWED_USERS);
    if (production) {
        if (!env.DB_PASSWORD) throw new Error('DB_PASSWORD deve ser definido em producao.');
        if (env.JWT_SECRET.length < 32 || /troque|change.?me|exemplo/i.test(env.JWT_SECRET)) {
            throw new Error('JWT_SECRET deve ser uma chave aleatoria de pelo menos 32 caracteres.');
        }
        if (!origins.length) throw new Error('FRONT deve conter a origem publica do painel em producao.');
        if (!networks.length) throw new Error('ACCESS_ALLOWED_CIDRS deve definir as redes autorizadas em producao.');
        if (!users.length) throw new Error('ACCESS_ALLOWED_USERS deve definir os usuarios autorizados em producao.');
    }
    for (const origin of origins) {
        let parsed;
        try { parsed = new URL(origin); } catch { /* Mensagem unica para configuracao invalida. */ }
        if (!parsed || !['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
            throw new Error('FRONT deve conter origens HTTP(S), sem caminhos ou barra final.');
        }
    }
    // Valida antes de abrir conexoes: um CIDR errado nao deve derrubar o servico
    // somente depois da verificacao do banco ou na primeira requisicao.
    for (const [key, ranges] of [['ACCESS_ALLOWED_CIDRS', networks], ['TRUST_PROXY', parseList(env.TRUST_PROXY)]]) {
        try { proxyaddr.compile(ranges); } catch {
            throw new Error(`${key} deve conter IPs ou redes CIDR validos, separados por virgula.`);
        }
    }
    return { production, port: positiveInteger(env.PORT, 3000, 'PORT'), host: env.HOST?.trim() || '0.0.0.0' };
}

module.exports = { parseList, positiveInteger, validateRuntime };
