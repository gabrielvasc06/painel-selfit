// Arquivo: scripts/import-unidades-planilhas.mjs
// Serve para: importa unidades de planilhas consolidadas e resolve dados faltantes quando possivel.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import readXlsxFile from 'read-excel-file/node';

const require = createRequire(import.meta.url);
const mysql = require('../api-selfit/node_modules/mysql2/promise');

const files = [
  'C:/Users/vanderson.gabriel/Downloads/UNIDADES.xlsx',
];

const apply = process.argv.includes('--apply');
const resolveCnpj = process.argv.includes('--resolve-cnpj');

const cepRanges = [
  [1000000, 19999999, 'SP'], [20000000, 28999999, 'RJ'], [29000000, 29999999, 'ES'],
  [30000000, 39999999, 'MG'], [40000000, 48999999, 'BA'], [49000000, 49999999, 'SE'],
  [50000000, 56999999, 'PE'], [57000000, 57999999, 'AL'], [58000000, 58999999, 'PB'],
  [59000000, 59999999, 'RN'], [60000000, 63999999, 'CE'], [64000000, 64999999, 'PI'],
  [65000000, 65999999, 'MA'], [66000000, 68899999, 'PA'], [68900000, 68999999, 'AP'],
  [69000000, 69299999, 'AM'], [69300000, 69399999, 'RR'], [69400000, 69899999, 'AM'],
  [69900000, 69999999, 'AC'], [70000000, 72799999, 'DF'], [72800000, 72999999, 'GO'],
  [73000000, 73699999, 'DF'], [73700000, 76799999, 'GO'], [76800000, 76999999, 'RO'],
  [77000000, 77999999, 'TO'], [78000000, 78899999, 'MT'], [79000000, 79999999, 'MS'],
  [80000000, 87999999, 'PR'], [88000000, 89999999, 'SC'], [90000000, 99999999, 'RS'],
];

const blockedOwnUnitCnpjs = new Set([
  '22902694006630', // LAR CENTER
  '22902694006983', // SANTA CLARA
  '22902694007017', // ARAPANES
]);

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

