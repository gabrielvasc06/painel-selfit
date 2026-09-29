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

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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

function isHoldingOrMatriz(value) {
  const normalized = normalizeText(value);
  return normalized.includes('HOLDING') || normalized.includes('MATRIZ');
}

const env = parseEnv('./api-selfit/.env');
const db = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

const [units] = await db.query(`
  SELECT id, nome, cnpj, uf
    FROM unidades
   WHERE tipo_unidade = 'PROPRIA'
   ORDER BY nome
`);

const deleteCandidates = units.filter((unit) => isHoldingOrMatriz(unit.nome));
const keepUnits = units.filter((unit) => !isHoldingOrMatriz(unit.nome));
const renameCandidates = keepUnits
  .map((unit) => ({ ...unit, novo_nome: normalizeUnitName(unit.nome) }))
  .filter((unit) => unit.nome !== unit.novo_nome);

const finalNames = new Map();
const duplicateNames = [];
for (const unit of keepUnits) {
  const finalName = normalizeUnitName(unit.nome);
  const previous = finalNames.get(finalName);
  if (previous) duplicateNames.push({ nome_final: finalName, unidades: [previous, unit] });
  else finalNames.set(finalName, unit);
}

const linkedDeleteIds = deleteCandidates.map((unit) => unit.id);
let linkedDeleteRows = [];
if (linkedDeleteIds.length) {
  const placeholders = linkedDeleteIds.map(() => '?').join(', ');
  const [rows] = await db.query(`
    SELECT u.id, u.nome,
           COUNT(DISTINCT t.id) AS tvs,
           COUNT(DISTINCT c.id) AS cameras,
           COUNT(DISTINCT e.id) AS equipamentos
      FROM unidades u
      LEFT JOIN tvs t ON t.unidade_id = u.id AND t.deleted_at IS NULL
      LEFT JOIN cameras c ON c.unidade_id = u.id AND c.deleted_at IS NULL
      LEFT JOIN equipamentos e ON e.unidade_id = u.id AND e.deleted_at IS NULL
     WHERE u.id IN (${placeholders})
     GROUP BY u.id, u.nome
    HAVING tvs > 0 OR cameras > 0 OR equipamentos > 0
  `, linkedDeleteIds);
  linkedDeleteRows = rows;
}

const report = {
  modo: apply ? 'aplicacao' : 'simulacao',
  total_unidades_proprias: units.length,
  eliminadas_holding_matriz: deleteCandidates.map(({ id, nome, cnpj, uf }) => ({ id, nome, cnpj, uf })),
  alteracoes_romanos_para_numeros: renameCandidates.map(({ id, nome, novo_nome, cnpj, uf }) => ({ id, nome, novo_nome, cnpj, uf })),
  conflitos_nome_final: duplicateNames,
  bloqueadas_por_vinculo: linkedDeleteRows,
};

if (!apply) {
  console.log(JSON.stringify({ ...report, instrucao: 'Rode: node scripts/normalize-unidades-nomes.mjs --apply' }, null, 2));
  await db.end();
  process.exit(0);
}

if (duplicateNames.length || linkedDeleteRows.length) {
  console.log(JSON.stringify({ ...report, aplicado: false }, null, 2));
  await db.end();
  process.exit(1);
}

await db.beginTransaction();
try {
  let deleted = 0;
  if (deleteCandidates.length) {
    const ids = deleteCandidates.map((unit) => unit.id);
    const placeholders = ids.map(() => '?').join(', ');
    const [result] = await db.query(`DELETE FROM unidades WHERE id IN (${placeholders})`, ids);
    deleted = result.affectedRows;
  }

  let renamed = 0;
  for (const unit of renameCandidates) {
    const [result] = await db.query(
      'UPDATE unidades SET nome = ? WHERE id = ?',
      [unit.novo_nome, unit.id],
    );
    renamed += result.affectedRows;
  }

  await db.commit();
  console.log(JSON.stringify({ ...report, aplicado: true, deletadas: deleted, renomeadas: renamed }, null, 2));
} catch (error) {
  await db.rollback();
  throw error;
} finally {
  await db.end();
}
