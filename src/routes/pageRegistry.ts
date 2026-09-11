import type { PageId } from '@/components/layout/Sidebar';
import type { ModuloTipo } from '@/services/inventory/inventoryTypes';

type PageMeta = {
  title: string;
  subtitle: string;
};

export const validPages: PageId[] = [
  'dashboard',
  'consultar',
  'cadastrar',
  'cadastrar_unidade',
  'cadastrar_equipamento',
  'equipamentos',
  'regiao',
  'garantias',
  'manutencoes',
];

export const pageMeta: Record<ModuloTipo, Record<PageId, PageMeta>> = {
  tvs: {
    dashboard: { title: 'Painel Principal', subtitle: 'Visao geral das TVs' },
    consultar: { title: 'Consultar Unidades', subtitle: 'Busque unidades por estado e nome' },
    cadastrar: { title: 'Cadastrar TV', subtitle: 'Adicione uma TV ao inventario' },
    cadastrar_unidade: { title: 'Cadastrar Unidade', subtitle: 'Cadastro manual ou importacao de planilha' },
    cadastrar_equipamento: { title: 'Cadastrar TV', subtitle: 'Adicione uma TV ao inventario' },
    equipamentos: { title: 'TVs', subtitle: 'Lista de TVs cadastradas' },
    regiao: { title: 'Por Regiao', subtitle: 'Estados organizados por regiao' },
    garantias: { title: 'Garantias', subtitle: 'Alertas de garantia de TVs' },
    manutencoes: { title: 'Manutencoes', subtitle: 'Historico de TVs' },
  },
  equipamentos: {
    dashboard: { title: 'Painel de Equipamentos', subtitle: 'Visao geral de equipamentos' },
    consultar: { title: 'Consultar Unidades', subtitle: 'Busque unidades por estado e nome' },
    cadastrar: { title: 'Cadastrar Equipamento', subtitle: 'Adicione ao inventario' },
    cadastrar_unidade: { title: 'Cadastrar Unidade', subtitle: 'Disponivel no modulo de TVs' },
    cadastrar_equipamento: { title: 'Cadastrar Equipamento', subtitle: 'Registre ativos de infraestrutura' },
    equipamentos: { title: 'Consultar Equipamentos', subtitle: 'Dados dos equipamentos cadastrados' },
    regiao: { title: 'Por Regiao', subtitle: 'Distribuicao por estado' },
    garantias: { title: 'Garantias', subtitle: 'Alertas de garantia de equipamentos' },
    manutencoes: { title: 'Manutencoes', subtitle: 'Historico de equipamentos' },
  },
  cameras: {
    dashboard: { title: 'Painel de Cameras', subtitle: 'Visao geral do CFTV' },
    consultar: { title: 'Consultar Unidades', subtitle: 'Busque unidades por estado e nome' },
    cadastrar: { title: 'Cadastrar Camera', subtitle: 'Registre cameras no inventario' },
    cadastrar_unidade: { title: 'Cadastrar Unidade', subtitle: 'Disponivel no modulo de TVs' },
    cadastrar_equipamento: { title: 'Cadastrar Camera', subtitle: 'Registre pontos de camera' },
    equipamentos: { title: 'Consultar Cameras', subtitle: 'Dados das cameras cadastradas' },
    regiao: { title: 'Por Regiao', subtitle: 'Distribuicao de cameras por estado' },
    garantias: { title: 'Garantias', subtitle: 'Visao de contratos e cobertura de cameras' },
    manutencoes: { title: 'Manutencoes', subtitle: 'Historico de cameras' },
  },
};

export function getModuleBadge(modulo: ModuloTipo) {
  if (modulo === 'tvs') return 'Modulo: Gestao de TVs';
  if (modulo === 'cameras') return 'Modulo: Gestao de Cameras';
  return 'Modulo: Gestao de Equipamentos';
}
