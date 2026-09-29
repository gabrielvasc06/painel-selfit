import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mysql = require('../api-selfit/node_modules/mysql2/promise');

const apply = process.argv.includes('--apply');
const cnpjs = [
  '22902694006630', // LAR CENTER
  '22902694006983', // SANTA CLARA
  '22902694007017', // ARAPANÉS
];

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
const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

const placeholders = cnpjs.map(() => '?').join(', ');
const [units] = await connection.query(
  `SELECT id, nome, tipo_unidade, cnpj
     FROM unidades
    WHERE tipo_unidade = 'PROPRIA'
      AND REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') IN (${placeholders})
    ORDER BY nome`,
  cnpjs,
);

let removed = 0;
if (apply && units.length) {
  const ids = units.map((unit) => unit.id);
  const idPlaceholders = ids.map(() => '?').join(', ');
  const [result] = await connection.query(`DELETE FROM unidades WHERE id IN (${idPlaceholders})`, ids);
  removed = result.affectedRows;
}

console.log(JSON.stringify({
  simulacao: !apply,
  encontradas: units.length,
  removidas: removed,
  unidades: units,
}, null, 2));

await connection.end();
