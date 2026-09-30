// Arquivo: src/providers/InventoryProvider.tsx
// Serve para: carrega unidades e inventario da API e entrega esses dados para as telas.

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiGetList, inventoryUpdatedEvent, type ApiEquipmentRecord, type ApiUnitRecord } from '@/services/api';
import { estadosBrasil, type Equipamento, type Historico, type ModuloTipo, type Regiao, type Unidade } from '@/services/inventory/inventoryTypes';
import { filterEquipamentosByModulo } from '@/services/inventory/inventoryLogic';

interface InventoryContextType {
  regioes: Regiao[];
  unidades: Unidade[];
  equipamentos: Equipamento[];
  historicos: Historico[];
  getUnidade: (id: string) => (Unidade & { regioes?: Regiao }) | undefined;
  getUnidadesComRegiao: () => (Unidade & { regioes?: Regiao })[];
  getEquipamentosByModulo: (modulo: ModuloTipo) => Equipamento[];
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [historicos] = useState<Historico[]>([]);

  useEffect(() => {
    let active = true;

    // O front trabalha com um modelo unico de inventario, enquanto o banco separa
    // TVs, cameras e equipamentos em tabelas diferentes. Estes mapeadores mantem
    // essa traducao isolada dentro do provider.
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
      codigo_evo: null,
      uf: unit.uf,
      amostra: null,
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
        categoria: item.categoria.toLocaleUpperCase('pt-BR') as Equipamento['categoria'],
        tipo_modulo: item.tipo_modulo,
        status,
        marca: item.marca,
        data_garantia: item.data_garantia,
        created_at: item.created_at,
        updated_at: item.updated_at,
      };
    };

    const loadInventory = async () => {
      // Unidades e inventario carregam de forma independente. Assim, uma falha
      // momentanea em equipamentos nao esconde unidades em regiao/cadastro.
      const [unitResult, equipmentResult] = await Promise.allSettled([
        apiGetList<ApiUnitRecord>('/unidades'),
        apiGetList<ApiEquipmentRecord>('/equipamentos/consultar'),
      ]);
      if (!active) return;

      if (unitResult.status === 'fulfilled') {
        setUnidades(unitResult.value.map(mapUnit));
      } else {
        setUnidades([]);
        console.error('Nao foi possivel carregar unidades:', unitResult.reason);
      }

      if (equipmentResult.status === 'fulfilled') {
        setEquipamentos(equipmentResult.value.map(mapEquipment));
      } else {
        setEquipamentos([]);
        console.error('Nao foi possivel carregar inventario:', equipmentResult.reason);
      }
    };

    void loadInventory();
    window.addEventListener(inventoryUpdatedEvent, loadInventory);
    return () => {
      active = false;
      window.removeEventListener(inventoryUpdatedEvent, loadInventory);
    };
  }, []);

  const value = useMemo<InventoryContextType>(() => {
    const getUnidadesComRegiao = () => unidades
      .map((unit) => ({ ...unit, regioes: estadosBrasil.find((region) => region.sigla === unit.uf) }))
      .sort((left, right) => left.nome.localeCompare(right.nome));
    const getUnidade = (id: string) => getUnidadesComRegiao().find((unit) => unit.id === id);
    const getEquipamentosByModulo = (modulo: ModuloTipo) => filterEquipamentosByModulo(equipamentos, modulo);

    return { regioes: estadosBrasil, unidades, equipamentos, historicos, getUnidade, getUnidadesComRegiao, getEquipamentosByModulo };
  }, [unidades, equipamentos, historicos]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory deve ser usado dentro de InventoryProvider');
  return context;
}
