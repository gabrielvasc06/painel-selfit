const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
Object.assign(process.env, {
    NODE_ENV: 'production', JWT_SECRET: 'test-only-secret-with-64-characters-0123456789abcdef0123456789abcdef',
    DB_HOST: '127.0.0.1', DB_USER: 'test', DB_DATABASE: 'test', DB_PASSWORD: 'test',
    FRONT: 'https://painel.example.com', ACCESS_ALLOWED_CIDRS: '127.0.0.1/32,::1/128',
    ACCESS_ALLOWED_USERS: 'TI.TESTE,TI.ADMIN', USER_ADMIN_USERS: 'TI.ADMIN',
});
delete process.env.TRUST_PROXY;
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
// Bloqueia qualquer acesso ao banco real: estes testes verificam a barreira HTTP.
let queries = 0;
let activeUser = true;
pool.query = async (sql) => {
    if (sql.startsWith('SELECT id FROM usuarios WHERE')) return [activeUser ? [{ id: 1 }] : []];
    queries++;
    throw new Error('Banco nao deve ser acessado neste teste');
};
const { createApp } = require('../src/app');
const { validateRuntime } = require('../src/config/runtime');
const { connectionOptions } = require('../src/config/database');
let server, base, staticDir, ready = true;
const token = (usuario = 'TI.TESTE', options = {}) => jwt.sign({ id: 1, usuario }, process.env.JWT_SECRET, { expiresIn: '5m', ...options });
async function request(route, options = {}) {
    return fetch(base + route, options);
}
before(async () => {
    staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'selfit-http-'));
    fs.mkdirSync(path.join(staticDir, 'assets'));
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html><body>Selfit production</body></html>');
    fs.writeFileSync(path.join(staticDir, 'assets/app.js'), 'console.log("selfit")');
    const app = createApp({ staticDir, database: { query: async () => { if (!ready) throw new Error('offline'); } } });
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    await pool.end();
    fs.rmSync(staticDir, { recursive: true, force: true });
});

