import assert from 'node:assert/strict';
import test from 'node:test';

function nextTvNumberForUnit(equipamentos, unidadeId) {
  const total = equipamentos.filter((item) => item.unidade_id === unidadeId && item.categoria === 'TV').length;
  return String(total + 1).padStart(2, '0');
}

function filterEquipamentosByModulo(equipamentos, modulo) {
  if (modulo === 'tvs') return equipamentos.filter((item) => item.categoria === 'TV');
  if (modulo === 'equipamentos') return equipamentos.filter((item) => item.categoria !== 'TV');
  return [];
}

function sanitizeAssetTag(input) {
  return input.categoria === 'tv_box' ? input.asset_tag || null : null;
}

function sanitizeEletromidiaId(input) {
  return input.categoria === 'TV' ? input.eletromidia_id || null : null;
}

function sanitizeCameraNetworkFields(input) {
  return {
    ip_address: input.ip_address?.trim() || null,
    canal_dvr: input.canal_dvr ? Number(input.canal_dvr) : null,
  };
}

function normalizeSearchValue(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function compactSearchValue(value) {
  return normalizeSearchValue(value).replace(/[^a-z0-9]/g, '');
}

function cameraMatchesSearch(camera, query, unidadeNome = '') {
  const typedQuery = query.trim();
  if (!typedQuery) return true;

  const normalizedQuery = normalizeSearchValue(typedQuery);
  const compactQuery = compactSearchValue(typedQuery);
  const canal = camera.canal_dvr ? String(camera.canal_dvr) : '';
  const canalPadded = camera.canal_dvr ? String(camera.canal_dvr).padStart(2, '0') : '';
  const searchableValues = [
    camera.nome,
    camera.setor,
    camera.ip_address,
    camera.marca,
    camera.modelo,
    unidadeNome,
    canal,
    canalPadded,
    canal ? `canal ${canal}` : '',
    canal ? `canal ${canalPadded}` : '',
    canal ? `dvr ${canal}` : '',
    canal ? `dvr ${canalPadded}` : '',
  ];

  return searchableValues.some((value) => (
    value ? normalizeSearchValue(value).includes(normalizedQuery) || compactSearchValue(value).includes(compactQuery) : false
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

test('gera identificacao de TV somente numerica e sequencial por unidade', () => {
  const equipamentos = [
    { id: '1', unidade_id: 'uni-1', categoria: 'TV' },
    { id: '2', unidade_id: 'uni-1', categoria: 'TV' },
    { id: '3', unidade_id: 'uni-2', categoria: 'TV' },
    { id: '4', unidade_id: 'uni-1', categoria: 'tv_box' },
  ];

  assert.equal(nextTvNumberForUnit(equipamentos, 'uni-1'), '03');
  assert.equal(nextTvNumberForUnit(equipamentos, 'uni-2'), '02');
  assert.equal(nextTvNumberForUnit(equipamentos, 'uni-3'), '01');
});

test('isola itens por modulo', () => {
  const equipamentos = [
    { id: 'tv', categoria: 'TV' },
    { id: 'note', categoria: 'computador' },
    { id: 'box', categoria: 'tv_box' },
  ];

  assert.deepEqual(filterEquipamentosByModulo(equipamentos, 'tvs').map((item) => item.id), ['tv']);
  assert.deepEqual(filterEquipamentosByModulo(equipamentos, 'equipamentos').map((item) => item.id), ['note', 'box']);
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

test('mantem IP e canal DVR opcionais no cadastro de cameras', () => {
  assert.deepEqual(sanitizeCameraNetworkFields({ ip_address: '', canal_dvr: '' }), { ip_address: null, canal_dvr: null });
  assert.deepEqual(sanitizeCameraNetworkFields({ ip_address: ' 192.168.1.100 ', canal_dvr: '4' }), { ip_address: '192.168.1.100', canal_dvr: 4 });
});

test('consulta cameras por IP parcial, canal DVR e dados descritivos', () => {
  const camera = {
    nome: 'CAM Entrada',
    setor: 'Recepcao',
    ip_address: '192.168.1.100',
    canal_dvr: 4,
    marca: 'Intelbras',
    modelo: 'VIP 1130 B',
  };

  assert.equal(cameraMatchesSearch(camera, 'entrada', 'Boa Viagem'), true);
  assert.equal(cameraMatchesSearch(camera, '1921681100'), true);
  assert.equal(cameraMatchesSearch(camera, '168.1'), true);
  assert.equal(cameraMatchesSearch(camera, '04'), true);
  assert.equal(cameraMatchesSearch(camera, 'dvr 04'), true);
  assert.equal(cameraMatchesSearch(camera, 'boa viagem', 'Boa Viagem'), true);
  assert.equal(cameraMatchesSearch({ ...camera, ip_address: null, canal_dvr: null }, '192'), false);
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
