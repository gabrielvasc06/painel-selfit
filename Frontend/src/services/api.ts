// Arquivo: Frontend/src/services/api.ts
// Serve para: centraliza chamadas HTTP, token JWT e eventos de sessao/inventario do front.

const API_BASE_URL = (import.meta.env.VITE_SELFIT_API_URL ?? '/api').replace(/\/$/, '');
const TOKEN_KEY = 'token';
import { sessionExpiredEvent, inventoryUpdatedEvent } from '@/services/events';
import { ApiError, type ApiEnvelope, type ApiClient } from '@/services/apiTypes';

// Evento unico usado pelas telas para recarregar listas apos cadastro, edicao ou remocao.
export function notifyInventoryUpdated() {
  window.dispatchEvent(new Event(inventoryUpdatedEvent));
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

  // Todas as rotas depois do login sao protegidas por JWT no backend.
  // Quando o token expira, o app limpa a sessao e volta para o login.
  const token = isAuthRequest ? null : getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(20000),
    headers,
  });
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

// Adaptador concreto injetado somente na composicao da aplicacao.
export const httpApi: ApiClient = { apiRequest, apiGetList, authenticate, getAuthToken, clearAuthToken, notifyInventoryUpdated };
