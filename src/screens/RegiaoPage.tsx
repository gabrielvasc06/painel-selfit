import { useEffect, useRef, useState } from 'react';
import { MapPin, Tv, Building, ArrowRight, ChevronLeft, ChevronRight, Loader2, Cpu } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { supabase, type Regiao, type Unidade, type Equipamento, moduleLabels } from '@/lib/supabase';
import { useModulo } from '@/App';

interface RegiaoData extends Regiao {
  itens: number;
  unidades_count: number;
  ativos: number;
  manutencao: number;
  outros: number;
}

const gradients = [
  'from-selfit-500 to-selfit-700',
  'from-emerald-500 to-emerald-700',
  'from-amber-500 to-amber-700',
  'from-sky-500 to-sky-700',
];

export function RegiaoPage({ onOpenRegiao }: { onOpenRegiao: (id: string) => void }) {
  const { modulo, isTvOnly } = useModulo();
  const [regioes, setRegioes] = useState<RegiaoData[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const equipmentQuery = supabase.from('equipamentos').select('*, unidades(regiao_id, regioes(id))');
      const [{ data: regs }, { data: unids }, { data: itens }] = await Promise.all([
        supabase.from('regioes').select('*').order('sigla'),
        supabase.from('unidades').select('*, regioes(*)'),
        isTvOnly ? equipmentQuery.eq('categoria', 'TV') : equipmentQuery.neq('categoria', 'TV'),
      ]);

      const regioesData = (regs as Regiao[]) ?? [];
      const unidsList = (unids as (Unidade & { regioes?: Regiao })[]) ?? [];
      const itemList = (itens as (Equipamento & { unidades?: { regiao_id?: string; regioes?: { id: string } } })[]) ?? [];

      const enriched: RegiaoData[] = regioesData.map((r) => {
        const rItens = itemList.filter((t) => t.unidades?.regioes?.id === r.id || t.unidades?.regiao_id === r.id);
        return {
          ...r,
          itens: rItens.length,
          unidades_count: unidsList.filter((u) => u.regiao_id === r.id).length,
          ativos: rItens.filter((t) => t.status === 'ativo').length,
          manutencao: rItens.filter((t) => t.status === 'manutencao').length,
          outros: rItens.filter((t) => t.status === 'outros' || t.status === 'inativo').length,
        };
      });

      setRegioes(enriched);
      setLoading(false);
    })();
  }, [isTvOnly]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-selfit-500" /></div>;

  const labels = moduleLabels[modulo];
  const MainIcon = isTvOnly ? Tv : Cpu;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl bg-black px-6 py-5 shadow-lg animate-fade-in">
        <MapPin className="h-6 w-6 text-white" />
        <h1 className="font-display text-2xl font-bold text-white">Por Regiao</h1>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-600">Arraste ou use as setas para navegar entre as regioes</p>
          <div className="flex gap-2">
            <button onClick={() => scroll('left')} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50" aria-label="Anterior"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={() => scroll('right')} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50" aria-label="Proxima"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>

        <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin snap-x">
          {regioes.map((r, i) => (
            <Card key={r.id} className="group w-72 shrink-0 snap-center animate-fade-in-up overflow-hidden ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${i * 80}ms` }}>
              <div className={`relative overflow-hidden bg-gradient-to-br ${gradients[i % gradients.length]} p-5 text-white`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-3xl font-extrabold leading-none">{r.sigla}</p>
                    <p className="mt-1 text-sm font-medium text-white/80">{r.nome}</p>
                  </div>
                  <MapPin className="h-6 w-6 text-white/60" />
                </div>
              </div>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-slate-500"><MainIcon className="h-4 w-4" /> {labels.itemPlural}</span>
                  <span className="font-display text-2xl font-bold text-slate-900">{r.itens}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-slate-500"><Building className="h-4 w-4" /> Unidades</span>
                  <span className="font-semibold text-slate-700">{r.unidades_count}</span>
                </div>
                <div className="h-px bg-slate-100" />
                <MiniBar label="Ativos" value={r.ativos} max={r.itens} color="bg-emerald-500" />
                <MiniBar label="Manutencao" value={r.manutencao} max={r.itens} color="bg-selfit-500" />
                <MiniBar label="Outros" value={r.outros} max={r.itens} color="bg-amber-500" />
                <button onClick={() => onOpenRegiao(r.id)} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-selfit-50 hover:text-selfit-700">
                  Ver detalhes <ArrowRight className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-xs text-slate-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
      <span className="w-6 text-right text-xs font-bold text-slate-600">{value}</span>
    </div>
  );
}
