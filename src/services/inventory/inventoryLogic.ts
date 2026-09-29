import type { Equipamento, ModuloTipo, Regiao, Unidade } from '@/services/inventory/inventoryTypes';

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

const blockedOwnUnitCnpjs = new Set([
  '22902694006630', // LAR CENTER
  '22902694006983', // SANTA CLARA
  '22902694007017', // ARAPANES
]);

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
  const allowed = new Set(['TV', 'CAMERAS', 'TOTEM', 'CATRACA', 'LEITOR_FACIAL', 'ACCESS_POINT', 'IMPRESSORA', 'SWITCH', 'FIREWALL', 'ROTEADOR', 'NOBREAK', 'totem', 'catraca', 'leitor_facial', 'access_point', 'impressora', 'switch', 'firewall', 'roteador', 'nobreak']);
  return categories.filter((category) => allowed.has(category));
}

export function filterEquipamentosByModulo(equipamentos: Equipamento[], modulo: ModuloTipo) {
  if (modulo === 'tvs') return equipamentos.filter((item) => item.tipo_modulo === 'TV' || item.categoria === 'TV');
  if (modulo === 'cameras') return equipamentos.filter((item) => item.tipo_modulo === 'CAMERA' || item.categoria === 'CAMERAS');
  return equipamentos.filter((item) => (item.tipo_modulo === 'EQUIPAMENTO' || (!item.tipo_modulo && item.categoria !== 'TV' && item.categoria !== 'CAMERAS')) && getSafeEquipmentCategories([item.categoria]).length > 0);
}


export function matchesUnidadeSearch(query: string, unidadeNome: string, regiaoSigla?: string | null, cidade?: string | null) {
  const typedQuery = query.trim();
  if (!typedQuery) return true;

  const values = [unidadeNome, regiaoSigla, cidade].filter(Boolean) as string[];
  return values.some((value) => normalizeSearchValue(value).includes(normalizeSearchValue(typedQuery)));
}

export function normalizeUnitName(value: string) {
  return value
    .trim()
    .toLocaleUpperCase('pt-BR')
    .replace(/(^|[\s-])III(?=$|[\s-])/g, (_match, prefix: string) => `${prefix}3`)
    .replace(/(^|[\s-])II(?=$|[\s-])/g, (_match, prefix: string) => `${prefix}2`)
    .replace(/(^|[\s-])I(?=$|[\s-])/g, (_match, prefix: string) => `${prefix}1`)
    .replace(/\s+/g, ' ')
    .trim();
}

export type UnidadeCsvPreview = {
  nome: string;
  tipo_unidade: 'PROPRIA';
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

  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line, separator);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? '']));
  });

  return parseUnidadesRows(rows);
}

