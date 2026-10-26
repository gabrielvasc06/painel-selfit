// Contrato consumido pela interface; nao depende de fetch, storage ou React.
export type ApiEnvelope<T> = {
  sucesso?: boolean;
  mensagem?: string;
  message?: string;
  dados?: T;
  token?: string;
};

export interface ApiUnitRecord {
  id: number;
  nome: string;
  tipo_unidade?: 'PROPRIA' | null;
  cnpj: string;
  cep: string | null;
  uf: string | null;
  bairro: string | null;
  rua: string | null;
  numero: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApiEquipmentRecord {
  id: string;
  raw_id?: number;
  tipo_modulo?: 'TV' | 'CAMERA' | 'EQUIPAMENTO';
  unidade_id?: number;
  unidade_nome: string;
  unidade_cnpj?: string | null;
  unidade_cep?: string | null;
  uf?: string | null;
  nome_identificacao: string;
  numero_serie?: string | null;
  numero_patrimonio?: string | null;
  categoria: string;
  marca: string;
  status: string;
  data_garantia: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiMaintenanceRecord extends ApiEquipmentRecord {
  manutencao_id: number;
  equipamento_id: string;
  status_equipamento: string;
  descricao_manutencao: string;
  data_envio: string;
  status_manutencao: string;
  data_retorno?: string | null;
  custo?: number | string | null;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}


export interface ApiClient {
  apiRequest<T>(path: string, init?: RequestInit): Promise<T>;
  apiGetList<T>(path: string): Promise<T[]>;
  authenticate(usuario: string, senha: string): Promise<ApiEnvelope<never>>;
  getAuthToken(): string | null;
  clearAuthToken(): void;
  notifyInventoryUpdated(): void;
}
