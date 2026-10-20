require('./env');

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
    if (production) {
        if (!env.DB_PASSWORD) throw new Error('DB_PASSWORD deve ser definido em producao.');
        if (env.JWT_SECRET.length < 32 || /troque|change.?me|exemplo/i.test(env.JWT_SECRET)) {
            throw new Error('JWT_SECRET deve ser uma chave aleatoria de pelo menos 32 caracteres.');
        }
        if (!env.FRONT) throw new Error('FRONT deve conter a origem publica do painel em producao.');
        if (!env.ACCESS_ALLOWED_CIDRS) throw new Error('ACCESS_ALLOWED_CIDRS deve definir as redes autorizadas em producao.');
        if (!env.ACCESS_ALLOWED_USERS) throw new Error('ACCESS_ALLOWED_USERS deve definir os usuarios autorizados em producao.');
    }
    for (const origin of String(env.FRONT || '').split(',').filter(Boolean)) {
        const parsed = new URL(origin.trim());
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin.trim()) {
            throw new Error('FRONT deve conter origens HTTP(S), sem caminhos ou barra final.');
        }
    }
    return { production, port: positiveInteger(env.PORT, 3000, 'PORT'), host: env.HOST || '0.0.0.0' };
}

module.exports = { positiveInteger, validateRuntime };
