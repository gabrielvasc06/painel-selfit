// Arquivo: src/services/inventory/inventoryTypes.ts
// Serve para: define tipos, categorias, labels e estados usados pelo inventario.

export type ModuloTipo = 'tvs' | 'equipamentos' | 'cameras';

export interface Regiao {
  id: string;
  sigla: string;
  nome: string;
  macroregiao: 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';
  created_at: string;
}

export interface Unidade {
  id: string;
  nome: string;
  tipo_unidade: 'PROPRIA';
  regiao_id: string;
  cidade: string | null;
  endereco: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cep: string | null;
  cnpj: string | null;
  codigo_evo: string | null;
  uf: string | null;
  amostra: string | null;
  created_at: string;
  regioes?: Regiao;
}

export type UnidadeInput = {
  nome: string;
  tipo_unidade: 'PROPRIA';
  regiao_id: string;
  cidade?: string;
  cnpj?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
};

export type EquipamentoStatus = 'ativo' | 'manutencao' | 'inativo' | 'outros';

export type EquipamentoCategoria =
  | 'TV'
  | 'CAMERAS'
  | 'totem'
  | 'catraca'
  | 'leitor_facial'
  | 'access_point'
  | 'impressora'
  | 'switch'
  | 'firewall'
  | 'roteador'
  | 'nobreak';

export const tiCategorias: EquipamentoCategoria[] = [
  'totem',
  'catraca',
  'leitor_facial',
  'access_point',
  'impressora',
  'switch',
  'firewall',
  'roteador',
  'nobreak',
];

export const moduleLabels: Record<ModuloTipo, {
  title: string;
  short: string;
  item: string;
  itemPlural: string;
}> = {
  tvs: {
    title: 'Gestao de TVs',
    short: 'TVs',
    item: 'TV',
    itemPlural: 'TVs',
  },
  equipamentos: {
    title: 'Gestao de Equipamentos',
    short: 'Equipamentos',
    item: 'Equipamento',
    itemPlural: 'Equipamentos',
  },
  cameras: {
    title: 'Gestao de Cameras',
    short: 'Cameras',
    item: 'Camera',
    itemPlural: 'Cameras',
  },
};

export type Equipamento = {
  id: string;
  nome: string;
  categoria: EquipamentoCategoria;
  tipo_modulo?: 'TV' | 'CAMERA' | 'EQUIPAMENTO';
  unidade_id?: string;
  status: EquipamentoStatus;
  marca?: string | null;
  data_garantia?: string | null;
  created_at?: string;
  updated_at?: string;
};

export interface Historico {
  id: string;
  usuario: string;
  acao: string;
  modulo: ModuloTipo;
  tv_codigo: string | null;
  unidade_nome: string | null;
  regiao_sigla: string | null;
  detalhe: string | null;
  data_alteracao: string;
}

export const categoriaLabels: Record<string, string> = {
  TV: 'TV',
  CAMERAS: 'Cameras',
  TOTEM: 'Totem',
  CATRACA: 'Catraca',
  LEITOR_FACIAL: 'Leitor Facial',
  ACCESS_POINT: 'Access Point',
  IMPRESSORA: 'Impressora',
  SWITCH: 'Switch',
  FIREWALL: 'Firewall',
  ROTEADOR: 'Roteador',
  NOBREAK: 'Nobreak',
  totem: 'Totem',
  catraca: 'Catraca',
  leitor_facial: 'Leitor Facial',
  access_point: 'Access Point',
  impressora: 'Impressora',
  switch: 'Switch',
  firewall: 'Firewall',
  roteador: 'Roteador',
  nobreak: 'Nobreak',
};

export const statusEquipLabels: Record<EquipamentoStatus, string> = {
  ativo: 'Ativo',
  manutencao: 'Manutencao',
  inativo: 'Inativo',
  outros: 'Outros',
};

export const estadosBrasil: Regiao[] = [
  { id: 'AC', sigla: 'AC', nome: 'Acre', macroregiao: 'Norte', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'AL', sigla: 'AL', nome: 'Alagoas', macroregiao: 'Nordeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'AP', sigla: 'AP', nome: 'Amapa', macroregiao: 'Norte', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'AM', sigla: 'AM', nome: 'Amazonas', macroregiao: 'Norte', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'BA', sigla: 'BA', nome: 'Bahia', macroregiao: 'Nordeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'CE', sigla: 'CE', nome: 'Ceara', macroregiao: 'Nordeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'DF', sigla: 'DF', nome: 'Distrito Federal', macroregiao: 'Centro-Oeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'ES', sigla: 'ES', nome: 'Espirito Santo', macroregiao: 'Sudeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'GO', sigla: 'GO', nome: 'Goias', macroregiao: 'Centro-Oeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'MA', sigla: 'MA', nome: 'Maranhao', macroregiao: 'Nordeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'MT', sigla: 'MT', nome: 'Mato Grosso', macroregiao: 'Centro-Oeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'MS', sigla: 'MS', nome: 'Mato Grosso do Sul', macroregiao: 'Centro-Oeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'MG', sigla: 'MG', nome: 'Minas Gerais', macroregiao: 'Sudeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'PA', sigla: 'PA', nome: 'Para', macroregiao: 'Norte', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'PB', sigla: 'PB', nome: 'Paraiba', macroregiao: 'Nordeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'PR', sigla: 'PR', nome: 'Parana', macroregiao: 'Sul', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'PE', sigla: 'PE', nome: 'Pernambuco', macroregiao: 'Nordeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'PI', sigla: 'PI', nome: 'Piaui', macroregiao: 'Nordeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'RJ', sigla: 'RJ', nome: 'Rio de Janeiro', macroregiao: 'Sudeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'RN', sigla: 'RN', nome: 'Rio Grande do Norte', macroregiao: 'Nordeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'RS', sigla: 'RS', nome: 'Rio Grande do Sul', macroregiao: 'Sul', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'RO', sigla: 'RO', nome: 'Rondonia', macroregiao: 'Norte', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'RR', sigla: 'RR', nome: 'Roraima', macroregiao: 'Norte', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'SC', sigla: 'SC', nome: 'Santa Catarina', macroregiao: 'Sul', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'SP', sigla: 'SP', nome: 'Sao Paulo', macroregiao: 'Sudeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'SE', sigla: 'SE', nome: 'Sergipe', macroregiao: 'Nordeste', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'TO', sigla: 'TO', nome: 'Tocantins', macroregiao: 'Norte', created_at: '2026-01-01T00:00:00.000Z' },
];

export function statusLabel(status: string): string {
  return statusEquipLabels[status as EquipamentoStatus] ?? status;
}
