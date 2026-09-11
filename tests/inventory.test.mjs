import assert from 'node:assert/strict';
import test from 'node:test';

function nextTvNumberForInventory(equipamentos) {
  const maxNumber = equipamentos
    .filter((item) => item.categoria === 'TV')
    .map((item) => readTvSequence(item.nome))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 0);

  return String(maxNumber + 1).padStart(2, '0');
}

function buildTvName(unidadeNome, sequence) {
  const unidade = unidadeNome.trim();
  return unidade ? `${unidade} - ${sequence}` : sequence;
}

function readTvSequence(value) {
  const match = value.trim().match(/(\d+)$/);
  return match ? Number(match[1]) : Number(value);
}

function filterEquipamentosByModulo(equipamentos, modulo) {
  if (modulo === 'tvs') return equipamentos.filter((item) => item.categoria === 'TV');
  if (modulo === 'equipamentos') return equipamentos.filter((item) => item.categoria !== 'TV' && getSafeEquipmentCategories([item.categoria]).length > 0);
  return [];
}

function getSafeEquipmentCategories(categories = []) {
  const allowed = new Set(['TV', 'totem', 'catraca', 'leitor_facial', 'access_point', 'impressora', 'switch', 'firewall', 'roteador', 'nobreak']);
  return categories.filter((category) => allowed.has(category));
}

function sanitizeAssetTag(input) {
  return input.categoria === 'tv_box' ? input.asset_tag || null : null;
}

function sanitizeEletromidiaId(input) {
  return input.categoria === 'TV' ? input.eletromidia_id || null : null;
}

function updateEntity(items, id, patch, updatedAt) {
  return items.map((item) => (item.id === id ? { ...item, ...patch, updated_at: updatedAt } : item));
}

function deleteCameraCascade(cameras, manutencoes, cameraId) {
  return {
    cameras: cameras.filter((camera) => camera.id !== cameraId),
    manutencoes: manutencoes.filter((manutencao) => manutencao.equipamento_id !== cameraId),
  };
}

function normalizeSearchValue(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function cameraMatchesSearch(camera, query, unidadeNome = '') {
  const typedQuery = query.trim();
  if (!typedQuery) return true;

  const normalizedQuery = normalizeSearchValue(typedQuery);
  const searchableValues = [
    camera.nome,
    camera.setor,
    camera.marca,
    camera.modelo,
    unidadeNome,
  ];

  return searchableValues.some((value) => (
    value ? normalizeSearchValue(value).includes(normalizedQuery) : false
  ));
}

function normalizeKey(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function readValue(row, aliases) {
  for (const alias of aliases) {
    const value = row[normalizeKey(alias)];
    if (value) return value.trim();
  }
  return '';
}

function inferUf({ estado, cidade, cep }) {
  const stateNames = { pernambuco: 'PE', sao_paulo: 'SP', rio_de_janeiro: 'RJ' };
  const cityNames = { recife: 'PE', sao_paulo: 'SP', rio_de_janeiro: 'RJ' };
  const cleanedEstado = estado.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(cleanedEstado)) return cleanedEstado;
  if (stateNames[normalizeKey(estado)]) return stateNames[normalizeKey(estado)];
  if (cityNames[normalizeKey(cidade)]) return cityNames[normalizeKey(cidade)];
  const cepNumber = Number(cep);
  if (cep.length === 8 && cepNumber >= 50000000 && cepNumber <= 56999999) return 'PE';
  return '';
}

function parseUnidadesCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map(normalizeKey);
  return lines.slice(1).map((line) => {
    const values = line.split(separator).map((part) => part.trim().replace(/^"|"$/g, ''));
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    const nome = readValue(row, ['nome', 'unidade', 'nome_da_unidade', 'filial']);
    const cidade = readValue(row, ['cidade', 'municipio', 'localidade']);
    const logradouro = readValue(row, ['rua', 'logradouro', 'endereco']);
    const numero = readValue(row, ['numero', 'n', 'num']);
    const cep = readValue(row, ['cep']).replace(/\D/g, '');
    const bairro = readValue(row, ['bairro']);
    const cnpj = readValue(row, ['cnpj']);
    const estado = inferUf({ estado: readValue(row, ['estado', 'uf', 'sigla', 'regiao']), cidade, cep });

    return {
      nome,
      cidade,
      logradouro,
      estado,
      numero,
      cep: cep.replace(/\D/g, ''),
      bairro,
      cnpj,
      erro: !nome ? 'Nome da unidade e obrigatorio.' : !estado ? 'Estado nao identificado pela planilha.' : undefined,
    };
  });
}

test('gera identificacao de TV global para alinhar com autoincremento futuro', () => {
  const equipamentos = [
    { id: '1', unidade_id: 'uni-1', categoria: 'TV', nome: '01' },
    { id: '2', unidade_id: 'uni-1', categoria: 'TV', nome: 'Boa Viagem - 02' },
    { id: '3', unidade_id: 'uni-2', categoria: 'TV', nome: 'Shopping Recife - 10' },
    { id: '4', unidade_id: 'uni-1', categoria: 'totem', nome: '99' },
  ];

  assert.equal(nextTvNumberForInventory(equipamentos), '11');
  assert.equal(nextTvNumberForInventory([]), '01');
  assert.equal(buildTvName('Boa Viagem', nextTvNumberForInventory(equipamentos)), 'Boa Viagem - 11');
  assert.equal(buildTvName('', '01'), '01');
});

