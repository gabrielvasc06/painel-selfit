// Arquivo: scripts/audit-unidades-regioes.mjs
// Serve para: resume unidades por UF e detecta registros fora do escopo.

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

const [countsByType] = await db.query(`
  SELECT tipo_unidade, COUNT(*) AS total
    FROM unidades
   GROUP BY tipo_unidade
   ORDER BY tipo_unidade
`);

const [countsByUf] = await db.query(`
  SELECT uf, COUNT(*) AS total
    FROM unidades
   WHERE tipo_unidade = 'PROPRIA'
   GROUP BY uf
   ORDER BY uf
`);

const [missingUf] = await db.query(`
  SELECT id, nome, cnpj, uf, cep
    FROM unidades
   WHERE tipo_unidade = 'PROPRIA'
     AND (uf IS NULL OR TRIM(uf) = '' OR CHAR_LENGTH(TRIM(uf)) <> 2)
   ORDER BY nome
`);

const [suspects] = await db.query(`
  SELECT id, nome, tipo_unidade, cnpj, uf
    FROM unidades
   WHERE tipo_unidade <> 'PROPRIA'
      OR UPPER(nome) LIKE '%WEBURN%'
      OR UPPER(nome) LIKE '%WE BURN%'
      OR UPPER(nome) LIKE '%GALP%'
      OR UPPER(nome) LIKE '%FRANQUIA%'
      OR UPPER(nome) LIKE '%HOLDING%'
      OR UPPER(nome) LIKE '%MATRIZ%'
   ORDER BY nome
`);

const [romanNumerals] = await db.query(`
  SELECT id, nome, cnpj, uf
    FROM unidades
   WHERE nome REGEXP '(^|[[:space:]-])(I|II|III)($|[[:space:]-])'
   ORDER BY nome
`);

console.log(JSON.stringify({
  tipos: countsByType,
  por_estado: countsByUf,
  sem_uf_valida: missingUf,
  suspeitas_fora_do_escopo: suspects,
  nomes_com_romanos: romanNumerals,
}, null, 2));

await db.end();
