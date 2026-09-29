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

async function prepare(db, name, sql) {
  const statementName = `stmt_${name.replace(/\W/g, '_')}`;
  await db.query(`PREPARE ${statementName} FROM ?`, [sql]);
  await db.query(`DEALLOCATE PREPARE ${statementName}`);
  return name;
}

const env = parseEnv('./api-selfit/.env');
const db = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

const statements = [
  [
    'insert_tvs',
    'INSERT INTO tvs (unidade_id, nome_identificacao, categoria, marca, status, data_garantia) VALUES (?, ?, ?, ?, ?, ?)',
  ],
  [
    'insert_cameras',
    'INSERT INTO cameras (unidade_id, nome_identificacao, categoria, marca, status, data_garantia) VALUES (?, ?, ?, ?, ?, ?)',
  ],
  [
    'insert_equipamentos',
    'INSERT INTO equipamentos (unidade_id, nome_identificacao, categoria, marca, status, data_garantia) VALUES (?, ?, ?, ?, ?, ?)',
  ],
  [
    'insert_manutencoes',
    'INSERT INTO manutencoes (item_tipo, item_id, descricao, data_envio, data_retorno, custo, status_manutencao) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ],
  [
    'update_manutencoes',
    'UPDATE manutencoes SET item_tipo = ?, item_id = ?, descricao = ?, data_envio = ?, data_retorno = ?, custo = ?, status_manutencao = ? WHERE id = ?',
  ],
  [
    'select_inventario',
    `
      SELECT *
        FROM (
          SELECT CONCAT('EQUIPAMENTO:', e.id) AS id, e.id AS raw_id, 'EQUIPAMENTO' AS tipo_modulo, e.unidade_id, u.nome AS unidade_nome, u.cnpj AS unidade_cnpj, u.cep AS unidade_cep, u.uf, e.nome_identificacao, e.categoria, e.marca, e.status, e.data_garantia, e.created_at, e.updated_at
            FROM equipamentos e JOIN unidades u ON e.unidade_id = u.id WHERE e.deleted_at IS NULL
          UNION ALL
          SELECT CONCAT('TV:', t.id) AS id, t.id AS raw_id, 'TV' AS tipo_modulo, t.unidade_id, u.nome AS unidade_nome, u.cnpj AS unidade_cnpj, u.cep AS unidade_cep, u.uf, t.nome_identificacao, t.categoria, t.marca, t.status, t.data_garantia, t.created_at, t.updated_at
            FROM tvs t JOIN unidades u ON t.unidade_id = u.id WHERE t.deleted_at IS NULL
          UNION ALL
          SELECT CONCAT('CAMERA:', c.id) AS id, c.id AS raw_id, 'CAMERA' AS tipo_modulo, c.unidade_id, u.nome AS unidade_nome, u.cnpj AS unidade_cnpj, u.cep AS unidade_cep, u.uf, c.nome_identificacao, c.categoria, c.marca, c.status, c.data_garantia, c.created_at, c.updated_at
            FROM cameras c JOIN unidades u ON c.unidade_id = u.id WHERE c.deleted_at IS NULL
        ) inventario
       WHERE tipo_modulo = ?
    `,
  ],
  [
    'select_manutencoes',
    `
      SELECT *
        FROM (
          SELECT CONCAT('TV:', t.id) AS id, t.id AS raw_id, 'TV' AS tipo_modulo, u.nome AS unidade_nome, u.cnpj AS unidade_cnpj, u.cep AS unidade_cep, u.uf, t.nome_identificacao, t.categoria, t.marca, t.status AS status_equipamento, m.id AS manutencao_id, CONCAT('TV:', t.id) AS equipamento_id, m.descricao AS descricao_manutencao, m.data_envio, m.data_retorno, m.custo, m.status_manutencao
            FROM manutencoes m JOIN tvs t ON m.item_tipo = 'TV' AND m.item_id = t.id JOIN unidades u ON t.unidade_id = u.id
           WHERE t.deleted_at IS NULL
        ) manutencoes_abertas
       WHERE tipo_modulo = ?
    `,
  ],
];

const ok = [];
try {
  for (const [name, sql] of statements) ok.push(await prepare(db, name, sql));
  console.log(JSON.stringify({ status: 'OK', contratos_validados: ok }, null, 2));
} finally {
  await db.end();
}
