import { useApi } from '@/hooks/useApi';
import { loadInventory as loadInventoryData } from '@/services/inventoryService';
// Arquivo: Frontend/src/contexts/InventarioContext.tsx
// Serve para: carrega unidades e inventario da API e entrega esses dados para as telas.

import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { inventoryUpdatedEvent } from '@/services/events';
import { estadosBrasil, type Equipamento, type ModuloTipo, type Regiao, type Unidade } from '@/utils/inventoryTypes';
import { filterEquipamentosByModulo } from '@/utils/inventoryLogic';

interface InventarioContextType {
  regioes: Regiao[];
  unidades: Unidade[];
  equipamentos: Equipamento[];
  loadError: string;
  getUnidade: (id: string) => (Unidade & { regioes?: Regiao }) | undefined;
  getUnidadesComRegiao: () => (Unidade & { regioes?: Regiao })[];
  getEquipamentosByModulo: (modulo: ModuloTipo) => Equipamento[];
}

export const InventarioContext = createContext<InventarioContextType | null>(null);

export function InventarioProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    let latestRequest = 0;

    const loadInventory = async () => {
      const requestId = ++latestRequest;
      setLoadError('');
      // Unidades e inventario carregam de forma independente. Assim, uma falha
      // momentanea em equipamentos nao esconde unidades em regiao/cadastro.
      const [unitResult, equipmentResult] = await loadInventoryData(api);
      // Uma resposta antiga nao pode sobrescrever a recarga mais recente.
      if (!active || requestId !== latestRequest) return;
      const unavailable = [unitResult.status === 'rejected' ? 'unidades' : '', equipmentResult.status === 'rejected' ? 'inventario' : ''].filter(Boolean);
      setLoadError(unavailable.length ? `Nao foi possivel carregar ${unavailable.join(' e ')}. Os totais podem estar incompletos.` : '');

      if (unitResult.status === 'fulfilled') {
        setUnidades(unitResult.value);
      } else {
        setUnidades([]);
        console.error('Nao foi possivel carregar unidades:', unitResult.reason);
      }

      if (equipmentResult.status === 'fulfilled') {
        setEquipamentos(equipmentResult.value);
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
  }, [api]);

  const value = useMemo<InventarioContextType>(() => {
    const getUnidadesComRegiao = () => unidades
      .map((unit) => ({ ...unit, regioes: estadosBrasil.find((region) => region.sigla === unit.uf) }))
      .sort((left, right) => left.nome.localeCompare(right.nome));
    const getUnidade = (id: string) => getUnidadesComRegiao().find((unit) => unit.id === id);
    const getEquipamentosByModulo = (modulo: ModuloTipo) => filterEquipamentosByModulo(equipamentos, modulo);

    return { regioes: estadosBrasil, unidades, equipamentos, loadError, getUnidade, getUnidadesComRegiao, getEquipamentosByModulo };
  }, [unidades, equipamentos, loadError]);

  return <InventarioContext.Provider value={value}>{children}</InventarioContext.Provider>;
}

