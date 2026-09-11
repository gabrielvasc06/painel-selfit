import { ArrowRight, Building, Camera, Cpu, MapPin, Search, Tv, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { useInventory } from '@/providers/InventoryProvider';
import { filterUnidades } from '@/services/inventory/inventoryLogic';
import { moduleLabels } from '@/services/inventory/inventoryTypes';
import { useModulo } from '@/providers/ModuloProvider';
import { useMemo, useState } from 'react';

interface UnidadeWithCounts {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  regiao_id: string;
  regioes?: { sigla: string; nome: string };
  item_count: number;
  ativos: number;
  manutencao: number;
  outros: number;
}

export function ConsultarPage({ onOpenUnidade }: { onOpenUnidade: (id: string) => void }) {
  const { modulo } = useModulo();
  const { regioes, getUnidadesComRegiao, getEquipamentosByModulo, cameras } = useInventory();
  const [query, setQuery] = useState('');
  const [regiaoFilter, setRegiaoFilter] = useState('all');

  const unidades = getUnidadesComRegiao();
  const hasActiveFilter = regiaoFilter !== 'all' || query.trim().length > 0;
  const labels = moduleLabels[modulo];
  const Icon = modulo === 'tvs' ? Tv : modulo === 'cameras' ? Camera : Cpu;

  const filtered = useMemo<UnidadeWithCounts[]>(() => {
    if (!hasActiveFilter) return [];

    return filterUnidades(unidades, query, regiaoFilter).map((unidade) => {
      if (modulo === 'cameras') {
        const scoped = cameras.filter((camera) => camera.unidade_id === unidade.id);
        return {
          ...unidade,
          item_count: scoped.length,
          ativos: scoped.filter((camera) => camera.status === 'ativa').length,
          manutencao: scoped.filter((camera) => camera.status === 'manutencao').length,
          outros: scoped.filter((camera) => camera.status === 'inativa').length,
        };
      }

      const scoped = getEquipamentosByModulo(modulo).filter((item) => item.unidade_id === unidade.id);
      return {
        ...unidade,
        item_count: scoped.length,
        ativos: scoped.filter((item) => item.status === 'ativo').length,
        manutencao: scoped.filter((item) => item.status === 'manutencao').length,
        outros: scoped.filter((item) => item.status === 'outros' || item.status === 'inativo').length,
      };
    });
  }, [cameras, getEquipamentosByModulo, hasActiveFilter, modulo, query, regiaoFilter, unidades]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl bg-black px-6 py-5 shadow-lg animate-fade-in">
        <Search className="h-6 w-6 text-white" />
        <h1 className="font-display text-2xl font-bold text-white">Consultar Unidades</h1>
        <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
          {filtered.length} {filtered.length === 1 ? 'unidade' : 'unidades'}
        </span>
      </div>

      <Card className="animate-fade-in-up p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar pelo nome da unidade..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20"
            />
          </div>
          <div className="flex gap-3">
            <select value={regiaoFilter} onChange={(event) => setRegiaoFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-selfit-500 focus:outline-none focus:ring-2 focus:ring-selfit-500/20">
              <option value="all">Selecione um estado</option>
              {regioes.map((regiao) => <option key={regiao.id} value={regiao.sigla}>{regiao.sigla} - {regiao.nome}</option>)}
            </select>
            {hasActiveFilter && (
              <button onClick={() => { setQuery(''); setRegiaoFilter('all'); }} className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-500 hover:bg-slate-50">
                <X className="h-4 w-4" /> Limpar
              </button>
            )}
          </div>
        </div>
      </Card>

      {!hasActiveFilter ? (
        <Card className="p-12 text-center"><p className="text-slate-400">Escolha um estado ou digite o nome da unidade para consultar.</p></Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-slate-400">Nenhuma unidade encontrada.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((unidade, index) => (
            <Card key={unidade.id} className="animate-fade-in-up cursor-pointer border-black p-5 transition-all hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${index * 60}ms` }} onClick={() => onOpenUnidade(unidade.id)}>
              <CardContent className="px-0 pt-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black text-white"><Building className="h-5 w-5" /></div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-slate-900">{unidade.nome}</h3>
                      <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {unidade.cidade ?? '-'} - {unidade.uf ?? unidade.regioes?.sigla}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Icon className="h-4 w-4 text-selfit-500" /> {unidade.item_count} {labels.itemPlural}
                  </span>
                  {unidade.ativos > 0 && <span className="text-xs font-medium text-emerald-600">{unidade.ativos} em operacao</span>}
                  {unidade.manutencao > 0 && <span className="text-xs font-medium text-selfit-600">{unidade.manutencao} manut.</span>}
                  {unidade.outros > 0 && <span className="text-xs font-medium text-amber-600">{unidade.outros} outros</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
