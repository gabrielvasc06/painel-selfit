// Arquivo: scripts/homologacao-software.mjs
// Serve para: bateria de homologacao automatica que testa front/CORS, API e banco com dados temporarios.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'api-selfit');
const requireFromApi = createRequire(path.join(apiDir, 'package.json'));
const dotenv = requireFromApi('dotenv');
const mysql = requireFromApi('mysql2/promise');
const jwt = requireFromApi('jsonwebtoken');

dotenv.config({ path: path.join(apiDir, '.env'), quiet: true });

const baseUrl = `http://localhost:${process.env.PORT ?? '3000'}`;
const token = jwt.sign(
  { id: 0, usuario: 'HOMOLOGACAO.CODEX' },
  process.env.JWT_SECRET,
  { expiresIn: '30m' },
);

const prefix = `HOMOLOG_${Date.now()}`;
const createdRefs = [];
const createdMaintenanceIds = [];
const results = [];
const frontendOriginsToValidate = [
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

function ok(nome, detalhe = '') {
  results.push({ status: 'OK', nome, detalhe });
}

function fail(nome, error) {
  const detail = error instanceof Error ? error.message : String(error);
  results.push({ status: 'FALHOU', nome, detalhe: detail });
  throw new Error(`${nome}: ${detail}`);
}

async function request(pathname, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.sucesso === false) {
    throw new Error(`${response.status} ${body.mensagem ?? body.message ?? response.statusText}`);
  }
  return body;
}

async function requestWithoutToken(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  return response.status;
}

