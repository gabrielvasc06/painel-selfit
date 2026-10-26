import type { ApiClient, ApiEquipmentRecord, ApiUnitRecord } from '@/services/apiTypes';
import { estadosBrasil, type Equipamento, type Unidade } from '@/utils/inventoryTypes';

// Traduz os DTOs da API para os modelos usados nas telas. Nao conhece React.
const mapUnit = (unit: ApiUnitRecord): Unidade => ({
  id: String(unit.id),
  nome: unit.nome,
  tipo_unidade: 'PROPRIA',
  regiao_id: unit.uf ?? '',
  cidade: null,
  endereco: unit.rua,
  logradouro: unit.rua,
  numero: unit.numero,
  bairro: unit.bairro,
  cep: unit.cep,
  cnpj: unit.cnpj,
  uf: unit.uf,
  created_at: unit.created_at ?? '',
  regioes: estadosBrasil.find((region) => region.sigla === unit.uf),
});

const mapEquipment = (item: ApiEquipmentRecord): Equipamento => {
  const normalizedStatus = item.status.toLocaleUpperCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const status: Equipamento['status'] = normalizedStatus === 'ATIVO' ? 'ativo' : normalizedStatus.includes('MANUTEN') ? 'manutencao' : normalizedStatus === 'INATIVO' ? 'inativo' : 'outros';
  return {
    id: String(item.id),
    unidade_id: item.unidade_id == null ? undefined : String(item.unidade_id),
    nome: item.nome_identificacao,
    numero_serie: item.numero_serie ?? null,
    numero_patrimonio: item.numero_patrimonio ?? null,
    categoria: item.categoria.toLocaleUpperCase('pt-BR') as Equipamento['categoria'],
    tipo_modulo: item.tipo_modulo,
    status,
    marca: item.marca,
    data_garantia: item.data_garantia,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
};


export function loadInventory(api: ApiClient) {
  return Promise.allSettled([
    api.apiGetList<ApiUnitRecord>('/unidades').then(rows => rows.map(mapUnit)),
    api.apiGetList<ApiEquipmentRecord>('/equipamentos/consultar').then(rows => rows.map(mapEquipment)),
  ]);
}
