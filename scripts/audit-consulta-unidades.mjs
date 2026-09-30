// Arquivo: scripts/audit-consulta-unidades.mjs
// Serve para: testa consultas de unidades por nome, CEP e CNPJ.

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

const [prefixoBoa] = await db.query(
  `SELECT nome, uf, cep
     FROM unidades
    WHERE tipo_unidade = 'PROPRIA'
      AND nome LIKE ?
    ORDER BY nome ASC
    LIMIT 10`,
  ['BOA%'],
);

const [buscaBoaViagem] = await db.query(
  `SELECT nome, uf, cep
     FROM unidades
    WHERE tipo_unidade = 'PROPRIA'
      AND (nome LIKE ? OR cnpj LIKE ? OR cep LIKE ?)
    ORDER BY CASE WHEN nome LIKE ? THEN 0 ELSE 1 END, nome ASC
    LIMIT 10`,
  ['%BOA VIAGEM%', '%BOA VIAGEM%', '%BOA VIAGEM%', 'BOA VIAGEM%'],
);

console.log(JSON.stringify({ prefixo_BOA: prefixoBoa, busca_BOA_VIAGEM: buscaBoaViagem }, null, 2));

await db.end();