test('isola itens por modulo usando o catalogo vigente de equipamentos', () => {
  const equipamentos = [
    { id: 'tv', categoria: 'TV' },
    { id: 'totem', categoria: 'totem' },
    { id: 'nao-aceito', categoria: 'computador' },
    { id: 'switch', categoria: 'switch' },
    { id: 'box-legacy', categoria: 'tv_box' },
  ];

  assert.deepEqual(filterEquipamentosByModulo(equipamentos, 'tvs').map((item) => item.id), ['tv']);
  assert.deepEqual(filterEquipamentosByModulo(equipamentos, 'equipamentos').map((item) => item.id), ['totem', 'switch']);
  assert.deepEqual(filterEquipamentosByModulo(equipamentos, 'cameras'), []);
});

test('mantem asset tag apenas para TV Box', () => {
  assert.equal(sanitizeAssetTag({ categoria: 'tv_box', asset_tag: 'AST-001' }), 'AST-001');
  assert.equal(sanitizeAssetTag({ categoria: 'computador', asset_tag: 'AST-002' }), null);
  assert.equal(sanitizeAssetTag({ categoria: 'switch', asset_tag: 'AST-003' }), null);
});

test('mantem ID Eletromidia apenas para TVs', () => {
  assert.equal(sanitizeEletromidiaId({ categoria: 'TV', eletromidia_id: 'ELM-001' }), 'ELM-001');
  assert.equal(sanitizeEletromidiaId({ categoria: 'tv_box', eletromidia_id: 'ELM-002' }), null);
  assert.equal(sanitizeEletromidiaId({ categoria: 'computador', eletromidia_id: 'ELM-003' }), null);
});

test('consulta cameras por dados descritivos e unidade', () => {
  const camera = {
    nome: 'CAM Entrada',
    setor: 'Recepcao',
    marca: 'Intelbras',
    modelo: 'VIP 1130 B',
  };

  assert.equal(cameraMatchesSearch(camera, 'entrada', 'Boa Viagem'), true);
  assert.equal(cameraMatchesSearch(camera, 'recepcao'), true);
  assert.equal(cameraMatchesSearch(camera, 'vip 1130'), true);
  assert.equal(cameraMatchesSearch(camera, 'boa viagem', 'Boa Viagem'), true);
  assert.equal(cameraMatchesSearch(camera, '192'), false);
});

test('atualiza registros mantendo contrato de updated_at para futuro backend', () => {
  const updated = updateEntity([{ id: 'man-1', descricao: 'Antes' }], 'man-1', { descricao: 'Depois' }, '2026-09-10T10:00:00.000Z');

  assert.deepEqual(updated, [{ id: 'man-1', descricao: 'Depois', updated_at: '2026-09-10T10:00:00.000Z' }]);
});

test('remove manutencoes vinculadas quando camera e excluida', () => {
  const result = deleteCameraCascade(
    [{ id: 'cam-1' }, { id: 'cam-2' }],
    [{ id: 'man-1', equipamento_id: 'cam-1' }, { id: 'man-2', equipamento_id: 'eq-1' }],
    'cam-1',
  );

  assert.deepEqual(result.cameras, [{ id: 'cam-2' }]);
  assert.deepEqual(result.manutencoes, [{ id: 'man-2', equipamento_id: 'eq-1' }]);
});

test('filtra categorias de equipamentos para cadastro sem itens removidos do fluxo', () => {
  assert.deepEqual(getSafeEquipmentCategories(['TV', 'computador', 'totem', 'switch', 'tv_box', 'patch_panel', 'nobreak']), ['TV', 'totem', 'switch', 'nobreak']);
  assert.deepEqual(getSafeEquipmentCategories(['TV', 'switch']), ['TV', 'switch']);
});

test('parseia planilha CSV de unidades e normaliza CEP/estado', () => {
  const rows = parseUnidadesCsv('nome;cidade;rua;uf;numero;cep;bairro;cnpj\nBoa Viagem;Recife;Av Boa Viagem;pe;120;51020-000;Pina;00.000.000/0001-00');

  assert.equal(rows.length, 1);
  assert.equal(rows[0].nome, 'Boa Viagem');
  assert.equal(rows[0].estado, 'PE');
  assert.equal(rows[0].cep, '51020000');
  assert.equal(rows[0].bairro, 'Pina');
  assert.equal(rows[0].cnpj, '00.000.000/0001-00');
  assert.equal(rows[0].erro, undefined);
});

test('marca linhas invalidas da planilha antes da importacao', () => {
  const rows = parseUnidadesCsv('nome,cidade,rua,estado,numero,cep\n,Recife,Rua A,PE,1,50000-000');

  assert.equal(rows.length, 1);
  assert.equal(rows[0].erro, 'Nome da unidade e obrigatorio.');
});

test('infere Pernambuco quando a cidade importada e Recife mesmo sem UF', () => {
  const rows = parseUnidadesCsv('nome;cidade;rua;numero;cep\nSelfit Recife;Recife;Rua A;10;');

  assert.equal(rows.length, 1);
  assert.equal(rows[0].estado, 'PE');
  assert.equal(rows[0].erro, undefined);
});
