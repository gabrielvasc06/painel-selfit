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

async function countRows(db, table) {
  const [rows] = await db.query(`SELECT COUNT(*) AS total FROM ${table}`);
  return Number(rows[0]?.total ?? 0);
}

async function autoIncrement(db, schema, table) {
  const [rows] = await db.query(`
    SELECT AUTO_INCREMENT AS value
      FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
  `, [schema, table]);
  return rows[0]?.value ?? null;
}

const env = parseEnv('./api-selfit/.env');
const db = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

const tables = ['manutencoes', 'tvs', 'cameras', 'equipamentos'];
const before = {};
const after = {};
const autoIncrementAfter = {};

try {
  for (const table of tables) before[table] = await countRows(db, table);

  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    await db.query(`TRUNCATE TABLE ${table}`);
  }
  await db.query('SET FOREIGN_KEY_CHECKS = 1');

  for (const table of tables) after[table] = await countRows(db, table);
  for (const table of tables) autoIncrementAfter[table] = await autoIncrement(db, env.DB_DATABASE, table);

  console.log(JSON.stringify({
    status: 'OK',
    acao: 'inventario de teste removido e auto_increment reiniciado',
    antes: before,
    depois: after,
    proximo_id: autoIncrementAfter,
  }, null, 2));
} catch (error) {
  await db.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => undefined);
  throw error;
} finally {
  await db.end();
}
