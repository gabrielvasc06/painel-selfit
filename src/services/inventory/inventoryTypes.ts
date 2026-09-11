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
  | 'totem'
  | 'catraca'
  | 'leitor_facial'
  | 'access_point'
  | 'impressora'
  | 'switch'
  | 'firewall'
  | 'roteador'
  | 'nobreak';

export const TV_CATEGORY = 'TV';

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

export type EquipamentoPosicao = {
  id: string;
  equipamento_id: string;
  planta_id: string;
  coord_x: number;
  coord_y: number;
  created_at?: string;
  equipamentos?: Equipamento | null;
};

export type Equipamento = {
  id: string;
  nome: string;
  categoria: EquipamentoCategoria;
  unidade_id?: string;
  asset_tag?: string | null;
  eletromidia_id?: string | null;
  status: EquipamentoStatus;
  marca?: string | null;
  modelo?: string | null;
  data_garantia?: string | null;
  observacoes?: string | null;
  numero_serie?: string | null;
  posicao?: string | null;
  posicao_rack_u?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type EquipamentoInput = {
  unidade_id: string;
  categoria: EquipamentoCategoria;
  nome: string;
  asset_tag?: string;
  eletromidia_id?: string;
  marca?: string;
  modelo?: string;
  data_garantia?: string;
  status: EquipamentoStatus;
  observacoes?: string;
};

export type CameraStatus = 'ativa' | 'manutencao' | 'inativa';

export type Camera = {
  id: string;
  nome: string;
  unidade_id: string;
  tipo: 'ip' | 'analogica' | 'dvr_nvr';
  setor?: string | null;
  marca?: string | null;
  modelo?: string | null;
  status: CameraStatus;
  created_at?: string;
  updated_at?: string;
  unidades?: Unidade | null;
};

export type CameraInput = Omit<Camera, 'id' | 'created_at' | 'updated_at' | 'unidades'>;

export const tipoCameraLabels: Record<string, string> = {
  ip: 'Camera IP',
  analogica: 'Analogica',
  dvr_nvr: 'DVR / NVR',
};

export const statusCameraLabels: Record<string, string> = {
  ativa: 'Ativa',
  manutencao: 'Em manutencao',
  inativa: 'Inativa / Offline',
};

export type TV = Equipamento;

export interface Manutencao {
  id: string;
  equipamento_id: string;
  tipo: 'troca' | 'reparo' | 'outros';
  descricao: string | null;
  data_manutencao: string;
  custo: number | null;
  modulo: ModuloTipo;
  created_at: string;
  updated_at?: string;
  equipamentos?: Equipamento;
}

export type ManutencaoInput = Omit<Manutencao, 'id' | 'created_at' | 'updated_at' | 'equipamentos'>;

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

export type HistoricoInput = Omit<Historico, 'id' | 'data_alteracao'>;

export interface InventorySnapshot {
  unidades: Unidade[];
  equipamentos: Equipamento[];
  cameras: Camera[];
  manutencoes: Manutencao[];
  historicos: Historico[];
}

export const categoriaLabels: Record<string, string> = {
  TV: 'Smart TV / Display',
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
