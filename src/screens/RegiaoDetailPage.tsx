import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Tv, Building, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { supabase, type Regiao, type Unidade, type TV } from '@/lib/supabase';
import { DonutChart } from '@/screens/DashboardPage';

interface UnidadeWithTvs extends Unidade {
  tvs: TV[];
}

export function RegiaoDetailPage({ regiaoId, onBack }: { regiaoId: string; onBack: () => void }) {
  const [regiao, setRegiao] = useState<Regiao | null>(null);
  const [unidades, setUnidades] = useState<UnidadeWithTvs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: reg } = await supabase.from('regioes').select('*').eq('id', regiaoId).maybeSingle();
      setRegiao(reg as Regiao | null);

      const { data: unids } = await supabase.from('unidades').select('*').eq('regiao_id', regiaoId).order('nome');
      const unidsList = (unids as Unidade[]) ?? [];

      const { data: tvs } = await supabase.from('tvs').select('*').in('unidade_id', unidsList.map((u) => u.id));
      const tvList = (tvs as TV[]) ?? [];

      const enriched: UnidadeWithTvs[] = unidsList.map((u) => ({
        ...u,
        tvs: tvList.filter((t) => t.unidade_id === u.id),
      }));

      setUnidades(enriched);
      setLoading(false);
    })();
  }, [regiaoId]);

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-selfit-500" /></div>;
  }

  if (!regiao) {
    return <Card className="p-12 text-center"><p className="text-slate-400">Região não encontrada.</p></Card>;
  }

  const allTvs = unidades.flatMap((u) => u.tvs);
  const totalTvs = allTvs.length;
  const ativas = allTvs.filter((t) => t.status === 'ativa').length;
  const manutencao = allTvs.filter((t) => t.status === 'manutencao').length;
  const reserva = allTvs.filter((t) => t.status === 'outros').length;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-selfit-600">
        <ArrowLeft className="h-4 w-4" /> Voltar às regiões
      </button>

      {/* Region header */}
      <div className="flex flex-col gap-4 rounded-2xl bg-black p-6 shadow-lg animate-fade-in sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-selfit-500 to-selfit-700 text-white">
            <MapPin className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-white">{regiao.sigla}</h1>
            <p className="text-sm text-white/60">{regiao.nome}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
            <Tv className="h-5 w-5 text-white" />
            <span className="font-display text-2xl font-bold text-white">{totalTvs}</span>
            <span className="text-sm text-white/70">TVs</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
            <Building className="h-5 w-5 text-white" />
            <span className="font-display text-2xl font-bold text-white">{unidades.length}</span>
            <span className="text-sm text-white/70">Unidades</span>
          </div>
        </div>
      </div>

      {/* Region-level pizza - full width */}
      <Card className="animate-fade-in-up p-6">
        <CardHeader className="px-0 pt-0"><CardTitle className="text-lg">Distribuição Geral</CardTitle></CardHeader>
        <CardContent className="px-0">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
            <DonutChart ativas={ativas} manutencao={manutencao} outros={reserva} total={totalTvs} />
            <div className="w-full max-w-xs space-y-2">
              <LegendRow label="Ativas" value={ativas} total={totalTvs} color="bg-emerald-500" />
              <LegendRow label="Manutenção" value={manutencao} total={totalTvs} color="bg-selfit-500" />
              <LegendRow label="Outros" value={reserva} total={totalTvs} color="bg-amber-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-unit pizzas */}
      <div>
        <h2 className="mb-4 font-display text-xl font-bold text-slate-900">Dashboard por Unidade</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {unidades.map((u, i) => {
            const uAtivas = u.tvs.filter((t) => t.status === 'ativa').length;
            const uManut = u.tvs.filter((t) => t.status === 'manutencao').length;
            const uReserva = u.tvs.filter((t) => t.status === 'outros').length;
            return (
              <Card key={u.id} className="animate-fade-in-up p-6" style={{ animationDelay: `${i * 80}ms` }}>
                <CardHeader className="flex flex-row items-center justify-between px-0 pt-0">
                  <CardTitle className="text-base">{u.nome}</CardTitle>
                  <span className="rounded-lg bg-selfit-50 px-2 py-0.5 text-xs font-bold text-selfit-700">{u.tvs.length} TVs</span>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="flex flex-col items-center gap-3">
                    <DonutChart ativas={uAtivas} manutencao={uManut} outros={uReserva} total={u.tvs.length} />
                    <div className="w-full space-y-1.5">
                      <LegendRow label="Ativas" value={uAtivas} total={u.tvs.length} color="bg-emerald-500" />
                      <LegendRow label="Manutenção" value={uManut} total={u.tvs.length} color="bg-selfit-500" />
                      <LegendRow label="Outros" value={uReserva} total={u.tvs.length} color="bg-amber-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LegendRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="flex-1 text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-700">{value} ({total ? ((value / total) * 100).toFixed(0) : 0}%)</span>
    </div>
  );
}
