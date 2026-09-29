const API_BASE_URL = (import.meta.env.VITE_SELFIT_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const TOKEN_KEY = 'token';
export const sessionExpiredEvent = 'selfit:session-expired';
export const inventoryUpdatedEvent = 'selfit:inventory-updated';

export function notifyInventoryUpdated() {
  window.dispatchEvent(new Event(inventoryUpdatedEvent));
}

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
  uf?: string | null;
  nome_identificacao: string;
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

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isAuthRequest = path === '/auth';
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const token = isAuthRequest ? null : getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401 && !isAuthRequest) {
    clearAuthToken();
    window.dispatchEvent(new Event(sessionExpiredEvent));
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as ApiEnvelope<unknown> | null;
    throw new ApiError(payload?.mensagem ?? payload?.message ?? `Erro ${response.status} ao acessar a API.`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function authenticate(usuario: string, senha: string) {
  const result = await apiRequest<ApiEnvelope<never>>('/auth', {
    method: 'POST',
    body: JSON.stringify({ usuario: usuario.trim().toUpperCase(), senha }),
  });

  if (!result.token) throw new ApiError('A API nao retornou um token de autenticacao.', 500);
  localStorage.setItem(TOKEN_KEY, result.token);
  return result;
}

export async function apiGetList<T>(path: string): Promise<T[]> {
  const result = await apiRequest<ApiEnvelope<T[]>>(path);
  if (result.sucesso === false) {
    throw new ApiError(result.mensagem ?? result.message ?? 'A API nao conseguiu carregar os dados.', 500);
  }
  return result.dados ?? [];
}
