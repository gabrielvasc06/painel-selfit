import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import readXlsxFile from 'read-excel-file/node';

const require = createRequire(import.meta.url);
const mysql = require('../api-selfit/node_modules/mysql2/promise');

const defaultFile = 'C:/Users/vanderson.gabriel/Desktop/RELAÇÃO FILIAIS SELFIT (2).xlsx';
const file = process.argv.find((arg) => arg.endsWith('.xlsx')) ?? defaultFile;
const apply = process.argv.includes('--apply');
const deleteImported = process.argv.includes('--delete-imported');
const preservedCnpjs = new Set(['22902694000195']);
const blockedOwnUnitCnpjs = new Set([
  '22902694006630', // LAR CENTER
  '22902694006983', // SANTA CLARA
  '22902694007017', // ARAPANES
]);

const ignoredColumns = new Set([
  'cod_evo',
  'cod_evo',
  'codigo_evo',
  'centro_de_custo',
  'data_inauguracao',
  'mes_ano_inauguracao',
  'inscricao_municipal',
  'inscricao_estadual',
  'filial',
  'filial_2',
  'empresas',
  'status',
]);

const cepRanges = [
  [1000000, 19999999, 'SP'],
  [20000000, 28999999, 'RJ'],
  [29000000, 29999999, 'ES'],
  [30000000, 39999999, 'MG'],
  [40000000, 48999999, 'BA'],
  [49000000, 49999999, 'SE'],
  [50000000, 56999999, 'PE'],
  [57000000, 57999999, 'AL'],
  [58000000, 58999999, 'PB'],
  [59000000, 59999999, 'RN'],
  [60000000, 63999999, 'CE'],
  [64000000, 64999999, 'PI'],
  [65000000, 65999999, 'MA'],
  [66000000, 68899999, 'PA'],
  [68900000, 68999999, 'AP'],
  [69000000, 69299999, 'AM'],
  [69300000, 69399999, 'RR'],
  [69400000, 69899999, 'AM'],
  [69900000, 69999999, 'AC'],
  [70000000, 72799999, 'DF'],
  [72800000, 72999999, 'GO'],
  [73000000, 73699999, 'DF'],
  [73700000, 76799999, 'GO'],
  [76800000, 76999999, 'RO'],
  [77000000, 77999999, 'TO'],
  [78000000, 78899999, 'MT'],
  [79000000, 79999999, 'MS'],
  [80000000, 87999999, 'PR'],
  [88000000, 89999999, 'SC'],
  [90000000, 99999999, 'RS'],
];

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

function isNonOperationalUnit(value) {
  const normalized = normalizeKey(value);
  return ['pre_operacional', 'fechada', 'weburn', 'galpao', 'holding', 'matriz'].some((blocked) => normalized.includes(blocked));
}

function normalizeUnitName(value) {
  return String(value ?? '')
    .trim()
    .toLocaleUpperCase('pt-BR')
    .replace(/(^|[\s-])III(?=$|[\s-])/g, (_match, prefix) => `${prefix}3`)
    .replace(/(^|[\s-])II(?=$|[\s-])/g, (_match, prefix) => `${prefix}2`)
    .replace(/(^|[\s-])I(?=$|[\s-])/g, (_match, prefix) => `${prefix}1`)
    .replace(/\s+/g, ' ')
    .trim();
}

