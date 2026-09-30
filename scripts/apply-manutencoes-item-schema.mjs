// Arquivo: scripts/apply-manutencoes-item-schema.mjs
// Serve para: aplica ajuste de schema para manutencoes usarem item_tipo e item_id.

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mysql = require('../api-selfit/node_modules/mysql2/promise');

function parseEnv(envPath) {
  const values = {};
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return values;
}

function quoteIdentifier(value) {
  return `\`${String(value).replaceAll('`', '``')}\``;
}

async function hasColumn(db, schema, table, column) {
  const [rows] = await db.query(`
    SELECT 1
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1
  `, [schema, table, column]);
  return rows.length > 0;
}

async function addColumnIfMissing(db, schema, table, column, definition) {
  if (await hasColumn(db, schema, table, column)) return false;
  await db.query(`ALTER TABLE ${quoteIdentifier(table)} ADD COLUMN ${quoteIdentifier(column)} ${definition}`);
  return true;
}

async function dropForeignKeysForColumn(db, schema, table, column) {
  const [rows] = await db.query(`
    SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL
  `, [schema, table, column]);

  for (const row of rows) {
    await db.query(`ALTER TABLE ${quoteIdentifier(table)} DROP FOREIGN KEY ${quoteIdentifier(row.CONSTRAINT_NAME)}`);
  }

  return rows.map((row) => row.CONSTRAINT_NAME);
}

async function dropIndexesForColumn(db, schema, table, column) {
  const [rows] = await db.query(`
    SELECT DISTINCT INDEX_NAME
      FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND INDEX_NAME <> 'PRIMARY'
  `, [schema, table, column]);

  for (const row of rows) {
    await db.query(`ALTER TABLE ${quoteIdentifier(table)} DROP INDEX ${quoteIdentifier(row.INDEX_NAME)}`);
  }

  return rows.map((row) => row.INDEX_NAME);
}

async function dropColumnIfExists(db, schema, table, column) {
  if (!await hasColumn(db, schema, table, column)) return false;
  await dropForeignKeysForColumn(db, schema, table, column);
  await dropIndexesForColumn(db, schema, table, column);
  await db.query(`ALTER TABLE ${quoteIdentifier(table)} DROP COLUMN ${quoteIdentifier(column)}`);
  return true;
}

const env = parseEnv('./api-selfit/.env');
const db = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  multipleStatements: false,
});

const schema = env.DB_DATABASE;
const summary = {
  colunas_adicionadas: [],
  colunas_removidas: [],
  dados_migrados: {},
};

try {
  await db.beginTransaction();

  if (await addColumnIfMissing(db, schema, 'manutencoes', 'item_tipo', "VARCHAR(20) NOT NULL DEFAULT 'EQUIPAMENTO'")) {
    summary.colunas_adicionadas.push('item_tipo');
  }

  if (await addColumnIfMissing(db, schema, 'manutencoes', 'item_id', 'BIGINT UNSIGNED NULL')) {
    summary.colunas_adicionadas.push('item_id');
  }

  const legacyColumns = [
    { column: 'equipamento_id', type: 'EQUIPAMENTO' },
    { column: 'tv_id', type: 'TV' },
    { column: 'camera_id', type: 'CAMERA' },
  ];

  for (const legacy of legacyColumns) {
    if (!await hasColumn(db, schema, 'manutencoes', legacy.column)) continue;

    const [result] = await db.query(`
      UPDATE manutencoes
         SET item_tipo = ?,
             item_id = ${quoteIdentifier(legacy.column)}
       WHERE ${quoteIdentifier(legacy.column)} IS NOT NULL
         AND item_id IS NULL
    `, [legacy.type]);
    summary.dados_migrados[legacy.column] = result.affectedRows;
  }

  for (const legacy of legacyColumns) {
    if (await dropColumnIfExists(db, schema, 'manutencoes', legacy.column)) {
      summary.colunas_removidas.push(legacy.column);
    }
  }

  await db.query(`
    UPDATE manutencoes
       SET item_tipo = UPPER(TRIM(item_tipo))
     WHERE item_tipo IS NOT NULL
  `);

  await db.commit();
} catch (error) {
  await db.rollback();
  throw error;
} finally {
  await db.end();
}

console.log(JSON.stringify(summary, null, 2));
