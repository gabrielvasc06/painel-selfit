import type { Camera, Equipamento, ModuloTipo, Regiao, Unidade } from '@/services/inventory/inventoryTypes';

const estadoNomeParaUf: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  distrito_federal: 'DF',
  espirito_santo: 'ES',
  goias: 'GO',
  maranhao: 'MA',
  mato_grosso: 'MT',
  mato_grosso_do_sul: 'MS',
  minas_gerais: 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  rio_de_janeiro: 'RJ',
  rio_grande_do_norte: 'RN',
  rio_grande_do_sul: 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  santa_catarina: 'SC',
  sao_paulo: 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

const cidadeParaUf: Record<string, string> = {
  aracaju: 'SE',
  belem: 'PA',
  belo_horizonte: 'MG',
  boa_vista: 'RR',
  brasilia: 'DF',
  campo_grande: 'MS',
  cuiaba: 'MT',
  curitiba: 'PR',
  florianopolis: 'SC',
  fortaleza: 'CE',
  goiania: 'GO',
  joao_pessoa: 'PB',
  macapa: 'AP',
  maceio: 'AL',
  manaus: 'AM',
  natal: 'RN',
  palmas: 'TO',
  porto_alegre: 'RS',
  porto_velho: 'RO',
  recife: 'PE',
  rio_branco: 'AC',
  rio_de_janeiro: 'RJ',
  salvador: 'BA',
  sao_luis: 'MA',
  sao_paulo: 'SP',
  teresina: 'PI',
  vitoria: 'ES',
};

const cepRanges: Array<[number, number, string]> = [
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

export function filterUnidades(
  unidades: (Unidade & { regioes?: Regiao })[],
  query: string,
  regiaoFilter: string,
) {
  const normalizedQuery = normalizeSearchValue(query);

  return unidades.filter((unidade) => {
    const matchesRegiao = regiaoFilter === 'all' || unidade.regioes?.sigla === regiaoFilter || unidade.uf === regiaoFilter || unidade.regiao_id === regiaoFilter;
    const matchesQuery = !normalizedQuery || normalizeSearchValue(unidade.nome).includes(normalizedQuery);

    return matchesRegiao && matchesQuery;
  });
}

export function getSafeEquipmentCategories(categories: string[] = []) {
  const allowed = new Set(['TV', 'totem', 'catraca', 'leitor_facial', 'access_point', 'impressora', 'switch', 'firewall', 'roteador', 'nobreak']);
  return categories.filter((category) => allowed.has(category));
}

export function filterEquipamentosByModulo(equipamentos: Equipamento[], modulo: ModuloTipo) {
  if (modulo === 'tvs') return equipamentos.filter((item) => item.categoria === 'TV');
  if (modulo === 'equipamentos') return equipamentos.filter((item) => item.categoria !== 'TV' && getSafeEquipmentCategories([item.categoria]).length > 0);
  return [];
}

export function buildTvName(unidadeNome: string, sequence: string) {
  const unidade = unidadeNome.trim();
  return unidade ? `${unidade} - ${sequence}` : sequence;
}

export function nextTvNumberForInventory(equipamentos: Equipamento[]) {
  const maxNumber = equipamentos
    .filter((item) => item.categoria === 'TV')
    .map((item) => readTvSequence(item.nome))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 0);

  return String(maxNumber + 1).padStart(2, '0');
}

export function cameraMatchesSearch(camera: Camera, query: string, unidadeNome = '') {
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

  return searchableValues.some((value) => {
    if (!value) return false;
    return normalizeSearchValue(value).includes(normalizedQuery);
  });
}

export function matchesUnidadeSearch(query: string, unidadeNome: string, regiaoSigla?: string | null, cidade?: string | null) {
  const typedQuery = query.trim();
  if (!typedQuery) return true;

  const values = [unidadeNome, regiaoSigla, cidade].filter(Boolean) as string[];
  return values.some((value) => normalizeSearchValue(value).includes(normalizeSearchValue(typedQuery)));
}

export type UnidadeCsvPreview = {
  nome: string;
  cidade: string;
  logradouro: string;
  estado: string;
  numero: string;
  cep: string;
  bairro: string;
  cnpj: string;
  erro?: string;
};

export function parseUnidadesCsv(text: string): UnidadeCsvPreview[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = splitCsvLine(lines[0], separator).map(normalizeKey);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, separator);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? '']));

    const nome = readValue(row, ['nome', 'unidade', 'nome_da_unidade', 'filial']);
    const cidade = readValue(row, ['cidade', 'municipio', 'localidade']);
    const logradouro = readValue(row, ['rua', 'logradouro', 'endereco', 'avenida']);
    const numero = readValue(row, ['numero', 'n', 'num']);
    const cep = readValue(row, ['cep']).replace(/\D/g, '');
    const bairro = readValue(row, ['bairro']);
    const cnpj = readValue(row, ['cnpj']);
    const estadoRaw = readValue(row, ['estado', 'uf', 'sigla', 'regiao']);
    const estado = inferUf({ estado: estadoRaw, cidade, cep });

    return {
      nome,
      cidade,
      logradouro,
      estado,
      numero,
      cep,
      bairro,
      cnpj,
      erro: !nome
        ? 'Nome da unidade e obrigatorio.'
        : !estado
          ? 'Estado nao identificado pela planilha.'
          : undefined,
    };
  });
}

function splitCsvLine(line: string, separator: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === separator && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}

function readValue(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[normalizeKey(alias)];
    if (value) return value.trim();
  }
  return '';
}

function inferUf({ estado, cidade, cep }: { estado: string; cidade: string; cep: string }) {
  const cleanedEstado = estado.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(cleanedEstado)) return cleanedEstado;

  const normalizedEstado = normalizeKey(estado);
  if (estadoNomeParaUf[normalizedEstado]) return estadoNomeParaUf[normalizedEstado];

  const normalizedCidade = normalizeKey(cidade);
  if (cidadeParaUf[normalizedCidade]) return cidadeParaUf[normalizedCidade];

  const cepNumber = Number(cep);
  if (cep.length === 8 && Number.isFinite(cepNumber)) {
    const range = cepRanges.find(([start, end]) => cepNumber >= start && cepNumber <= end);
    if (range) return range[2];
  }

  return '';
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function readTvSequence(value: string) {
  const match = value.trim().match(/(\d+)$/);
  return match ? Number(match[1]) : Number(value);
}

