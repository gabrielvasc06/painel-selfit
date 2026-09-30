// Arquivo: scripts/audit-manutencoes-search.mjs
// Serve para: testa a busca de manutencoes por unidade e modulo.

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

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

const env = parseEnv('./api-selfit/.env');
const db = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

const term = process.argv.slice(2).join(' ') || 'SHOPPING CAMARA';
const normalized = normalizeText(term);
const like = `%${normalized}%`;
const digits = `%${term.replace(/\D/g, '')}%`;

const [raw] = await db.query(`
  SELECT id, item_tipo, item_id, descricao, data_envio, status_manutencao, created_at, updated_at
    FROM manutencoes
   ORDER BY id DESC
`);

const [joined] = await db.query(`
  SELECT *
    FROM (
      SELECT m.id AS manutencao_id, m.item_tipo, m.item_id, m.descricao, m.data_envio, m.status_manutencao,
             'EQUIPAMENTO' AS tipo_modulo, e.nome_identificacao, e.categoria, e.deleted_at AS item_deleted_at,
             u.nome AS unidade_nome, u.uf, u.cep, u.cnpj
        FROM manutencoes m
        JOIN equipamentos e ON m.item_tipo = 'EQUIPAMENTO' AND m.item_id = e.id
        JOIN unidades u ON e.unidade_id = u.id
      UNION ALL
      SELECT m.id AS manutencao_id, m.item_tipo, m.item_id, m.descricao, m.data_envio, m.status_manutencao,
             'TV' AS tipo_modulo, t.nome_identificacao, t.categoria, t.deleted_at AS item_deleted_at,
             u.nome AS unidade_nome, u.uf, u.cep, u.cnpj
        FROM manutencoes m
        JOIN tvs t ON m.item_tipo = 'TV' AND m.item_id = t.id
        JOIN unidades u ON t.unidade_id = u.id
      UNION ALL
      SELECT m.id AS manutencao_id, m.item_tipo, m.item_id, m.descricao, m.data_envio, m.status_manutencao,
             'CAMERA' AS tipo_modulo, c.nome_identificacao, c.categoria, c.deleted_at AS item_deleted_at,
             u.nome AS unidade_nome, u.uf, u.cep, u.cnpj
        FROM manutencoes m
        JOIN cameras c ON m.item_tipo = 'CAMERA' AND m.item_id = c.id
        JOIN unidades u ON c.unidade_id = u.id
    ) dados
   ORDER BY manutencao_id DESC
`);

const [searchAll] = await db.query(`
  SELECT *
    FROM (
      SELECT m.id AS manutencao_id, 'EQUIPAMENTO' AS tipo_modulo, u.nome AS unidade_nome, u.cep, u.cnpj,
             e.nome_identificacao, e.categoria, m.descricao, m.data_envio, m.status_manutencao
        FROM manutencoes m
        JOIN equipamentos e ON m.item_tipo = 'EQUIPAMENTO' AND m.item_id = e.id
        JOIN unidades u ON e.unidade_id = u.id
       WHERE e.deleted_at IS NULL
      UNION ALL
      SELECT m.id AS manutencao_id, 'TV' AS tipo_modulo, u.nome AS unidade_nome, u.cep, u.cnpj,
             t.nome_identificacao, t.categoria, m.descricao, m.data_envio, m.status_manutencao
        FROM manutencoes m
        JOIN tvs t ON m.item_tipo = 'TV' AND m.item_id = t.id
        JOIN unidades u ON t.unidade_id = u.id
       WHERE t.deleted_at IS NULL
      UNION ALL
      SELECT m.id AS manutencao_id, 'CAMERA' AS tipo_modulo, u.nome AS unidade_nome, u.cep, u.cnpj,
             c.nome_identificacao, c.categoria, m.descricao, m.data_envio, m.status_manutencao
        FROM manutencoes m
        JOIN cameras c ON m.item_tipo = 'CAMERA' AND m.item_id = c.id
        JOIN unidades u ON c.unidade_id = u.id
       WHERE c.deleted_at IS NULL
    ) dados
   WHERE (
      UPPER(unidade_nome) LIKE ?
      OR cep LIKE ?
      OR cnpj LIKE ?
      OR REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') LIKE ?
   )
   ORDER BY data_envio DESC
`, [like, like, like, digits]);

console.log(JSON.stringify({
  termo_testado: term,
  manutencoes_tabela: raw,
  manutencoes_com_item_e_unidade: joined,
  resultado_busca_todos_modulos: searchAll,
  resultado_por_modulo: {
    equipamentos: searchAll.filter((row) => row.tipo_modulo === 'EQUIPAMENTO'),
    tvs: searchAll.filter((row) => row.tipo_modulo === 'TV'),
    cameras: searchAll.filter((row) => row.tipo_modulo === 'CAMERA'),
  },
}, null, 2));

await db.end();
