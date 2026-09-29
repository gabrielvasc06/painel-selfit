import fs from 'node:fs';
import { createRequire } from 'node:module';
import readXlsxFile from 'read-excel-file/node';

const require = createRequire(import.meta.url);
const mysql = require('../api-selfit/node_modules/mysql2/promise');

const file = 'C:/Users/vanderson.gabriel/Downloads/UNIDADES.xlsx';
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

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function readValue(row, aliases) {
  for (const alias of aliases) {
    const value = row[normalizeKey(alias)];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function blockedStatus(row) {
  return normalizeKey([
    readValue(row, ['data_inauguracao']),
    readValue(row, ['mes_ano_inauguracao']),
  ].filter(Boolean).join(' '));
}

function isBlocked(status) {
  return ['pre_operacional', 'fechada', 'weburn', 'galpao'].some((blocked) => status.includes(blocked));
}

const workbook = await readXlsxFile(file);
const ownSheet = workbook.find((sheet) => sheet.sheet === 'PRÓPRIAS');
if (!ownSheet) throw new Error('Aba PRÓPRIAS nao encontrada.');

const [headers = [], ...rows] = ownSheet.data;
const blocked = rows
  .map((cells, index) => {
    const row = Object.fromEntries(headers.map((header, headerIndex) => [normalizeKey(header), cells[headerIndex]]));
    const status = blockedStatus(row);
    return {
      linha_excel: index + 2,
      nome: readValue(row, ['unidade', 'nome']),
      cnpj: readValue(row, ['cnpj']),
      cnpj_digits: onlyDigits(readValue(row, ['cnpj'])),
      status,
    };
  })
  .filter((row) => row.cnpj_digits.length === 14 && isBlocked(row.status));

const env = parseEnv('./api-selfit/.env');
const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

const cnpjs = blocked.map((row) => row.cnpj_digits);
const placeholders = cnpjs.map(() => '?').join(', ');

if (!cnpjs.length) {
  console.log(JSON.stringify({ encontradas_na_planilha: 0, removidas: 0 }, null, 2));
  await connection.end();
  process.exit(0);
}

const [unidades] = await connection.query(
  `SELECT id, nome, tipo_unidade, cnpj
     FROM unidades
    WHERE tipo_unidade = 'PROPRIA'
      AND REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') IN (${placeholders})
    ORDER BY nome`,
  cnpjs,
);

const unitIds = unidades.map((row) => row.id);
let linkedRows = [];

if (unitIds.length) {
  const unitPlaceholders = unitIds.map(() => '?').join(', ');
  const [linked] = await connection.query(
    `SELECT u.id, u.nome,
            COUNT(DISTINCT t.id) AS tvs,
            COUNT(DISTINCT c.id) AS cameras,
            COUNT(DISTINCT e.id) AS equipamentos
       FROM unidades u
       LEFT JOIN tvs t ON t.unidade_id = u.id AND t.deleted_at IS NULL
       LEFT JOIN cameras c ON c.unidade_id = u.id AND c.deleted_at IS NULL
       LEFT JOIN equipamentos e ON e.unidade_id = u.id AND e.deleted_at IS NULL
      WHERE u.id IN (${unitPlaceholders})
      GROUP BY u.id, u.nome
     HAVING tvs > 0 OR cameras > 0 OR equipamentos > 0`,
    unitIds,
  );
  linkedRows = linked;
}

if (linkedRows.length) {
  console.log(JSON.stringify({
    bloqueado: true,
    motivo: 'Existem unidades nao ativas com itens vinculados.',
    unidades_com_vinculo: linkedRows,
  }, null, 2));
  await connection.end();
  process.exit(1);
}

let removed = 0;
if (apply && unitIds.length) {
  const unitPlaceholders = unitIds.map(() => '?').join(', ');
  const [result] = await connection.query(`DELETE FROM unidades WHERE id IN (${unitPlaceholders})`, unitIds);
  removed = result.affectedRows;
}

console.log(JSON.stringify({
  encontradas_na_planilha: blocked.length,
  encontradas_no_banco: unidades.length,
  removidas: removed,
  simulacao: !apply,
  exemplos: unidades.slice(0, 12),
}, null, 2));

await connection.end();