function cleanName(value) {
  return String(value ?? '')
    .replace(/^SELFIT\s*-\s*/i, '')
    .replace(/^FRANQUIA\s*/i, '')
    .replace(/\s+-\s+\d+$/i, '')
    .replace(/\s*\/\s*[A-Z]{2}$/i, '')
    .replace(/\s+-\s*[A-Z]{2}$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('pt-BR')
    .replace(/(^|[\s-])III(?=$|[\s-])/g, (_match, prefix) => `${prefix}3`)
    .replace(/(^|[\s-])II(?=$|[\s-])/g, (_match, prefix) => `${prefix}2`)
    .replace(/(^|[\s-])I(?=$|[\s-])/g, (_match, prefix) => `${prefix}1`)
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUnitNumber(value) {
  const raw = String(value ?? '').trim().toLocaleUpperCase('pt-BR').replace(/\s+/g, ' ');
  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!raw) return '';
  if (/^(S\/?N|SEM NUMERO)$/.test(normalized)) return 'S/N';
  if (/^0+$/.test(raw)) return 'S/N';
  const padded = raw.match(/^0+([1-9]\d*[A-Z]?)$/);
  return padded ? padded[1] : raw;
}

function formatCnpj(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return String(value ?? '');
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function parseEndereco(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { rua: '', numero: '', bairro: '', cep: '' };

  const cepMatch = raw.match(/(\d{2}\.?\d{3}-?\d{3}|\d{8})/);
  const cep = cepMatch?.[1]?.replace(/\D/g, '') ?? '';
  const withoutCep = raw
    .replace(/CEP\s*:?\s*/i, '')
    .replace(cepMatch?.[0] ?? '', '')
    .replace(/\s+-\s*$/g, '')
    .trim();
  const parts = withoutCep.split(',').map((part) => part.trim()).filter(Boolean);

  const rua = parts[0] ?? withoutCep;
  const numberPart = parts.find((part, index) => index > 0 && /(^|\s)(SN|S\/N|\d+[A-Z]?)(\s|$)/i.test(part)) ?? '';
  const numero = normalizeUnitNumber(numberPart.match(/(SN|S\/N|\d+[A-Z]?)/i)?.[1] ?? '');
  const numberIndex = numberPart ? parts.indexOf(numberPart) : -1;
  const bairro = numberIndex >= 0
    ? (parts.slice(numberIndex + 1).find((part) => !/LOJA|PISO|ANDAR|SALA|CEP/i.test(part)) ?? '')
    : '';

  return { rua, numero, bairro, cep };
}

function inferUf(uf, cep) {
  const cleaned = String(uf ?? '').trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(cleaned)) return cleaned;
  const cepNumber = Number(cep);
  const range = cepRanges.find(([start, end]) => cep.length === 8 && cepNumber >= start && cepNumber <= end);
  return range?.[2] ?? '';
}

function makeRow(sheetName, headers, values, file) {
  const row = Object.fromEntries(headers.map((header, index) => [normalizeKey(header), values[index]]));
  row._sheet = sheetName;
  row._file = file;
  return row;
}

function sheetTipo(sheetName) {
  return 'PROPRIA';
}

function isFranchiseSheet(sheetName) {
  return normalizeKey(sheetName).includes('franquia');
}

function readOperationStatus(row) {
  return normalizeKey([
    readValue(row, ['data_inauguracao']),
    readValue(row, ['mes_ano_inauguracao']),
  ].filter(Boolean).join(' '));
}

function isOwnUnitBlocked(status) {
  return ['pre_operacional', 'fechada', 'weburn', 'galpao', 'holding', 'matriz'].some((blocked) => status.includes(blocked));
}

async function readRows() {
  const output = [];
  for (const file of files) {
    const workbook = await readXlsxFile(file);
    for (const sheet of workbook) {
      if (isFranchiseSheet(sheet.sheet)) continue;
      const [headers = [], ...rows] = sheet.data;
      for (let index = 0; index < rows.length; index += 1) {
        const row = makeRow(sheet.sheet, headers, rows[index], file);
        output.push({
          linha_excel: index + 2,
          arquivo: file,
          aba: sheet.sheet,
          tipo_unidade: sheetTipo(sheet.sheet),
          nome: cleanName(readValue(row, ['unidade', 'nome', 'nome_fantasia2', 'nome_fantasia'])),
          cnpj_digits: onlyDigits(readValue(row, ['cnpj'])),
          uf: readValue(row, ['uf', 'estado', 'sigla']),
          endereco: readValue(row, ['endereco']),
          operation_status: readOperationStatus(row),
        });
      }
    }
  }
  return output.filter((row) => row.nome || row.cnpj_digits || row.endereco);
}

async function fetchCnpjAddress(cnpjDigits) {
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 SelfitInventoryImporter/1.0',
    },
  });
  if (!response.ok) throw new Error(`BrasilAPI ${response.status}`);
  const data = await response.json();
  const streetType = String(data.descricao_tipo_de_logradouro ?? '').trim();
  const streetName = String(data.logradouro ?? '').trim();
  return {
    cnpj_digits: onlyDigits(data.cnpj ?? cnpjDigits),
    nome_api: cleanName(data.nome_fantasia || data.razao_social),
    cep: onlyDigits(data.cep),
    uf: String(data.uf ?? '').trim().toUpperCase(),
    bairro: String(data.bairro ?? '').trim(),
    rua: [streetType, streetName].filter(Boolean).join(' ').trim() || streetName,
    numero: normalizeUnitNumber(String(data.numero ?? '').trim()),
  };
}

function validate(row) {
  return !row.nome ? 'Nome da unidade obrigatorio.'
    : row.tipo_unidade !== 'PROPRIA' ? 'Tipo da unidade invalido.'
      : row.tipo_unidade === 'PROPRIA' && isOwnUnitBlocked(`${row.nome} ${row.operation_status}`) ? 'Unidade propria ainda nao ativa na planilha.'
        : blockedOwnUnitCnpjs.has(row.cnpj_digits) ? 'Unidade fora do escopo operacional.'
          : row.cnpj_digits.length !== 14 ? 'CNPJ deve conter 14 digitos.'
            : row.cep.length !== 8 ? 'CEP deve conter 8 digitos.'
              : row.uf.length !== 2 ? 'UF deve conter 2 letras.'
                : !row.bairro ? 'Bairro obrigatorio.'
                  : !row.rua ? 'Rua obrigatoria.'
                    : !row.numero ? 'Numero obrigatorio.'
                      : null;
}

