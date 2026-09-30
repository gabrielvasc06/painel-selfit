// Arquivo: scripts/delete-unidade.mjs
// Serve para: remove uma unidade especifica e seus vinculos controlados.

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mysql = require('../api-selfit/node_modules/mysql2/promise');

const unidadeNome = process.argv.find((arg) => arg.startsWith('--nome='))?.slice('--nome='.length);
const unidadeCnpj = process.argv.find((arg) => arg.startsWith('--cnpj='))?.slice('--cnpj='.length);

if (!unidadeNome && !unidadeCnpj) {
  console.error('Informe --nome=NOME ou --cnpj=CNPJ.');
  process.exit(1);
}

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function parseEnv(envPath) {
  const values = {};
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return values;
}

function placeholders(values) {
  return values.map(() => '?').join(', ');
}

async function tableColumns(connection, table) {
  const [rows] = await connection.query(`SHOW COLUMNS FROM ${table}`);
  return new Set(rows.map((row) => row.Field));
}

const env = parseEnv('./api-selfit/.env');
const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

try {
  const where = [];
  const params = [];

  if (unidadeNome) {
    where.push('nome = ?');
    params.push(unidadeNome);
  }

  if (unidadeCnpj) {
    where.push("REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') = ?");
    params.push(onlyDigits(unidadeCnpj));
  }

  const [unidades] = await connection.query(
    `SELECT id, nome, cnpj FROM unidades WHERE ${where.join(' OR ')}`,
    params,
  );

  if (!unidades.length) {
    console.log(JSON.stringify({ removido: false, motivo: 'Unidade nao encontrada.' }, null, 2));
    await connection.end();
    process.exit(0);
  }

  const unidadeIds = unidades.map((row) => row.id);
  const [tvs] = await connection.query(
    `SELECT id FROM tvs WHERE unidade_id IN (${placeholders(unidadeIds)})`,
    unidadeIds,
  );
  const [cameras] = await connection.query(
    `SELECT id FROM cameras WHERE unidade_id IN (${placeholders(unidadeIds)})`,
    unidadeIds,
  );
  const [equipamentos] = await connection.query(
    `SELECT id FROM equipamentos WHERE unidade_id IN (${placeholders(unidadeIds)})`,
    unidadeIds,
  );

  const tvIds = tvs.map((row) => row.id);
  const cameraIds = cameras.map((row) => row.id);
  const equipamentoIds = equipamentos.map((row) => row.id);
  const maintenanceColumns = await tableColumns(connection, 'manutencoes');

  await connection.beginTransaction();

  let manutencoesRemovidas = 0;
  const maintenanceDeletes = [];

  if (maintenanceColumns.has('item_tipo') && maintenanceColumns.has('item_id')) {
    if (tvIds.length) maintenanceDeletes.push({ sql: `DELETE FROM manutencoes WHERE item_tipo = 'TV' AND item_id IN (${placeholders(tvIds)})`, params: tvIds });
    if (cameraIds.length) maintenanceDeletes.push({ sql: `DELETE FROM manutencoes WHERE item_tipo = 'CAMERA' AND item_id IN (${placeholders(cameraIds)})`, params: cameraIds });
    if (equipamentoIds.length) maintenanceDeletes.push({ sql: `DELETE FROM manutencoes WHERE item_tipo = 'EQUIPAMENTO' AND item_id IN (${placeholders(equipamentoIds)})`, params: equipamentoIds });
  }

  if (maintenanceColumns.has('tv_id') && tvIds.length) {
    maintenanceDeletes.push({ sql: `DELETE FROM manutencoes WHERE tv_id IN (${placeholders(tvIds)})`, params: tvIds });
  }

  if (maintenanceColumns.has('camera_id') && cameraIds.length) {
    maintenanceDeletes.push({ sql: `DELETE FROM manutencoes WHERE camera_id IN (${placeholders(cameraIds)})`, params: cameraIds });
  }

  if (maintenanceColumns.has('equipamento_id') && equipamentoIds.length) {
    maintenanceDeletes.push({ sql: `DELETE FROM manutencoes WHERE equipamento_id IN (${placeholders(equipamentoIds)})`, params: equipamentoIds });
  }

  for (const item of maintenanceDeletes) {
    const [result] = await connection.query(item.sql, item.params);
    manutencoesRemovidas += result.affectedRows;
  }

  const [tvResult] = await connection.query(
    `DELETE FROM tvs WHERE unidade_id IN (${placeholders(unidadeIds)})`,
    unidadeIds,
  );
  const [cameraResult] = await connection.query(
    `DELETE FROM cameras WHERE unidade_id IN (${placeholders(unidadeIds)})`,
    unidadeIds,
  );
  const [equipamentoResult] = await connection.query(
    `DELETE FROM equipamentos WHERE unidade_id IN (${placeholders(unidadeIds)})`,
    unidadeIds,
  );
  const [unidadeResult] = await connection.query(
    `DELETE FROM unidades WHERE id IN (${placeholders(unidadeIds)})`,
    unidadeIds,
  );

  await connection.commit();

  console.log(JSON.stringify({
    removido: true,
    unidades,
    totais: {
      unidades: unidadeResult.affectedRows,
      tvs: tvResult.affectedRows,
      cameras: cameraResult.affectedRows,
      equipamentos: equipamentoResult.affectedRows,
      manutencoes: manutencoesRemovidas,
    },
  }, null, 2));
} catch (error) {
  try {
    await connection.rollback();
  } catch {
    // Ignore rollback errors so the original database error is shown.
  }
  throw error;
} finally {
  await connection.end();
}
