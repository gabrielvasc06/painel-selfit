// Arquivo: scripts/delete-franquias.mjs
// Serve para: remove unidades franqueadas quando a base deve manter apenas unidades proprias.

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mysql = require('../api-selfit/node_modules/mysql2/promise');

const apply = process.argv.includes('--apply');

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

const [countsBefore] = await db.query('SELECT tipo_unidade, COUNT(*) AS total FROM unidades GROUP BY tipo_unidade ORDER BY tipo_unidade');
const [linkedRows] = await db.query(`
  SELECT u.id, u.nome, u.cnpj,
         COUNT(DISTINCT t.id) AS tvs,
         COUNT(DISTINCT c.id) AS cameras,
         COUNT(DISTINCT e.id) AS equipamentos
    FROM unidades u
    LEFT JOIN tvs t ON t.unidade_id = u.id AND t.deleted_at IS NULL
    LEFT JOIN cameras c ON c.unidade_id = u.id AND c.deleted_at IS NULL
    LEFT JOIN equipamentos e ON e.unidade_id = u.id AND e.deleted_at IS NULL
   WHERE u.tipo_unidade = 'FRANQUIA'
   GROUP BY u.id, u.nome, u.cnpj
  HAVING tvs > 0 OR cameras > 0 OR equipamentos > 0
`);

if (linkedRows.length) {
  console.log(JSON.stringify({
    exclusao_bloqueada: true,
    motivo: 'Existem franquias com TVs, cameras ou equipamentos vinculados.',
    antes: countsBefore,
    unidades_com_vinculo: linkedRows,
  }, null, 2));
  await db.end();
  process.exit(1);
}

if (apply) {
  const [result] = await db.query("DELETE FROM unidades WHERE tipo_unidade = 'FRANQUIA'");
  const [countsAfter] = await db.query('SELECT tipo_unidade, COUNT(*) AS total FROM unidades GROUP BY tipo_unidade ORDER BY tipo_unidade');
  console.log(JSON.stringify({
    modo: 'aplicado',
    franquias_excluidas: result.affectedRows,
    antes: countsBefore,
    depois: countsAfter,
  }, null, 2));
} else {
  const [franquias] = await db.query("SELECT id, nome, cnpj, uf FROM unidades WHERE tipo_unidade = 'FRANQUIA' ORDER BY nome LIMIT 20");
  console.log(JSON.stringify({
    modo: 'simulacao',
    antes: countsBefore,
    franquias_sem_vinculo_para_excluir: franquias.length,
    exemplos: franquias,
    instrucao: 'Rode: node scripts/delete-franquias.mjs --apply',
  }, null, 2));
}

await db.end();
