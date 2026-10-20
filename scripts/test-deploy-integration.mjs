import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'Backend/package.json'));
require('./src/config/env');
const mysql = require('mysql2/promise');
const { connectionOptions } = require('./src/config/database-options');
const schema = `selfit_deploy_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
if (!/^selfit_deploy_test_\d+_[a-f0-9]+$/.test(schema)) throw new Error('Schema temporario invalido');
const password = crypto.randomBytes(18).toString('base64url');
const env = { ...process.env, NODE_ENV: 'development', DB_DATABASE: schema,
  ACCESS_ALLOWED_USERS: 'ADMIN', USER_ADMIN_USERS: 'ADMIN', ACCESS_ALLOWED_CIDRS: '127.0.0.1/32,::1/128',
  TRUST_PROXY: '', JWT_SECRET: crypto.randomBytes(48).toString('hex'), HOST: '127.0.0.1',
  BOOTSTRAP_USER: 'ADMIN', BOOTSTRAP_PASSWORD: password, HOMOLOG_USER: 'ADMIN', HOMOLOG_PASSWORD: password,
  FRONT: 'http://localhost:5174',
};
function command(script, args = [], extra = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: root, env: { ...env, ...extra }, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Comando falhou: ${path.basename(script)} (${code})`)));
  });
}
async function freePort() {
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}
let api;
async function stop() {
  if (!api || api.exitCode !== null) return;
  const done = once(api, 'exit');
  api.kill();
  await done;
  api = undefined;
}
async function serve(mode) {
  env.PORT = String(await freePort());
  api = spawn(process.execPath, ['Backend/src/server.js'], { cwd: root, env: { ...env, NODE_ENV: mode }, stdio: 'inherit', windowsHide: true });
  const base = `http://127.0.0.1:${env.PORT}`;
  for (let index = 0; index < 60; index++) {
    if (api.exitCode !== null) throw new Error('API encerrou antes de ficar pronta');
    try {
      const response = await fetch(base + '/api/ready', { signal: AbortSignal.timeout(1000) });
      if (response.ok) return base;
    } catch { /* Aguarda startup limitado a 15 segundos. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('API nao ficou pronta');
}
const admin = await mysql.createConnection({ ...connectionOptions(), database: undefined });
let created = false;
try {
  await admin.query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  created = true;
  await command('Backend/node_modules/knex/bin/cli.js', ['migrate:latest', '--knexfile', 'Backend/knexfile.js', '--env', 'production']);
  await command('Backend/node_modules/knex/bin/cli.js', ['migrate:latest', '--knexfile', 'Backend/knexfile.js', '--env', 'production']);
  const db = await mysql.createConnection({ ...connectionOptions(), database: schema });
  try {
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM usuarios');
    assert.equal(Number(total), 0, 'Migration nao pode criar credenciais padrao');
    await db.query(`INSERT INTO unidades (nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero)
      VALUES ('UNIDADE TESTE DEPLOY', 'PROPRIA', '12.345.678/0001-90', '50000000', 'PE', 'CENTRO', 'RUA TESTE', '100')`);
  } finally { await db.end(); }
  await command('Backend/scripts/create-user.js');
  await serve('development');
  await command('Backend/scripts/homologacao-software.mjs');
  await stop();
  const base = await serve('production');
  assert.equal((await fetch(base + '/')).status, 200);
  const sessionResponse = await fetch(base + '/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'ADMIN', senha: password }) });
  assert.equal(sessionResponse.status, 200);
  const { token } = await sessionResponse.json();
  assert.equal((await fetch(base + '/api/unidades', { headers: { Authorization: `Bearer ${token}` } })).status, 200);
  assert.equal((await fetch(base + '/api/unidades')).status, 401);
  console.log('OK: migrations em banco vazio e segunda execucao, bootstrap, login real, CRUD nos tres modulos e frontend em producao.');
} finally {
  await stop();
  // Nunca apaga schemas existentes: nome aleatorio criado exclusivamente por este processo.
  if (created) await admin.query(`DROP DATABASE \`${schema}\``);
  await admin.end();
}
