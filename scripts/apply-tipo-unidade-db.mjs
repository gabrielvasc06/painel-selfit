// Arquivo: scripts/apply-tipo-unidade-db.mjs
// Serve para: aplica a coluna tipo_unidade no banco quando necessario.

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

const env = parseEnv('./api-selfit/.env');
const db = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

const [columns] = await db.query(
  "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'unidades' AND COLUMN_NAME = 'tipo_unidade'",
  [env.DB_DATABASE],
);

if (!columns.length) {
  await db.query("ALTER TABLE unidades ADD COLUMN tipo_unidade VARCHAR(20) NOT NULL DEFAULT 'PROPRIA' AFTER nome");
}

await db.query("UPDATE unidades SET tipo_unidade = 'PROPRIA' WHERE tipo_unidade IS NULL OR TRIM(tipo_unidade) = ''");

const [description] = await db.query('DESCRIBE unidades');
console.log(JSON.stringify(description.map((column) => ({
  campo: column.Field,
  tipo: column.Type,
  padrao: column.Default,
})), null, 2));

await db.end();
