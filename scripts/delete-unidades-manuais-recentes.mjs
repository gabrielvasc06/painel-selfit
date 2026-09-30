// Arquivo: scripts/delete-unidades-manuais-recentes.mjs
// Serve para: remove unidades cadastradas manualmente em testes recentes.

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mysql = require('../api-selfit/node_modules/mysql2/promise');

const apply = process.argv.includes('--apply');
const names = ['ARAPIRACA'];

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

const where = names.map(() => 'UPPER(u.nome) LIKE ?').join(' OR ');
const params = names.map((name) => `%${name}%`);

const [candidates] = await db.query(`
  SELECT u.id, u.nome, u.cnpj, u.uf, u.tipo_unidade, u.created_at, u.updated_at,
         COUNT(DISTINCT t.id) AS tvs,
         COUNT(DISTINCT c.id) AS cameras,
         COUNT(DISTINCT e.id) AS equipamentos
    FROM unidades u
    LEFT JOIN tvs t ON t.unidade_id = u.id AND t.deleted_at IS NULL
    LEFT JOIN cameras c ON c.unidade_id = u.id AND c.deleted_at IS NULL
    LEFT JOIN equipamentos e ON e.unidade_id = u.id AND e.deleted_at IS NULL
   WHERE ${where}
   GROUP BY u.id, u.nome, u.cnpj, u.uf, u.tipo_unidade, u.created_at, u.updated_at
   ORDER BY u.id
`, params);

const [recent] = await db.query(`
  SELECT id, nome, cnpj, uf, tipo_unidade, created_at, updated_at
    FROM unidades
   ORDER BY created_at DESC, id DESC
   LIMIT 15
`);

const linked = candidates.filter((unit) => Number(unit.tvs) > 0 || Number(unit.cameras) > 0 || Number(unit.equipamentos) > 0);

if (!apply) {
  console.log(JSON.stringify({
    modo: 'simulacao',
    candidatas_para_excluir: candidates,
    bloqueadas_por_vinculo: linked,
    unidades_criadas_mais_recentemente: recent,
    instrucao: 'Rode: node scripts/delete-unidades-manuais-recentes.mjs --apply',
  }, null, 2));
  await db.end();
  process.exit(0);
}

if (linked.length) {
  console.log(JSON.stringify({
    aplicado: false,
    motivo: 'Existem unidades candidatas com TVs, cameras ou equipamentos vinculados.',
    bloqueadas_por_vinculo: linked,
  }, null, 2));
  await db.end();
  process.exit(1);
}

let deleted = 0;
if (candidates.length) {
  const ids = candidates.map((unit) => unit.id);
  const placeholders = ids.map(() => '?').join(', ');
  const [result] = await db.query(`DELETE FROM unidades WHERE id IN (${placeholders})`, ids);
  deleted = result.affectedRows;
}

console.log(JSON.stringify({
  aplicado: true,
  deletadas: deleted,
  unidades_excluidas: candidates,
}, null, 2));

await db.end();
