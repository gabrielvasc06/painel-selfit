// Arquivo: scripts/audit-bairros-unidades.mjs
// Serve para: verifica bairros suspeitos nas unidades cadastradas.

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

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

const streetWords = /\b(RUA|AV|AVENIDA|ROD|RODOVIA|TRAVESSA|ESTRADA|ALAMEDA|PRACA|PRAÇA|LARGO|BR|KM|N[ºO]?|NUMERO)\b/i;
const placeWords = /\b(SHOPPING|LOJA|PISO|SALA|MALL|CENTER|CENTRE|CENTRO COMERCIAL|GALERIA|BOX|QUIOSQUE|CONDOMINIO|CONDOMÍNIO|EDIFICIO|EDIFÍCIO|TORRE)\b/i;
const cepLike = /\b\d{2}\.?\d{3}-?\d{3}\b/;
const stateNames = new Set([
  'ACRE', 'ALAGOAS', 'AMAPA', 'AMAZONAS', 'BAHIA', 'CEARA', 'DISTRITO FEDERAL',
  'ESPIRITO SANTO', 'GOIAS', 'MARANHAO', 'MATO GROSSO', 'MATO GROSSO DO SUL',
  'MINAS GERAIS', 'PARA', 'PARAIBA', 'PARANA', 'PERNAMBUCO', 'PIAUI',
  'RIO DE JANEIRO', 'RIO GRANDE DO NORTE', 'RIO GRANDE DO SUL', 'RONDONIA',
  'RORAIMA', 'SANTA CATARINA', 'SAO PAULO', 'SERGIPE', 'TOCANTINS',
]);

const env = parseEnv('./api-selfit/.env');
const db = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

const [rows] = await db.query(`
  SELECT id, nome, cnpj, cep, uf, bairro, rua, numero
    FROM unidades
   WHERE tipo_unidade = 'PROPRIA'
   ORDER BY uf, nome
`);

const suspects = [];
const bairroCounts = new Map();

for (const unit of rows) {
  const bairro = normalize(unit.bairro);
  bairroCounts.set(bairro, (bairroCounts.get(bairro) ?? 0) + 1);
}

for (const unit of rows) {
  const bairro = normalize(unit.bairro);
  const nome = normalize(unit.nome);
  const rua = normalize(unit.rua);
  const cep = onlyDigits(unit.cep);
  const reasons = [];

  if (!bairro) reasons.push('bairro vazio');
  if (/\d/.test(bairro)) reasons.push('bairro contem numero');
  if (cepLike.test(bairro) || onlyDigits(bairro) === cep) reasons.push('bairro parece CEP');
  if (streetWords.test(bairro)) reasons.push('bairro parece logradouro');
  if (placeWords.test(bairro)) reasons.push('bairro parece complemento de shopping/loja');
  if (bairro.length > 45) reasons.push('bairro muito longo');
  if (bairro.includes(',') || bairro.includes(';')) reasons.push('bairro contem separador de endereco');
  if (stateNames.has(bairro)) reasons.push('bairro parece estado');
  if (bairro === normalize(unit.uf)) reasons.push('bairro parece UF');
  if (bairro && rua && bairro === rua) reasons.push('bairro igual a rua');

  if (reasons.length) {
    suspects.push({
      id: unit.id,
      nome: unit.nome,
      uf: unit.uf,
      cep: unit.cep,
      bairro: unit.bairro,
      rua: unit.rua,
      numero: unit.numero,
      motivos: reasons,
    });
  }
}

const bairrosRepetidos = [...bairroCounts.entries()]
  .filter(([bairro, total]) => bairro && total >= 8)
  .sort((a, b) => b[1] - a[1])
  .map(([bairro, total]) => ({ bairro, total }));

console.log(JSON.stringify({
  total_unidades: rows.length,
  bairros_suspeitos: suspects.length,
  suspeitos: suspects,
  bairros_muito_repetidos: bairrosRepetidos,
}, null, 2));

await db.end();