function readValue(row, aliases) {
  for (const alias of aliases) {
    const value = row[normalizeKey(alias)];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function formatCnpj(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return String(value ?? '');
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function parseEndereco(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { logradouro: '', numero: '', bairro: '', cep: '' };

  const cepMatch = raw.match(/(\d{2}\.?\d{3}-?\d{3}|\d{8})/);
  const cep = cepMatch?.[1]?.replace(/\D/g, '') ?? '';
  const withoutCep = raw
    .replace(/CEP\s*:?\s*/i, '')
    .replace(cepMatch?.[0] ?? '', '')
    .replace(/\s+-\s*$/g, '')
    .trim();
  const parts = withoutCep.split(',').map((part) => part.trim()).filter(Boolean);

  if (!parts.length) return { logradouro: withoutCep, numero: '', bairro: '', cep };

  const logradouro = parts[0] ?? '';
  const numberPart = parts.find((part, index) => index > 0 && /(^|\s)(SN|S\/N|\d+[A-Z]?)(\s|$)/i.test(part)) ?? '';
  const numeroMatch = numberPart.match(/(SN|S\/N|\d+[A-Z]?)/i);
  const numero = numeroMatch?.[1]?.toUpperCase() ?? '';
  const numberIndex = numberPart ? parts.indexOf(numberPart) : -1;
  const bairro = numberIndex >= 0
    ? (parts.slice(numberIndex + 1).find((part) => !/LOJA|PISO|ANDAR|SALA|CEP/i.test(part)) ?? '')
    : (parts[parts.length - 1] ?? '');

  return { logradouro, numero, bairro, cep };
}

function inferUf(estado, cep) {
  const cleaned = String(estado ?? '').trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(cleaned)) return cleaned;
  const cepNumber = Number(cep);
  const range = cepRanges.find(([start, end]) => cep.length === 8 && cepNumber >= start && cepNumber <= end);
  return range?.[2] ?? '';
}

function parseEnv(envPath) {
  const values = {};
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return values;
}

const workbook = await readXlsxFile(file);
const sheet = Array.isArray(workbook) && workbook[0]?.data ? workbook[0] : { sheet: 'primeira aba', data: workbook };
const [headersRow, ...dataRows] = sheet.data;
const headers = headersRow.map(normalizeKey);
const ignoredPresent = headers.filter((header) => ignoredColumns.has(header));

const parsed = dataRows
  .map((values, index) => {
    const row = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex]]));
    const endereco = parseEndereco(readValue(row, ['endereco']));
    const cepDigits = onlyDigits(readValue(row, ['cep']) || endereco.cep);
    const cep = cepDigits.length < 8 ? cepDigits.padStart(8, '0') : cepDigits;
    const cnpjDigits = onlyDigits(readValue(row, ['cnpj']));
    const operationStatus = [
      normalizeUnitName(readValue(row, ['nome', 'unidade', 'nome_da_unidade'])),
      readValue(row, ['data_inauguracao']),
      readValue(row, ['mes_ano_inauguracao']),
      readValue(row, ['status']),
    ].filter(Boolean).join(' ');
    const unidade = {
      linha_excel: index + 2,
      nome: normalizeUnitName(readValue(row, ['nome', 'unidade', 'nome_da_unidade'])),
      cnpj: formatCnpj(cnpjDigits),
      cep,
      uf: inferUf(readValue(row, ['uf', 'estado', 'sigla', 'regiao']), cep),
      bairro: readValue(row, ['bairro']) || endereco.bairro,
      rua: readValue(row, ['rua', 'logradouro', 'avenida']) || endereco.logradouro,
      numero: readValue(row, ['numero', 'n', 'num']) || endereco.numero,
    };

    const erro = !unidade.nome
      ? 'Nome da unidade obrigatorio.'
      : blockedOwnUnitCnpjs.has(cnpjDigits) || isNonOperationalUnit(operationStatus)
        ? 'Unidade fora do escopo operacional.'
        : cnpjDigits.length !== 14
          ? 'CNPJ deve conter 14 digitos.'
          : unidade.cep.length !== 8
            ? 'CEP deve conter 8 digitos.'
            : !unidade.uf
              ? 'UF nao identificada.'
              : !unidade.bairro
                ? 'Bairro obrigatorio.'
                : !unidade.rua
                  ? 'Rua obrigatoria.'
                  : !unidade.numero
                    ? 'Numero obrigatorio.'
                    : null;

    return { ...unidade, cnpj_digits: cnpjDigits, erro };
  })
  .filter((row) => row.nome || row.cnpj_digits || row.cep);

const envPath = path.resolve('api-selfit/.env');
const env = parseEnv(envPath);
const pool = mysql.createPool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

const [existingRows] = await pool.query(
  "SELECT id, nome, cnpj FROM unidades WHERE REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') <> ''",
);
const existingCnpj = new Set(existingRows.map((row) => onlyDigits(row.cnpj)));

const valid = [];
const duplicates = [];
const invalid = [];
const acceptedFromExcel = [];