test('todas as operacoes de dados rejeitam chamadas sem JWT, nos dois prefixos', async () => {
    for (const prefix of ['', '/api']) {
        for (const [method, route] of [
            ['GET', '/unidades'], ['GET', '/equipamentos/consultar'], ['GET', '/equipamentos/garantia'],
            ['GET', '/equipamentos/manutencao'], ['POST', '/register'], ['POST', '/register/unidades'],
            ['POST', '/register/unidades/bulk'], ['POST', '/register/equipamentos'],
            ['PUT', '/unidades/1'], ['DELETE', '/unidades/1'], ['PUT', '/equipamentos/TV:1'],
            ['DELETE', '/equipamentos/TV:1'], ['POST', '/manutencoes'],
            ['PUT', '/manutencoes/1'], ['DELETE', '/manutencoes/1'],
        ]) assert.equal((await request(prefix + route, { method })).status, 401, `${method} ${prefix}${route}`);
    }
    assert.equal(queries, 0);
});
test('rejeita token expirado, assinatura diferente, algoritmo e usuario fora da lista', async () => {
    for (const value of [
        'invalido', token('TI.TESTE', { expiresIn: -1 }), token('ESTRANHO'),
        token('TI.TESTE', { algorithm: 'HS384' }),
        jwt.sign({ id: 1, usuario: 'TI.TESTE' }, 'outra-chave'),
    ]) assert.equal((await request('/api/unidades', { headers: { Authorization: `Bearer ${value}` } })).status, 401);
    assert.equal(queries, 0);
});
test('cadastro de usuarios exige administrador sem bloquear cadastro de inventario', async () => {
    const headers = { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' };
    assert.equal((await request('/api/register', { method: 'POST', headers, body: '{}' })).status, 403);
    assert.equal((await request('/api/register/unidades', { method: 'POST', headers, body: '{}' })).status, 400);
    assert.equal((await request('/api/register/equipamentos', { method: 'POST', headers, body: '{}' })).status, 400);
    headers.Authorization = `Bearer ${token('TI.ADMIN')}`;
    assert.equal((await request('/api/register', { method: 'POST', headers, body: '{}' })).status, 400);
    assert.equal(queries, 0);
});
test('remover a conta revoga um JWT ainda valido', async () => {
    const headers = { Authorization: `Bearer ${token()}` };
    assert.equal((await request('/api/session', { headers })).status, 200);
    activeUser = false;
    try {
        assert.equal((await request('/api/session', { headers })).status, 401);
    } finally { activeUser = true; }
});
test('CORS nega origem estranha e nao substitui a autenticacao', async () => {
    assert.equal((await request('/api/unidades', { headers: { Origin: 'https://estranho.example' } })).status, 403);
    const response = await request('/api/unidades', { headers: { Origin: process.env.FRONT } });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), process.env.FRONT);
    assert.equal((await request('/api/health', { headers: { Origin: 'http://localhost:5174' } })).status, 403);
});
test('lista de redes bloqueia IPs fora da faixa e ignora X-Forwarded-For sem proxy confiavel', async () => {
    process.env.ACCESS_ALLOWED_CIDRS = '192.0.2.0/24';
    const denied = createApp({ staticDir });
    const listener = denied.listen(0, '127.0.0.1');
    await new Promise((resolve) => listener.once('listening', resolve));
    try {
        const response = await fetch(`http://127.0.0.1:${listener.address().port}/api/health`, { headers: { 'X-Forwarded-For': '192.0.2.10' } });
        assert.equal(response.status, 403);
    } finally {
        await new Promise((resolve) => { listener.close(resolve); listener.closeAllConnections(); });
        process.env.ACCESS_ALLOWED_CIDRS = '127.0.0.1/32,::1/128';
    }
    assert.equal((await request('/api/health', { headers: { 'X-Forwarded-For': '203.0.113.1' } })).status, 200);
});
test('readiness indica falha do banco sem revelar dados e liveness continua ativo', async () => {
    assert.equal((await request('/api/ready')).status, 200);
    ready = false;
    const response = await request('/api/ready');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { sucesso: false, status: 'unavailable' });
    assert.equal((await request('/api/health')).status, 200);
    ready = true;
});
test('serve SPA, assets e cabecalhos seguros sem expor arquivos internos ou Swagger', async () => {
    const page = await request('/');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Selfit production/);
    assert.equal(page.headers.get('x-powered-by'), null);
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
    assert.match(page.headers.get('content-security-policy'), /connect-src 'self'/);
    assert.match(page.headers.get('cache-control'), /no-cache/);
    const asset = await request('/assets/app.js');
    assert.match(asset.headers.get('cache-control'), /immutable/);
    assert.equal((await request('/assets/ausente.js')).status, 404);
    assert.equal((await request('/.env')).status, 404);
    assert.equal((await request('/api/ausente', { headers: { Authorization: `Bearer ${token()}` } })).status, 404);
    assert.equal((await request('/api/api-docs', { headers: { Authorization: `Bearer ${token()}` } })).status, 404);
});
test('JSON invalido e corpo ausente retornam 400; login nao autorizado nao consulta banco', async () => {
    assert.equal((await request('/api/auth', { method: 'POST' })).status, 400);
    assert.equal((await request('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
    assert.equal((await request('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'ESTRANHO', senha: 'qualquer' }) })).status, 401);
    assert.equal(queries, 0);
});
test('limita tentativas repetidas de login', async () => {
    let response;
    for (let index = 0; index < 31; index++) response = await request('/api/auth', { method: 'POST' });
    assert.equal(response.status, 429);
});
test('producao recusa configuracao incompleta e TLS do banco nunca desativa validacao', () => {
    const env = { ...process.env };
    assert.equal(validateRuntime(env).production, true);
    for (const key of ['JWT_SECRET', 'ACCESS_ALLOWED_CIDRS', 'ACCESS_ALLOWED_USERS', 'DB_PASSWORD', 'FRONT']) {
        assert.throws(() => validateRuntime({ ...env, [key]: '' }));
    }
    assert.throws(() => validateRuntime({ ...env, JWT_SECRET: 'curta' }));
    assert.throws(() => validateRuntime({ ...env, PORT: '-1' }));
    assert.equal(connectionOptions({ ...env, DB_SSL: 'true' }).ssl.rejectUnauthorized, true);
});
