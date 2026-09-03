import { useEffect, useState } from 'react';
import { Activity, Tv, Wrench, Archive, ArrowRight, Loader2, Cpu, Building2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { supabase, type Regiao, type Unidade, type Equipamento, type Historico, moduleLabels } from '@/lib/supabase';
import { useModulo } from '@/App';

interface DashboardData {
  totalItens: number;
  totalUnidades: number;
  totalRegioes: number;
  ativos: number;
  manutencao: number;
  outros: number;
  recent: Historico[];
}

export function DashboardPage({ onVerHistorico }: { onVerHistorico: () => void }) {
  const { modulo, isTvOnly } = useModulo();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const equipmentQuery = supabase.from('equipamentos').select('*, unidades(regioes(sigla))');
      const scopedQuery = isTvOnly ? equipmentQuery.eq('categoria', 'TV') : equipmentQuery.neq('categoria', 'TV');

      const [{ data: itens }, { data: unidades }, { data: regioes }, { data: historico }] = await Promise.all([
        scopedQuery,
        supabase.from('unidades').select('*'),
        supabase.from('regioes').select('*'),
        supabase.from('historico').select('*').order('data_alteracao', { ascending: false }).limit(8),
      ]);

      const itemList = (itens as Equipamento[]) ?? [];

      setData({
        totalItens: itemList.length,
        totalUnidades: (unidades as Unidade[])?.length ?? 0,
        totalRegioes: (regioes as Regiao[])?.length ?? 0,
        ativos: itemList.filter((t) => t.status === 'ativo').length,
        manutencao: itemList.filter((t) => t.status === 'manutencao').length,
        outros: itemList.filter((t) => t.status === 'outros' || t.status === 'inativo').length,
        recent: (historico as Historico[]) ?? [],
      });
      setLoading(false);
    })();
  }, [isTvOnly]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-selfit-500" /></div>;
  }

  if (!data) return null;

  const labels = moduleLabels[modulo];
  const MainIcon = isTvOnly ? Tv : Cpu;
  const overviewMetrics = [
    { label: isTvOnly ? 'Quantidade de TVs' : 'Equipamentos de TI', value: `${data.totalItens} ${labels.itemPlural}`, color: 'border-l-selfit-500', icon: MainIcon },
    { label: 'Unidades', value: `${data.totalUnidades} cadastradas`, color: 'border-l-emerald-500', icon: Building2 },
    { label: 'Regioes', value: `${data.totalRegioes} ativas`, color: 'border-l-amber-500', icon: MapPin },
  ];

  const statuses = [
    { label: isTvOnly ? 'TVs Ativas' : 'Equipamentos Ativos', count: data.ativos, percentage: data.totalItens ? `${((data.ativos / data.totalItens) * 100).toFixed(1)}%` : '0%', description: 'Operando normalmente', icon: MainIcon, cardClass: 'bg-emerald-50 border-emerald-200', textClass: 'text-emerald-700', barClass: 'bg-emerald-500' },
    { label: 'Em Manutencao', count: data.manutencao, percentage: data.totalItens ? `${((data.manutencao / data.totalItens) * 100).toFixed(1)}%` : '0%', description: 'Em reparo', icon: Wrench, cardClass: 'bg-selfit-50 border-selfit-200', textClass: 'text-selfit-700', barClass: 'bg-selfit-500' },
    { label: 'Outros', count: data.outros, percentage: data.totalItens ? `${((data.outros / data.totalItens) * 100).toFixed(1)}%` : '0%', description: 'Inativos ou em outra situacao', icon: Archive, cardClass: 'bg-amber-50 border-amber-200', textClass: 'text-amber-800', barClass: 'bg-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {overviewMetrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className={`animate-fade-in-up border-l-4 ${m.color} p-5`} style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{m.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold text-slate-900">{m.value}</p>
                </div>
                <Icon className="h-8 w-8 text-slate-200" />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_1fr]">
        <Card className="animate-fade-in-up p-6" style={{ animationDelay: '120ms' }}>
          <CardHeader className="px-0 pt-0"><CardTitle className="text-lg">Distribuicao do Inventario</CardTitle></CardHeader>
          <CardContent className="px-0">
            <div className="flex flex-col items-center gap-4">
              <DonutChart ativas={data.ativos} manutencao={data.manutencao} outros={data.outros} total={data.totalItens} label={labels.itemPlural} />
              <p className="text-center text-sm text-slate-500">Divisao percentual do inventario atual</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {statuses.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className={`animate-slide-in-right border ${s.cardClass} p-5`} style={{ animationDelay: `${i * 80 + 120}ms` }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.cardClass} ${s.textClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${s.textClass}`}>{s.label}</h3>
                      <p className="text-sm text-slate-600">{s.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <strong className={`block font-display text-2xl font-bold ${s.textClass}`}>{s.count}</strong>
                    <span className="text-sm text-slate-500">{s.percentage}</span>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/50">
                  <div className={`h-full rounded-full ${s.barClass} transition-all duration-700`} style={{ width: s.percentage }} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="animate-fade-in-up p-6" style={{ animationDelay: '200ms' }}>
        <CardHeader className="flex flex-row items-center justify-between px-0 pt-0">
          <CardTitle className="text-lg">Atividades Recentes</CardTitle>
          <button onClick={onVerHistorico} className="flex items-center gap-1 text-sm font-semibold text-selfit-600 hover:text-selfit-700">
            Ver historico <ArrowRight className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent className="px-0">
          {data.recent.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Activity className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-400">Nenhuma atividade registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {data.recent.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 shrink-0 text-selfit-500" />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-700">{a.detalhe ?? a.acao}</p>
                      <p className="text-xs text-slate-400">por {a.usuario}{a.unidade_nome ? ` - ${a.unidade_nome}` : ''}{a.regiao_sigla ? ` - ${a.regiao_sigla}` : ''}</p>
                    </div>
                  </div>
                  <time className="shrink-0 text-xs text-slate-400">
                    {new Date(a.data_alteracao).toLocaleDateString('pt-BR')} {new Date(a.data_alteracao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DonutChart({ ativas, manutencao, outros, total, label = 'Itens' }: { ativas: number; manutencao: number; outros: number; total: number; label?: string }) {
  const c = 2 * Math.PI * 50;
  const ativaPct = total ? ativas / total : 0;
  const manutPct = total ? manutencao / total : 0;
  const outrosPct = total ? outros / total : 0;

  return (
    <div className="relative h-48 w-48">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="16" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="#10b981" strokeWidth="16" strokeDasharray={`${ativaPct * c} ${c}`} strokeLinecap="round" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="#E10613" strokeWidth="16" strokeDasharray={`${manutPct * c} ${c}`} strokeDashoffset={`${-ativaPct * c}`} strokeLinecap="round" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="#f59e0b" strokeWidth="16" strokeDasharray={`${outrosPct * c} ${c}`} strokeDashoffset={`${-(ativaPct + manutPct) * c}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-extrabold text-slate-900">{total}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
    </div>
  );
}
