/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import {
  estadosBrasil,
  type Camera,
  type Equipamento,
  type EquipamentoCategoria,
  type EquipamentoStatus,
  type Historico,
  type Manutencao,
  type ModuloTipo,
  type Regiao,
  type Unidade,
} from '@/lib/inventoryTypes';

type UnidadeInput = {
  nome: string;
  regiao_id: string;
  cidade?: string;
  cnpj?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
};

type EquipamentoInput = {
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

type CameraInput = Omit<Camera, 'id' | 'created_at' | 'unidades'>;

type ManutencaoInput = Omit<Manutencao, 'id' | 'created_at' | 'equipamentos'>;

type HistoricoInput = Omit<Historico, 'id' | 'data_alteracao'>;

interface InventoryContextType {
  regioes: Regiao[];
  unidades: Unidade[];
  equipamentos: Equipamento[];
  cameras: Camera[];
  manutencoes: Manutencao[];
  historicos: Historico[];
  getUnidade: (id: string) => (Unidade & { regioes?: Regiao }) | undefined;
  getUnidadesComRegiao: () => (Unidade & { regioes?: Regiao })[];
  getEquipamentosByModulo: (modulo: ModuloTipo) => Equipamento[];
  getCamerasComUnidade: () => Camera[];
  addUnidade: (input: UnidadeInput) => Unidade;
  addUnidades: (inputs: UnidadeInput[]) => Unidade[];
  addEquipamento: (input: EquipamentoInput, modulo: ModuloTipo) => Equipamento;
  updateEquipamento: (id: string, patch: Partial<Equipamento>) => void;
  deleteEquipamento: (id: string) => void;
  addCamera: (input: CameraInput) => Camera;
  updateCamera: (id: string, patch: Partial<Camera>) => void;
  deleteCamera: (id: string) => void;
  addManutencao: (input: ManutencaoInput) => Manutencao;
  deleteManutencao: (id: string) => void;
  addHistorico: (input: HistoricoInput) => void;
  nextTvNumber: (unidadeId: string) => string;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

const storageKeys = {
  unidades: 'selfit.inventory.unidades',
  equipamentos: 'selfit.inventory.equipamentos',
  cameras: 'selfit.inventory.cameras',
  manutencoes: 'selfit.inventory.manutencoes',
  historicos: 'selfit.inventory.historicos',
};

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function now() {
  return new Date().toISOString();
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [unidades, setUnidades] = useLocalStorageState<Unidade[]>(storageKeys.unidades, []);
  const [equipamentos, setEquipamentos] = useLocalStorageState<Equipamento[]>(storageKeys.equipamentos, []);
  const [cameras, setCameras] = useLocalStorageState<Camera[]>(storageKeys.cameras, []);
  const [manutencoes, setManutencoes] = useLocalStorageState<Manutencao[]>(storageKeys.manutencoes, []);
  const [historicos, setHistoricos] = useLocalStorageState<Historico[]>(storageKeys.historicos, []);

  const value = useMemo<InventoryContextType>(() => {
    const regioes = estadosBrasil;

    const getUnidadesComRegiao = () =>
      unidades
        .map((unidade) => ({ ...unidade, regioes: regioes.find((regiao) => regiao.id === unidade.regiao_id) }))
        .sort((a, b) => a.nome.localeCompare(b.nome));

    const getUnidade = (id: string) => getUnidadesComRegiao().find((unidade) => unidade.id === id);

    const getEquipamentosByModulo = (modulo: ModuloTipo) => {
      if (modulo === 'tvs') return equipamentos.filter((item) => item.categoria === 'TV');
      if (modulo === 'equipamentos') return equipamentos.filter((item) => item.categoria !== 'TV');
      return [];
    };

    const getCamerasComUnidade = () =>
      cameras.map((camera) => ({ ...camera, unidades: getUnidade(camera.unidade_id) ?? null }));

    const addHistorico = (input: HistoricoInput) => {
      setHistoricos((prev) => [
        {
          ...input,
          id: createId('hist'),
          data_alteracao: now(),
        },
        ...prev,
      ]);
    };

    const addUnidade = (input: UnidadeInput) => {
      const regiao = regioes.find((item) => item.id === input.regiao_id);
      const unidade: Unidade = {
        id: createId('uni'),
        nome: input.nome.trim(),
        regiao_id: input.regiao_id,
        cidade: input.cidade?.trim() || null,
        endereco: input.logradouro?.trim() || null,
        logradouro: input.logradouro?.trim() || null,
        numero: input.numero?.trim() || null,
        bairro: input.bairro?.trim() || null,
        cep: input.cep?.replace(/\D/g, '') || null,
        cnpj: input.cnpj?.trim() || null,
        codigo_evo: null,
        uf: regiao?.sigla ?? null,
        amostra: null,
        created_at: now(),
        regioes: regiao,
      };

      setUnidades((prev) => [...prev, unidade].sort((a, b) => a.nome.localeCompare(b.nome)));
      return unidade;
    };

    const addUnidades = (inputs: UnidadeInput[]) => inputs.map((input) => addUnidade(input));

    const addEquipamento = (input: EquipamentoInput, modulo: ModuloTipo) => {
      const equipamento: Equipamento = {
        id: createId('eq'),
        unidade_id: input.unidade_id,
        categoria: input.categoria,
        nome: input.nome.trim(),
        asset_tag: input.categoria === 'tv_box' ? input.asset_tag?.trim() || null : null,
        eletromidia_id: input.categoria === 'TV' ? input.eletromidia_id?.trim() || null : null,
        marca: input.marca?.trim() || null,
        modelo: input.modelo?.trim() || null,
        data_garantia: input.data_garantia || null,
        status: input.status,
        observacoes: input.observacoes?.trim() || null,
        created_at: now(),
      };

      setEquipamentos((prev) => [...prev, equipamento].sort((a, b) => a.nome.localeCompare(b.nome)));
      const unidade = getUnidade(input.unidade_id);
      addHistorico({
        modulo,
        acao: modulo === 'tvs' ? 'Nova TV cadastrada' : 'Novo equipamento cadastrado',
        detalhe: `${equipamento.nome} cadastrado em ${unidade?.nome ?? 'unidade nao informada'}`,
        tv_codigo: modulo === 'tvs' ? equipamento.nome : null,
        unidade_nome: unidade?.nome ?? null,
        regiao_sigla: unidade?.regioes?.sigla ?? unidade?.uf ?? null,
        usuario: 'admin',
      });

      return equipamento;
    };

    const updateEquipamento = (id: string, patch: Partial<Equipamento>) => {
      setEquipamentos((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch, updated_at: now() } : item)),
      );
    };

    const deleteEquipamento = (id: string) => {
      setEquipamentos((prev) => prev.filter((item) => item.id !== id));
      setManutencoes((prev) => prev.filter((item) => item.equipamento_id !== id));
    };

    const addCamera = (input: CameraInput) => {
      const camera: Camera = {
        ...input,
        id: createId('cam'),
        canal_dvr: input.canal_dvr ?? null,
        setor: input.setor?.trim() || null,
        ip_address: input.ip_address?.trim() || null,
        marca: input.marca?.trim() || null,
        modelo: input.modelo?.trim() || null,
        created_at: now(),
      };

      setCameras((prev) => [camera, ...prev]);
      const unidade = getUnidade(input.unidade_id);
      addHistorico({
        modulo: 'cameras',
        acao: 'Nova camera cadastrada',
        detalhe: `${camera.nome} cadastrada em ${unidade?.nome ?? 'unidade nao informada'}`,
        tv_codigo: null,
        unidade_nome: unidade?.nome ?? null,
        regiao_sigla: unidade?.regioes?.sigla ?? unidade?.uf ?? null,
        usuario: 'admin',
      });

      return camera;
    };

    const updateCamera = (id: string, patch: Partial<Camera>) => {
      setCameras((prev) => prev.map((camera) => (camera.id === id ? { ...camera, ...patch } : camera)));
    };

    const deleteCamera = (id: string) => {
      setCameras((prev) => prev.filter((camera) => camera.id !== id));
    };

    const addManutencao = (input: ManutencaoInput) => {
      const manutencao: Manutencao = {
        ...input,
        id: createId('man'),
        created_at: now(),
      };

      setManutencoes((prev) => [manutencao, ...prev]);
      return manutencao;
    };

    const deleteManutencao = (id: string) => {
      setManutencoes((prev) => prev.filter((item) => item.id !== id));
    };

    const nextTvNumber = (unidadeId: string) => {
      const total = equipamentos.filter((item) => item.unidade_id === unidadeId && item.categoria === 'TV').length;
      return String(total + 1).padStart(2, '0');
    };

    return {
      regioes,
      unidades,
      equipamentos,
      cameras,
      manutencoes,
      historicos,
      getUnidade,
      getUnidadesComRegiao,
      getEquipamentosByModulo,
      getCamerasComUnidade,
      addUnidade,
      addUnidades,
      addEquipamento,
      updateEquipamento,
      deleteEquipamento,
      addCamera,
      updateCamera,
      deleteCamera,
      addManutencao,
      deleteManutencao,
      addHistorico,
      nextTvNumber,
    };
  }, [
    unidades,
    equipamentos,
    cameras,
    manutencoes,
    historicos,
    setUnidades,
    setEquipamentos,
    setCameras,
    setManutencoes,
    setHistoricos,
  ]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory deve ser usado dentro de InventoryProvider');
  return context;
}