for (const row of parsed) {
  if (row.erro) {
    invalid.push(row);
    continue;
  }
  acceptedFromExcel.push(row);
  if (existingCnpj.has(row.cnpj_digits)) {
    duplicates.push(row);
    continue;
  }
  valid.push(row);
}

const deleteCandidates = acceptedFromExcel.filter((row) => !preservedCnpjs.has(row.cnpj_digits));

console.log(JSON.stringify({
  arquivo: file,
  aba: sheet.sheet,
  colunas_ignoradas_encontradas: ignoredPresent,
  linhas_lidas: parsed.length,
  validas_novas: valid.length,
  duplicadas_no_banco: duplicates.length,
  invalidas: invalid.length,
  candidatas_exclusao_importacao: deleteCandidates.length,
  exemplos_validas: valid.slice(0, 5).map(({ linha_excel, nome, cnpj, cep, uf, bairro, rua, numero }) => ({ linha_excel, nome, cnpj, cep, uf, bairro, rua, numero })),
  exemplos_duplicadas: duplicates.slice(0, 5).map(({ linha_excel, nome, cnpj }) => ({ linha_excel, nome, cnpj })),
  exemplos_invalidas: invalid.slice(0, 10).map(({ linha_excel, nome, cnpj, erro }) => ({ linha_excel, nome, cnpj, erro })),
}, null, 2));

if (deleteImported) {
  if (!deleteCandidates.length) {
    console.log('EXCLUSAO=0');
    await pool.end();
    process.exit(0);
  }

  const deleteCnpjs = deleteCandidates.map((row) => row.cnpj_digits);
  const placeholders = deleteCnpjs.map(() => '?').join(', ');
  const [linkedRows] = await pool.query(
    `SELECT u.id, u.nome, u.cnpj,
            COUNT(DISTINCT t.id) AS tvs,
            COUNT(DISTINCT c.id) AS cameras,
            COUNT(DISTINCT e.id) AS equipamentos
       FROM unidades u
       LEFT JOIN tvs t ON t.unidade_id = u.id AND t.deleted_at IS NULL
       LEFT JOIN cameras c ON c.unidade_id = u.id AND c.deleted_at IS NULL
       LEFT JOIN equipamentos e ON e.unidade_id = u.id AND e.deleted_at IS NULL
      WHERE REPLACE(REPLACE(REPLACE(u.cnpj, '.', ''), '/', ''), '-', '') IN (${placeholders})
      GROUP BY u.id, u.nome, u.cnpj
     HAVING tvs > 0 OR cameras > 0 OR equipamentos > 0`,
    deleteCnpjs,
  );

  if (linkedRows.length) {
    console.log(JSON.stringify({
      exclusao_bloqueada: true,
      motivo: 'Existem unidades com TVs, cameras ou equipamentos vinculados.',
      unidades_com_vinculo: linkedRows,
    }, null, 2));
    await pool.end();
    process.exit(1);
  }

  if (apply) {
    const [result] = await pool.query(
      `DELETE FROM unidades
        WHERE REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') IN (${placeholders})`,
      deleteCnpjs,
    );
    console.log(`EXCLUIDO=${result.affectedRows}`);
  } else {
    const [rowsToDelete] = await pool.query(
      `SELECT id, nome, cnpj, uf
         FROM unidades
        WHERE REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') IN (${placeholders})
        ORDER BY id ASC
        LIMIT 10`,
      deleteCnpjs,
    );
    console.log(JSON.stringify({
      modo: 'simulacao_exclusao',
      encontradas_para_excluir: rowsToDelete.length,
      exemplos_para_excluir: rowsToDelete,
      instrucao: 'Rode com --delete-imported --apply para excluir.',
    }, null, 2));
  }
}

if (!deleteImported && apply && valid.length) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const row of valid) {
      await connection.query(
        'INSERT INTO unidades (nome, cnpj, cep, uf, bairro, rua, numero) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [row.nome, row.cnpj, row.cep, row.uf, row.bairro, row.rua, row.numero],
      );
    }
    await connection.commit();
    console.log(`IMPORTADO=${valid.length}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

await pool.end();
