import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ModuloTipo = 'tvs' | 'equipamentos' | 'cameras';

export interface Regiao {
  id: string;
  sigla: string;
  nome: string;
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
  cnpj: string | null;
  codigo_evo: string | null;
  uf: string | null;
  amostra: string | null;
  created_at: string;
  regioes?: Regiao;
}

export type EquipamentoStatus = 'ativo' | 'manutencao' | 'inativo' | 'outros';

export type EquipamentoCategoria =
  | 'TV'
  | 'computador'
  | 'totem'
  | 'catraca'
  | 'leitor_facial'
  | 'camera'
  | 'access_point'
  | 'impressora'
  | 'tv_box'
  | 'rack'
  | 'switch'
  | 'patch_panel'
  | 'firewall'
  | 'roteador'
  | 'nobreak';

export const TV_CATEGORY = 'TV';

export const tiCategorias: EquipamentoCategoria[] = [
  'computador',
  'totem',
  'catraca',
  'leitor_facial',
  'camera',
  'access_point',
  'impressora',
  'tv_box',
  'rack',
  'switch',
  'patch_panel',
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
    title: 'Gestao de Equipamentos de TI',
    short: 'Equipamentos',
    item: 'Equipamento',
    itemPlural: 'Equipamentos',
  },
  cameras: {
    title: 'Gestao de Câmeras',
    short: 'Câmeras',
    item: 'Câmera',
    itemPlural: 'Câmeras',
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
  categoria: string;
  unidade_id?: string;
  asset_tag?: string | null;
  status?: string;
  marca?: string | null;
  modelo?: string | null;
  posicao_rack_u?: number | null;
};

export type Camera = {
  id: string;
  nome: string;
  unidade_id: string;
  tipo: 'ip' | 'analogica' | 'dvr_nvr' | 'ptz';
  setor?: string | null;       // ex: Recepção, Catracas, Musculação, Estacionamento
  ip_address?: string | null;  // ex: 192.168.1.100
  canal_dvr?: number | null;   // ex: Canal 04
  marca?: string | null;       // ex: Intelbras, Hikvision
  modelo?: string | null;
  status: 'ativa' | 'manutencao' | 'inativa';
  created_at?: string;
  unidades?: Unidade | null;
};

export const tipoCameraLabels: Record<string, string> = {
  ip: 'Câmera IP',
  analogica: 'Analógica',
  dvr_nvr: 'DVR / NVR',
  ptz: 'Câmera PTZ',
};

export const statusCameraLabels: Record<string, string> = {
  ativa: 'Ativa',
  manutencao: 'Em Manutenção',
  inativa: 'Inativa / Offline',
};

export type TV = Equipamento;

export interface Manutencao {
  id: string;
  equipamento_id: string;
  tipo: 'troca' | 'reparo' | 'chamado_tecnico' | 'preventiva' | 'outros';
  descricao: string | null;
  responsavel: string | null;
  data_manutencao: string;
  custo: number | null;
  created_at: string;
  equipamentos?: Equipamento;
}

export interface Historico {
  id: string;
  usuario: string;
  acao: string;
  tv_codigo: string | null;
  unidade_nome: string | null;
  regiao_sigla: string | null;
  detalhe: string | null;
  data_alteracao: string;
}

// Helpers com queries rigorosamente isoladas por categoria
export const EquipamentosService = {
  // Rota /tvs: categoria == 'TV'
  async getTVs() {
    return await supabase
      .from('equipamentos')
      .select('*, unidades(*, regioes(*))')
      .eq('categoria', 'TV')
      .order('created_at', { ascending: false });
  },

  // Rota /equipamentos: categoria != 'TV'
  async getEquipamentosTI() {
    return await supabase
      .from('equipamentos')
      .select('*, unidades(*, regioes(*))')
      .neq('categoria', 'TV')
      .order('created_at', { ascending: false });
  },
};

export function isTvModule(modulo: ModuloTipo): boolean {
  return modulo === 'tvs';
}

export function statusLabel(status: string): string {
  return statusEquipLabels[status as EquipamentoStatus] ?? status;
}

export async function getCurrentUserName(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const meta = data.session?.user.user_metadata;
  return meta?.name ?? data.session?.user.email?.replace('@selfit.com.br', '') ?? 'admin';
}

export async function logHistorico(params: {
  acao: string;
  detalhe?: string;
  unidade_nome?: string | null;
  regiao_sigla?: string | null;
  tv_codigo?: string | null;
}): Promise<void> {
  const usuario = await getCurrentUserName();
  await supabase.from('historico').insert({
    usuario,
    acao: params.acao,
    detalhe: params.detalhe ?? null,
    unidade_nome: params.unidade_nome ?? null,
    regiao_sigla: params.regiao_sigla ?? null,
    tv_codigo: params.tv_codigo ?? null,
  });
}

export const categoriaLabels: Record<string, string> = {
  TV: 'Smart TV / Display',
  computador: 'Computador / Desktop',
  totem: 'Totem',
  catraca: 'Catraca',
  leitor_facial: 'Leitor Facial',
  camera: 'Câmera (CFTV)',
  access_point: 'Access Point',
  impressora: 'Impressora',
  tv_box: 'TV Box / Media Player',
  rack: 'Rack',
  switch: 'Switch',
  patch_panel: 'Patch Panel',
  firewall: 'Firewall',
  roteador: 'Roteador',
  nobreak: 'Nobreak',
};

export const statusEquipLabels: Record<EquipamentoStatus, string> = {
  ativo: 'Ativo',
  manutencao: 'Manutenção',
  inativo: 'Inativo',
  outros: 'Outros',
};