export function parseUnidadesRows(rows: Array<Record<string, unknown>>): UnidadeCsvPreview[] {
  return rows.map((source) => {
    const normalizedRow = Object.fromEntries(Object.entries(source).map(([key, value]) => [normalizeKey(key), String(value ?? '').trim()]));

    const nome = normalizeUnitName(readValue(normalizedRow, ['nome', 'unidade', 'nome_da_unidade']));
    const tipo_unidade = 'PROPRIA' as const;
    const origem = readValue(normalizedRow, ['tipo_unidade', 'tipo', 'tipo_da_unidade', 'origem', 'modalidade', 'aba', '_sheet']);
    const statusPlanilha = [
      origem,
      nome,
      readValue(normalizedRow, ['data_inauguracao']),
      readValue(normalizedRow, ['mes_ano_inauguracao']),
      readValue(normalizedRow, ['status']),
    ].filter(Boolean).join(' ');
    const cidade = readValue(normalizedRow, ['cidade', 'municipio', 'localidade']);
    const enderecoCompleto = readValue(normalizedRow, ['endereco']);
    const endereco = parseEndereco(enderecoCompleto);
    const logradouro = readValue(normalizedRow, ['rua', 'logradouro', 'avenida']) || endereco.logradouro;
    const numero = readValue(normalizedRow, ['numero', 'n', 'num']) || endereco.numero;
    const cepDigits = (readValue(normalizedRow, ['cep']) || endereco.cep).replace(/\D/g, '');
    const cep = cepDigits.length < 8 ? cepDigits.padStart(8, '0') : cepDigits;
    const bairro = readValue(normalizedRow, ['bairro']) || endereco.bairro;
    const rawCnpj = readValue(normalizedRow, ['cnpj']);
    const estadoRaw = readValue(normalizedRow, ['estado', 'uf', 'sigla', 'regiao']);
    const estado = inferUf({ estado: estadoRaw, cidade, cep });
    const cnpjDigits = rawCnpj.replace(/\D/g, '');
    const cnpj = cnpjDigits.length < 14 ? cnpjDigits.padStart(14, '0') : rawCnpj;
    const erro = isFranchiseSource(origem)
      ? 'Unidades franqueadas nao entram no sistema.'
      : isOwnUnitBlocked(statusPlanilha)
        ? 'Unidade propria ainda nao ativa na planilha.'
        : blockedOwnUnitCnpjs.has(cnpjDigits)
          ? 'Unidade fora do escopo operacional.'
          : !nome
            ? 'Nome da unidade obrigatorio.'
            : cnpjDigits.length !== 14
              ? 'CNPJ deve conter 14 digitos.'
              : cep.length !== 8
                ? 'CEP deve conter 8 digitos.'
                : !estado
                  ? 'UF nao identificada.'
                  : !bairro
                    ? 'Bairro obrigatorio.'
                    : !logradouro
                      ? 'Rua obrigatoria.'
                      : !numero
                        ? 'Numero obrigatorio.'
                        : undefined;

    return {
      nome,
      tipo_unidade,
      cidade,
      logradouro,
      estado,
      numero,
      cep,
      bairro,
      cnpj,
      erro,
    };
  });
}

function isFranchiseSource(value: string) {
  const normalized = normalizeKey(value);
  return normalized.includes('franquia');
}

function isOwnUnitBlocked(value: string) {
  const normalized = normalizeKey(value);
  return ['pre_operacional', 'fechada', 'weburn', 'galpao', 'holding', 'matriz'].some((blocked) => normalized.includes(blocked));
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

function parseEndereco(value: string) {
  const raw = value.trim();
  if (!raw) return { logradouro: '', numero: '', bairro: '', cep: '' };

  const cepMatch = raw.match(/(\d{2}\.?\d{3}-?\d{3}|\d{8})/);
  const cep = cepMatch?.[1]?.replace(/\D/g, '') ?? '';
  const withoutCep = raw
    .replace(/CEP\s*:?\s*/i, '')
    .replace(cepMatch?.[0] ?? '', '')
    .replace(/\s+-\s*$/g, '')
    .trim();
  const parts = withoutCep.split(',').map((part) => part.trim()).filter(Boolean);

  if (parts.length === 0) return { logradouro: withoutCep, numero: '', bairro: '', cep };
  const logradouro = parts[0] ?? '';
  const numberPart = parts.find((part, index) => index > 0 && /(^|\s)(SN|S\/N|\d+[A-Z]?)(\s|$)/i.test(part)) ?? '';
  const numeroMatch = numberPart.match(/(SN|S\/N|\d+[A-Z]?)/i);
  const numero = numeroMatch?.[1]?.toUpperCase() ?? '';
  const numberIndex = numberPart ? parts.indexOf(numberPart) : -1;
  const bairro = numberIndex >= 0
    ? (parts.slice(numberIndex + 1).find((part) => !/LOJA|PISO|ANDAR|SALA|CEP/i.test(part)) ?? '')
    : (parts[parts.length - 1] ?? '');

  return {
    logradouro,
    numero,
    bairro,
    cep,
  };
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
