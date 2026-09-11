import type {
  Camera,
  CameraInput,
  Equipamento,
  EquipamentoInput,
  Historico,
  HistoricoInput,
  InventorySnapshot,
  Manutencao,
  ManutencaoInput,
  ModuloTipo,
  Unidade,
  UnidadeInput,
} from '@/services/inventory/inventoryTypes';

export const inventoryStorageKeys = {
  unidades: 'selfit.inventory.unidades',
  equipamentos: 'selfit.inventory.equipamentos',
  cameras: 'selfit.inventory.cameras',
  manutencoes: 'selfit.inventory.manutencoes',
  historicos: 'selfit.inventory.historicos',
} as const;

export const emptyInventorySnapshot: InventorySnapshot = {
  unidades: [],
  equipamentos: [],
  cameras: [],
  manutencoes: [],
  historicos: [],
};

export interface InventoryGateway {
  loadSnapshot: () => Promise<InventorySnapshot>;
  createUnidade: (input: UnidadeInput) => Promise<Unidade>;
  createUnidades: (inputs: UnidadeInput[]) => Promise<Unidade[]>;
  createEquipamento: (input: EquipamentoInput, modulo: ModuloTipo) => Promise<Equipamento>;
  updateEquipamento: (id: string, patch: Partial<Equipamento>) => Promise<Equipamento>;
  deleteEquipamento: (id: string) => Promise<void>;
  createCamera: (input: CameraInput) => Promise<Camera>;
  updateCamera: (id: string, patch: Partial<Camera>) => Promise<Camera>;
  deleteCamera: (id: string) => Promise<void>;
  createManutencao: (input: ManutencaoInput) => Promise<Manutencao>;
  updateManutencao: (id: string, patch: Partial<Manutencao>) => Promise<Manutencao>;
  deleteManutencao: (id: string) => Promise<void>;
  createHistorico: (input: HistoricoInput) => Promise<Historico>;
}

export function getInventoryApiBaseUrl() {
  return (import.meta.env.VITE_SELFIT_API_URL ?? '').replace(/\/$/, '');
}

export function isRemoteInventoryConfigured() {
  return getInventoryApiBaseUrl().length > 0;
}

async function requestJson<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Erro ${response.status} ao acessar ${path}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function toBody(value: unknown) {
  return JSON.stringify(value);
}

export function createFetchInventoryGateway(baseUrl = getInventoryApiBaseUrl()): InventoryGateway {
  if (!baseUrl) {
    throw new Error('VITE_SELFIT_API_URL nao configurada.');
  }

  return {
    loadSnapshot: () => requestJson<InventorySnapshot>(baseUrl, '/inventory'),
    createUnidade: (input) => requestJson<Unidade>(baseUrl, '/unidades', { method: 'POST', body: toBody(input) }),
    createUnidades: (inputs) => requestJson<Unidade[]>(baseUrl, '/unidades/bulk', { method: 'POST', body: toBody(inputs) }),
    createEquipamento: (input, modulo) => requestJson<Equipamento>(baseUrl, '/equipamentos', { method: 'POST', body: toBody({ ...input, modulo }) }),
    updateEquipamento: (id, patch) => requestJson<Equipamento>(baseUrl, `/equipamentos/${encodeURIComponent(id)}`, { method: 'PATCH', body: toBody(patch) }),
    deleteEquipamento: (id) => requestJson<void>(baseUrl, `/equipamentos/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    createCamera: (input) => requestJson<Camera>(baseUrl, '/cameras', { method: 'POST', body: toBody(input) }),
    updateCamera: (id, patch) => requestJson<Camera>(baseUrl, `/cameras/${encodeURIComponent(id)}`, { method: 'PATCH', body: toBody(patch) }),
    deleteCamera: (id) => requestJson<void>(baseUrl, `/cameras/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    createManutencao: (input) => requestJson<Manutencao>(baseUrl, '/manutencoes', { method: 'POST', body: toBody(input) }),
    updateManutencao: (id, patch) => requestJson<Manutencao>(baseUrl, `/manutencoes/${encodeURIComponent(id)}`, { method: 'PATCH', body: toBody(patch) }),
    deleteManutencao: (id) => requestJson<void>(baseUrl, `/manutencoes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    createHistorico: (input) => requestJson<Historico>(baseUrl, '/historicos', { method: 'POST', body: toBody(input) }),
  };
}