const rawRows = await readRows();
const byCnpj = new Map();
const incompleteNoCnpj = [];

for (const row of rawRows) {
  if (!row.cnpj_digits) {
    incompleteNoCnpj.push({ ...row, erro: 'Sem CNPJ na planilha.' });
    continue;
  }

  const parsedAddress = parseEndereco(row.endereco);
  const current = {
    ...row,
    cnpj: formatCnpj(row.cnpj_digits),
    cep: parsedAddress.cep,
    uf: inferUf(row.uf, parsedAddress.cep),
    bairro: parsedAddress.bairro,
    rua: parsedAddress.rua,
    numero: normalizeUnitNumber(parsedAddress.numero),
  };

  byCnpj.set(row.cnpj_digits, { ...byCnpj.get(row.cnpj_digits), ...current });
}

const cnpjResolved = [];
const cnpjResolveErrors = [];

if (resolveCnpj) {
  const addressCandidates = [...byCnpj.values()].filter((row) => validate(row) !== null);
  for (const row of addressCandidates) {
    if (validate(row) === null) continue;
    try {
      const api = await fetchCnpjAddress(row.cnpj_digits);
      Object.assign(row, {
        nome: row.nome || api.nome_api,
        cep: api.cep || row.cep,
        uf: api.uf || row.uf,
        bairro: api.bairro || row.bairro,
        rua: api.rua || row.rua,
        numero: normalizeUnitNumber(api.numero || row.numero),
      });
      cnpjResolved.push(row.cnpj);
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      cnpjResolveErrors.push({ nome: row.nome, cnpj: row.cnpj, erro: error.message });
    }
  }
}

const parsed = [...byCnpj.values()].map((row) => {
  const erro = validate(row);
  return { ...row, erro };
});

const env = parseEnv('./api-selfit/.env');
const pool = mysql.createPool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

const [existingRows] = await pool.query(
  "SELECT cnpj FROM unidades WHERE REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') <> ''",
);
const existingCnpj = new Set(existingRows.map((row) => onlyDigits(row.cnpj)));

const valid = parsed.filter((row) => !row.erro && !existingCnpj.has(row.cnpj_digits));
const duplicates = parsed.filter((row) => !row.erro && existingCnpj.has(row.cnpj_digits));
const invalid = [...parsed.filter((row) => row.erro), ...incompleteNoCnpj];

console.log(JSON.stringify({
  arquivos: files,
  linhas_lidas: rawRows.length,
  validas_novas: valid.length,
  proprias_validas: valid.filter((row) => row.tipo_unidade === 'PROPRIA').length,
  duplicadas_no_banco: duplicates.length,
  invalidas: invalid.length,
  proprias_completadas_por_cnpj: cnpjResolved.length,
  erros_consulta_cnpj: cnpjResolveErrors.length,
  exemplos_validas: valid.slice(0, 8).map(({ nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero }) => ({ nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero })),
  exemplos_invalidas: invalid.slice(0, 15).map(({ nome, tipo_unidade, cnpj, cnpj_digits, aba, erro }) => ({ nome, tipo_unidade, cnpj: cnpj ?? cnpj_digits, aba, erro })),
  exemplos_erros_cnpj: cnpjResolveErrors.slice(0, 10),
}, null, 2));

if (apply && valid.length) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const row of valid) {
      await connection.query(
        'INSERT INTO unidades (nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          row.nome.toLocaleUpperCase('pt-BR'),
          row.tipo_unidade,
          row.cnpj,
          row.cep,
          row.uf,
          row.bairro.toLocaleUpperCase('pt-BR'),
          row.rua.toLocaleUpperCase('pt-BR'),
          row.numero.toLocaleUpperCase('pt-BR'),
        ],
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
