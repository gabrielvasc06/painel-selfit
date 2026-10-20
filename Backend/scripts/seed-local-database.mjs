// Arquivo: Backend/scripts/seed-local-database.mjs
// Importa unidades no ambiente selecionado. Nao cria usuarios; use user:create.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const apiDir = path.join(rootDir, 'Backend');
const requireFromApi = createRequire(path.join(apiDir, 'package.json'));
const mysql = requireFromApi('mysql2/promise');
const { connectionOptions } = requireFromApi('./src/config/database-options');
const seedPath = path.join(apiDir, 'database/seeds/unidades-proprias.json');
const dryRun = process.argv.includes('--dry-run');
requireFromApi('./src/config/env');
if (process.env.NODE_ENV === 'production') throw new Error('Seed local bloqueado em producao. Use importacao autenticada de unidades.');

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeUpper(value) {
  return String(value ?? '').trim().toLocaleUpperCase('pt-BR');
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

const unidades = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
// Usa as mesmas opcoes, TLS e precedencia de ambiente da API.
const db = await mysql.createConnection(connectionOptions());

try {
  if (!dryRun) await db.beginTransaction();
  const totals = { inserted: 0, updated: 0 };

  for (const unidade of unidades) {
    const result = await upsertUnit(db, unidade);
    totals[result] += 1;
  }

  if (!dryRun) await db.commit();
  console.log(JSON.stringify({
    status: dryRun ? 'DRY_RUN_OK' : 'OK',

    unidades: totals,
  }, null, 2));
} catch (error) {
  if (!dryRun) await db.rollback();
  throw error;
} finally {
  await db.end();
}
