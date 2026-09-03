import { useEffect, useState } from 'react';
import { Search, MapPin, Building, Tv, ArrowRight, X, Loader2, Cpu } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { supabase, type Regiao, type Unidade, moduleLabels } from '@/lib/supabase';
import { useModulo } from '@/App';

interface UnidadeWithCounts extends Unidade {
  regioes?: Regiao;
  item_count: number;
  ativos: number;
  manutencao: number;
  outros: number;
}

export function ConsultarPage({ onOpenUnidade }: { onOpenUnidade: (id: string) => void }) {
  const { modulo, isTvOnly } = useModulo();
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [unidades, setUnidades] = useState<UnidadeWithCounts[]>([]);
  const [filtered, setFiltered] = useState<UnidadeWithCounts[]>([]);
  const [query, setQuery] = useState('');
  const [regiaoFilter, setRegiaoFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: regs }, { data: unids }] = await Promise.all([
        supabase.from('regioes').select('*').order('sigla'),
        supabase.from('unidades').select('*, regioes(*)').order('nome'),
      ]);

      const regioesData = (regs as Regiao[]) ?? [];
      const unidsData = (unids as (Unidade & { regioes?: Regiao })[]) ?? [];
      const equipmentQuery = supabase.from('equipamentos').select('unidade_id, status, categoria');
      const { data: equipamentos } = isTvOnly ? await equipmentQuery.eq('categoria', 'TV') : await equipmentQuery.neq('categoria', 'TV');
      const itemList = (equipamentos as { unidade_id: string; status: string }[]) ?? [];

      const counts: Record<string, { item_count: number; ativos: number; manutencao: number; outros: number }> = {};
      itemList.forEach((t) => {
        if (!counts[t.unidade_id]) counts[t.unidade_id] = { item_count: 0, ativos: 0, manutencao: 0, outros: 0 };
        counts[t.unidade_id].item_count++;
        if (t.status === 'ativo') counts[t.unidade_id].ativos++;
        if (t.status === 'manutencao') counts[t.unidade_id].manutencao++;
        if (t.status === 'outros' || t.status === 'inativo') counts[t.unidade_id].outros++;
      });

      const enriched: UnidadeWithCounts[] = unidsData.map((u) => ({
        ...u,
        item_count: counts[u.id]?.item_count ?? 0,
        ativos: counts[u.id]?.ativos ?? 0,
        manutencao: counts[u.id]?.manutencao ?? 0,
        outros: counts[u.id]?.outros ?? 0,
      }));

      setRegioes(regioesData);
      setUnidades(enriched);
      setFiltered(enriched);
      setLoading(false);
    })();
  }, [isTvOnly]);

  useEffect(() => {
    let result = unidades;
    if (regiaoFilter !== 'all') result = result.filter((u) => u.regioes?.sigla === regiaoFilter || u.uf === regiaoFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (u) => u.nome.toLowerCase().includes(q) || u.cidade?.toLowerCase().includes(q) || u.regioes?.sigla.toLowerCase().includes(q) || u.regioes?.nome.toLowerCase().includes(q),
      );
    }
    setFiltered(result);
  }, [query, regiaoFilter, unidades]);

  const labels = moduleLabels[modulo];
  const Icon = isTvOnly ? Tv : Cpu;

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
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome da unidade, cidade ou regiao..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20"
            />
          </div>
          <div className="flex gap-3">
            <select value={regiaoFilter} onChange={(e) => setRegiaoFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-selfit-500 focus:outline-none focus:ring-2 focus:ring-selfit-500/20">
              <option value="all">Todas as regioes</option>
              {regioes.map((r) => <option key={r.id} value={r.sigla}>{r.sigla} - {r.nome}</option>)}
            </select>
            {(query || regiaoFilter !== 'all') && (
              <button onClick={() => { setQuery(''); setRegiaoFilter('all'); }} className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-500 hover:bg-slate-50">
                <X className="h-4 w-4" /> Limpar
              </button>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-selfit-500" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-slate-400">Nenhuma unidade encontrada.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((u, i) => (
            <Card key={u.id} className="animate-fade-in-up cursor-pointer border-black p-5 transition-all hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${i * 60}ms` }} onClick={() => onOpenUnidade(u.id)}>
              <CardContent className="px-0 pt-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black text-white"><Building className="h-5 w-5" /></div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-slate-900">{u.nome}</h3>
                      <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {u.cidade ?? '-'} - {u.uf ?? u.regioes?.sigla}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Icon className="h-4 w-4 text-selfit-500" /> {u.item_count} {labels.itemPlural}
                  </span>
                  {u.ativos > 0 && <span className="text-xs font-medium text-emerald-600">{u.ativos} ativos</span>}
                  {u.manutencao > 0 && <span className="text-xs font-medium text-selfit-600">{u.manutencao} manut.</span>}
                  {u.outros > 0 && <span className="text-xs font-medium text-amber-600">{u.outros} outros</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
