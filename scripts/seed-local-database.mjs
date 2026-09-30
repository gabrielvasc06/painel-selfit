// Arquivo: scripts/seed-local-database.mjs
// Serve para: popular uma maquina local com usuario padrao e unidades proprias sem duplicar dados.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'api-selfit');
const requireFromApi = createRequire(path.join(apiDir, 'package.json'));
const bcrypt = requireFromApi('bcrypt');
const mysql = requireFromApi('mysql2/promise');
const seedPath = path.join(apiDir, 'src/database/seeds/unidades-proprias.json');
const dryRun = process.argv.includes('--dry-run');

function parseEnv(envPath) {
  const values = {};
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return values;
}

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeUpper(value) {
  return String(value ?? '').trim().toLocaleUpperCase('pt-BR');
}

async function ensureDevUser(db) {
  const usuario = 'VANDERSON.GABRIEL';
  const senha = 'Selfit@2026';
  const [rows] = await db.query('SELECT id FROM usuarios WHERE usuario = ? LIMIT 1', [usuario]);

  if (rows.length > 0) return { skipped: true, usuario };
  if (dryRun) return { created: true, usuario };

  const senhaHash = await bcrypt.hash(senha, 10);
  await db.query(
    'INSERT INTO usuarios (usuario, senha_hash, senha_provisoria) VALUES (?, ?, ?)',
    [usuario, senhaHash, false],
  );
  return { created: true, usuario };
}

async function upsertUnit(db, unidade) {
  const cnpjDigits = onlyDigits(unidade.cnpj);
  const payload = {
    nome: normalizeUpper(unidade.nome),
    tipo_unidade: 'PROPRIA',
    cnpj: unidade.cnpj,
    cep: onlyDigits(unidade.cep),
    uf: normalizeUpper(unidade.uf).slice(0, 2),
    bairro: normalizeUpper(unidade.bairro),
    rua: normalizeUpper(unidade.rua),
    numero: normalizeUpper(unidade.numero),
  };

  const [existing] = await db.query(
    "SELECT id FROM unidades WHERE REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') = ? LIMIT 1",
    [cnpjDigits],
  );

  if (existing.length > 0) {
    if (!dryRun) {
      await db.query(
        'UPDATE unidades SET nome = ?, tipo_unidade = ?, cnpj = ?, cep = ?, uf = ?, bairro = ?, rua = ?, numero = ? WHERE id = ?',
        [payload.nome, payload.tipo_unidade, payload.cnpj, payload.cep, payload.uf, payload.bairro, payload.rua, payload.numero, existing[0].id],
      );
    }
    return 'updated';
  }

  if (!dryRun) {
    await db.query(
      'INSERT INTO unidades (nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [payload.nome, payload.tipo_unidade, payload.cnpj, payload.cep, payload.uf, payload.bairro, payload.rua, payload.numero],
    );
  }
  return 'inserted';
}

const envPath = path.join(apiDir, '.env');
if (!fs.existsSync(envPath)) {
  throw new Error(`Arquivo .env da API nao encontrado em ${envPath}. Copie api-selfit/.env.example para api-selfit/.env.`);
}

const env = parseEnv(envPath);
const required = ['DB_HOST', 'DB_USER', 'DB_DATABASE'];
const missing = required.filter((key) => !env[key]);
if (missing.length > 0) throw new Error(`Variaveis ausentes no .env da API: ${missing.join(', ')}`);

const unidades = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const db = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

try {
  const userResult = await ensureDevUser(db);
  const totals = { inserted: 0, updated: 0 };

  for (const unidade of unidades) {
    const result = await upsertUnit(db, unidade);
    totals[result] += 1;
  }

  console.log(JSON.stringify({
    status: dryRun ? 'DRY_RUN_OK' : 'OK',
    usuario: userResult,
    unidades: totals,
  }, null, 2));
} finally {
  await db.end();
}