async function validateCorsOrigin(origin) {
  const response = await fetch(`${baseUrl}/auth`, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  const allowedOrigin = response.headers.get('access-control-allow-origin');
  assert(response.ok, `Preflight CORS falhou para ${origin}.`);
  assert(allowedOrigin === origin, `CORS retornou ${allowedOrigin || 'vazio'} para ${origin}.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function firstDigits(value, min = 3) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= min ? digits.slice(0, Math.min(digits.length, 8)) : '';
}

async function cleanup(connection) {
  for (const id of createdMaintenanceIds) {
    await connection.query('DELETE FROM manutencoes WHERE id = ?', [id]);
  }

  await connection.query(
    `DELETE m FROM manutencoes m
     JOIN tvs t ON m.item_tipo = 'TV' AND m.item_id = t.id
     WHERE t.nome_identificacao LIKE ?`,
    [`${prefix}%`],
  );
  await connection.query(
    `DELETE m FROM manutencoes m
     JOIN equipamentos e ON m.item_tipo = 'EQUIPAMENTO' AND m.item_id = e.id
     WHERE e.nome_identificacao LIKE ?`,
    [`${prefix}%`],
  );
  await connection.query(
    `DELETE m FROM manutencoes m
     JOIN cameras c ON m.item_tipo = 'CAMERA' AND m.item_id = c.id
     WHERE c.nome_identificacao LIKE ?`,
    [`${prefix}%`],
  );

  for (const table of ['tvs', 'equipamentos', 'cameras']) {
    await connection.query(`DELETE FROM ${table} WHERE nome_identificacao LIKE ?`, [`${prefix}%`]);
    const [[{ nextId }]] = await connection.query(`SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM ${table}`);
    await connection.query(`ALTER TABLE ${table} AUTO_INCREMENT = ${Number(nextId)}`);
  }

  const [[{ nextId }]] = await connection.query('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM manutencoes');
  await connection.query(`ALTER TABLE manutencoes AUTO_INCREMENT = ${Number(nextId)}`);
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    await cleanup(connection);

    const [[counts]] = await connection.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN tipo_unidade <> 'PROPRIA' THEN 1 ELSE 0 END) AS naoProprias,
        SUM(CASE WHEN uf IS NULL OR uf = '' THEN 1 ELSE 0 END) AS semUf
      FROM unidades
    `);
    assert(Number(counts.total) > 0, 'Nenhuma unidade cadastrada no banco.');
    assert(Number(counts.naoProprias) === 0, 'Existem unidades fora do tipo PROPRIA.');
    assert(Number(counts.semUf) === 0, 'Existem unidades sem UF.');
    ok('Banco de unidades', `${counts.total} unidades proprias com UF.`);

    for (const origin of frontendOriginsToValidate) {
      await validateCorsOrigin(origin);
    }
    ok('CORS do front 5174', 'localhost:5174 e 127.0.0.1:5174 liberados pela API.');

    const [unitRows] = await connection.query(`
      SELECT id, nome, uf, cnpj, cep
      FROM unidades
      WHERE tipo_unidade = 'PROPRIA' AND uf IS NOT NULL AND uf <> ''
      ORDER BY nome ASC
      LIMIT 1
    `);
    const unit = unitRows[0];
    assert(unit, 'Nao foi possivel selecionar uma unidade propria para o teste.');
    ok('Unidade base da homologacao', `${unit.nome} / ${unit.uf}`);

    const noTokenStatus = await requestWithoutToken('/unidades');
    assert(noTokenStatus === 401, `Esperado 401 sem token, recebido ${noTokenStatus}.`);
    ok('Autenticacao obrigatoria', 'Rotas protegidas recusam requisicao sem token.');

    const allUnits = await request('/unidades');
    assert(Array.isArray(allUnits.dados) && allUnits.dados.length > 0, 'API nao retornou unidades.');
    ok('API /unidades', `${allUnits.dados.length} unidades retornadas.`);

    const nameTerm = unit.nome.slice(0, 5);
    const byName = await request(`/unidades?busca=${encodeURIComponent(nameTerm)}`);
    assert(byName.dados.some((item) => item.id === unit.id), 'Busca por nome nao encontrou a unidade base.');

    const cepTerm = firstDigits(unit.cep);
    if (cepTerm) {
      const byCep = await request(`/unidades?busca=${encodeURIComponent(cepTerm)}`);
      assert(byCep.dados.some((item) => item.id === unit.id), 'Busca por CEP nao encontrou a unidade base.');
    }

    const cnpjTerm = firstDigits(unit.cnpj);
    if (cnpjTerm) {
      const byCnpj = await request(`/unidades?busca=${encodeURIComponent(cnpjTerm)}`);
      assert(byCnpj.dados.some((item) => item.id === unit.id), 'Busca por CNPJ nao encontrou a unidade base.');
    }
    ok('Filtros de unidades', 'Nome, CEP e CNPJ validados quando disponiveis.');

    const itemsToCreate = [
      { module: 'TV', table: 'tvs', categoria: 'TV', nome: `${prefix} - TV01`, marca: 'SAMSUNG' },
      { module: 'EQUIPAMENTO', table: 'equipamentos', categoria: 'TOTEM', nome: `${prefix} - TT01`, marca: 'INTELBRAS' },
      { module: 'CAMERA', table: 'cameras', categoria: 'CAMERAS', nome: `${prefix} - CAM01`, marca: 'HIKVISION' },
    ];

    for (const item of itemsToCreate) {
      await request('/register/equipamentos', {
        method: 'POST',
        body: JSON.stringify({
          unidade_nome: unit.nome,
          unidade_uf: unit.uf,
          nome_identificacao: item.nome,
          categoria: item.categoria,
          marca: item.marca,
          status: 'ATIVO',
          data_garantia: '2028-12-31',
        }),
      });

      const list = await request(`/equipamentos/consultar?tipo=${item.module}&busca=${encodeURIComponent(prefix)}`);
      const created = list.dados.find((record) => record.nome_identificacao === item.nome);
      assert(created, `${item.module} nao retornou na consulta do seu modulo.`);
      assert(created.tipo_modulo === item.module, `${item.module} retornou com tipo_modulo incorreto.`);
      createdRefs.push({ ...item, apiId: created.id, rawId: created.raw_id });
      ok(`Cadastro ${item.module}`, `${created.id} em ${item.table}.`);
    }

    for (const item of createdRefs) {
      const otherTypes = ['TV', 'EQUIPAMENTO', 'CAMERA'].filter((type) => type !== item.module);
      for (const type of otherTypes) {
        const list = await request(`/equipamentos/consultar?tipo=${type}&busca=${encodeURIComponent(item.nome)}`);
        assert(!list.dados.some((record) => record.nome_identificacao === item.nome), `${item.nome} apareceu no modulo ${type}.`);
      }
    }
    ok('Separacao por modulo', 'TVs, equipamentos e cameras nao vazaram entre modulos.');

    for (const item of createdRefs) {
      await request(`/equipamentos/${encodeURIComponent(item.apiId)}`, {
        method: 'PUT',
        body: JSON.stringify({
          marca: `${item.marca} HOMOLOG`,
          status: 'EM MANUTENCAO',
          data_garantia: '2029-01-31',
        }),
      });
      const list = await request(`/equipamentos/consultar?tipo=${item.module}&busca=${encodeURIComponent(item.nome)}`);
      const updated = list.dados.find((record) => record.id === item.apiId);
      assert(updated?.marca === `${item.marca} HOMOLOG`, `${item.module} nao atualizou marca.`);
      assert(updated?.status === 'EM MANUTENCAO', `${item.module} nao atualizou status.`);
    }
    ok('Atualizacao de itens', 'PUT validado nos 3 modulos.');

    for (const item of createdRefs) {
      const result = await request('/manutencoes', {
        method: 'POST',
        body: JSON.stringify({
          equipamento_id: item.apiId,
          descricao: `HOMOLOGACAO ${item.module}`,
          data_envio: '2026-09-30',
          data_retorno: null,
          custo: 10.5,
          status_manutencao: 'ABERTA',
        }),
      });
      const maintenanceId = result.id ?? result.dados?.id;
      assert(maintenanceId, `API nao retornou id da manutencao para ${item.module}.`);
      createdMaintenanceIds.push(maintenanceId);

      const list = await request(`/equipamentos/manutencao?tipo=${item.module}&busca=${encodeURIComponent(unit.nome)}`);
      assert(list.dados.some((record) => record.manutencao_id === maintenanceId), `Manutencao de ${item.module} nao apareceu na consulta.`);
    }
    ok('Manutencoes', 'Criacao e consulta por modulo validadas.');

    const maintenanceToUpdate = createdMaintenanceIds[0];
    await request(`/manutencoes/${maintenanceToUpdate}`, {
      method: 'PUT',
      body: JSON.stringify({
        descricao: 'HOMOLOGACAO ATUALIZADA',
        status_manutencao: 'CONCLUIDA',
        data_envio: '2026-09-30',
        data_retorno: '2026-10-01',
      }),
    });
    ok('Atualizacao de manutencao', `Manutencao ${maintenanceToUpdate} atualizada.`);

    const maintenanceToDelete = createdMaintenanceIds.pop();
    await request(`/manutencoes/${maintenanceToDelete}`, { method: 'DELETE' });
    const [[deletedMaint]] = await connection.query('SELECT COUNT(*) AS total FROM manutencoes WHERE id = ?', [maintenanceToDelete]);
    assert(Number(deletedMaint.total) === 0, 'DELETE de manutencao nao removeu do banco.');
    ok('Exclusao de manutencao', `Manutencao ${maintenanceToDelete} removida definitivamente.`);

    for (const item of createdRefs) {
      await request(`/equipamentos/${encodeURIComponent(item.apiId)}`, { method: 'DELETE' });
      const list = await request(`/equipamentos/consultar?tipo=${item.module}&busca=${encodeURIComponent(item.nome)}`);
      assert(!list.dados.some((record) => record.id === item.apiId), `${item.module} ainda aparece apos exclusao.`);

      const [[row]] = await connection.query(`SELECT deleted_at FROM ${item.table} WHERE id = ?`, [item.rawId]);
      assert(row?.deleted_at, `${item.module} nao recebeu deleted_at no banco.`);
    }
    ok('Exclusao logica de itens', 'deleted_at validado nos 3 modulos.');
  } catch (error) {
    fail('Homologacao interrompida', error);
  } finally {
    await cleanup(connection);

    const [[leftovers]] = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM tvs WHERE nome_identificacao LIKE ?) +
        (SELECT COUNT(*) FROM equipamentos WHERE nome_identificacao LIKE ?) +
        (SELECT COUNT(*) FROM cameras WHERE nome_identificacao LIKE ?) AS total
    `, [`${prefix}%`, `${prefix}%`, `${prefix}%`]);
    if (Number(leftovers.total) === 0) ok('Limpeza dos dados temporarios', 'Nenhum registro de homologacao permaneceu nas tabelas de inventario.');

    await connection.end();
  }

  console.log(JSON.stringify({
    status: results.every((item) => item.status === 'OK') ? 'OK' : 'FALHOU',
    prefixo_teste: prefix,
    resultados: results,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: 'FALHOU',
    prefixo_teste: prefix,
    erro: error.message,
    resultados: results,
  }, null, 2));
  process.exitCode = 1;
});
