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

function isSuspiciousBairro(unit) {
  const bairro = normalize(unit.bairro);
  const nome = normalize(unit.nome);
  const rua = normalize(unit.rua);
  const cep = onlyDigits(unit.cep);
  const streetWords = /\b(RUA|AV|AVENIDA|ROD|RODOVIA|TRAVESSA|ESTRADA|ALAMEDA|PRACA|PRAÇA|LARGO|BR|KM|N[ºO]?|NUMERO)\b/i;
  const placeWords = /\b(SHOPPING|LOJA|PISO|SALA|MALL|CENTER|CENTRE|CENTRO COMERCIAL|GALERIA|BOX|QUIOSQUE|CONDOMINIO|CONDOMÍNIO|EDIFICIO|EDIFÍCIO|TORRE)\b/i;
  const stateNames = new Set(['CEARA', 'BAHIA', 'PERNAMBUCO', 'MARANHAO', 'PIAUI', 'PARAIBA', 'PARA', 'SERGIPE', 'ALAGOAS', 'AMAZONAS', 'SAO PAULO', 'MINAS GERAIS', 'MATO GROSSO', 'RIO DE JANEIRO', 'RIO GRANDE DO NORTE']);

  return !bairro
    || /\d/.test(bairro)
    || onlyDigits(bairro) === cep
    || streetWords.test(bairro)
    || placeWords.test(bairro)
    || bairro.length > 45
    || bairro.includes(',')
    || bairro.includes(';')
    || stateNames.has(bairro)
    || bairro === normalize(unit.uf)
    || (bairro && rua && bairro === rua);
}

async function viaCep(cep) {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!response.ok) throw new Error(`ViaCEP HTTP ${response.status}`);
  const data = await response.json();
  if (data.erro) return null;
  return data;
}

const apply = process.argv.includes('--apply');
const env = parseEnv('./api-selfit/.env');
const db = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

const [units] = await db.query(`
  SELECT id, nome, cnpj, cep, uf, bairro, rua, numero
    FROM unidades
   WHERE tipo_unidade = 'PROPRIA'
   ORDER BY uf, nome
`);

const suspicious = units.filter(isSuspiciousBairro);
const updates = [];
const unresolved = [];
const manualBairroByCep = new Map([
  ['58037972', 'MANAIRA'],
]);

for (const unit of suspicious) {
  const cep = onlyDigits(unit.cep);
  if (cep.length !== 8) {
    unresolved.push({ ...unit, motivo: 'CEP invalido para consulta externa' });
    continue;
  }

  if (manualBairroByCep.has(cep)) {
    const bairroSugerido = manualBairroByCep.get(cep);
    if (bairroSugerido !== normalize(unit.bairro)) {
      updates.push({
        id: unit.id,
        nome: unit.nome,
        uf: unit.uf,
        cep: unit.cep,
        bairro_atual: unit.bairro,
        bairro_sugerido: bairroSugerido,
        rua_atual: unit.rua,
        rua_viacep: null,
        uf_viacep: unit.uf,
        fonte: 'pesquisa externa por CEP/endereco',
      });
    }
    continue;
  }

  try {
    const data = await viaCep(cep);
    await new Promise((resolve) => setTimeout(resolve, 80));
    const bairroViaCep = normalize(data?.bairro);
    const logradouroViaCep = normalize(data?.logradouro);
    const ufViaCep = normalize(data?.uf);

    if (!bairroViaCep) {
      unresolved.push({ ...unit, motivo: 'ViaCEP nao retornou bairro', viacep: data });
      continue;
    }

    if (bairroViaCep !== normalize(unit.bairro)) {
      updates.push({
        id: unit.id,
        nome: unit.nome,
        uf: unit.uf,
        cep: unit.cep,
        bairro_atual: unit.bairro,
        bairro_sugerido: bairroViaCep,
        rua_atual: unit.rua,
        rua_viacep: logradouroViaCep,
        uf_viacep: ufViaCep,
      });
    }
  } catch (error) {
    unresolved.push({ ...unit, motivo: error.message });
  }
}

if (apply && updates.length) {
  await db.beginTransaction();
  try {
    for (const update of updates) {
      await db.query('UPDATE unidades SET bairro = ? WHERE id = ?', [update.bairro_sugerido, update.id]);
    }
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  }
}

console.log(JSON.stringify({
  aplicar: apply,
  total_suspeitos: suspicious.length,
  correcoes_sugeridas: updates.length,
  correcoes: updates,
  nao_resolvidos: unresolved,
  instrucao: apply ? 'Correcoes aplicadas.' : 'Revise e rode: node scripts/audit-bairros-viacep.mjs --apply',
}, null, 2));

await db.end();
