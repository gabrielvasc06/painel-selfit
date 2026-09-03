import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, AlertTriangle, Clock, Calendar, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { supabase, type Equipamento, type Unidade, type Regiao, categoriaLabels, moduleLabels } from '@/lib/supabase';
import { useModulo } from '@/App';

interface EquipamentoWithUnidade extends Equipamento {
  unidades?: Unidade & { regioes?: Regiao };
}

interface WarrantyInfo {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  expired: boolean;
}

function calcWarranty(dataGarantia: string | null): WarrantyInfo | null {
  if (!dataGarantia) return null;
  const now = new Date();
  const warranty = new Date(dataGarantia);
  const diffMs = warranty.getTime() - now.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (totalDays < 0) return { years: 0, months: 0, days: 0, totalDays, expired: true };
  let years = warranty.getFullYear() - now.getFullYear();
  let months = warranty.getMonth() - now.getMonth();
  let days = warranty.getDate() - now.getDate();
  if (days < 0) { months--; days += new Date(warranty.getFullYear(), warranty.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days), totalDays, expired: false };
}

export function GarantiasPage() {
  const { modulo, isTvOnly } = useModulo();
  const [equipamentos, setEquipamentos] = useState<EquipamentoWithUnidade[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
  const [regiaoFilter, setRegiaoFilter] = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const baseQuery = supabase.from('equipamentos').select('*, unidades(*, regioes(*))').order('data_garantia', { ascending: true, nullsFirst: false });
      const [{ data }, { data: regs }] = await Promise.all([
        isTvOnly ? baseQuery.eq('categoria', 'TV') : baseQuery.neq('categoria', 'TV'),
        supabase.from('regioes').select('*').order('sigla'),
      ]);
      setEquipamentos((data as EquipamentoWithUnidade[]) ?? []);
      setRegioes((regs as Regiao[]) ?? []);
      setLoading(false);
    })();
  }, [isTvOnly]);

  const enriched = useMemo(() => equipamentos.map((e) => ({ ...e, warranty: calcWarranty(e.data_garantia) })), [equipamentos]);

  const filtered = useMemo(() => {
    let result = enriched.filter((e) => e.warranty);
    if (regiaoFilter !== 'all') result = result.filter((e) => e.unidades?.regioes?.sigla === regiaoFilter || e.unidades?.uf === regiaoFilter);
    if (filter === 'active') return result.filter((e) => e.warranty && !e.warranty.expired && e.warranty.totalDays > 90);
    if (filter === 'expiring') return result.filter((e) => e.warranty && !e.warranty.expired && e.warranty.totalDays <= 90);
    if (filter === 'expired') return result.filter((e) => e.warranty?.expired);
    return result;
  }, [enriched, filter, regiaoFilter]);

  const stats = useMemo(() => ({
    total: enriched.filter((e) => e.warranty).length,
    active: enriched.filter((e) => e.warranty && !e.warranty.expired && e.warranty.totalDays > 90).length,
    expiring: enriched.filter((e) => e.warranty && !e.warranty.expired && e.warranty.totalDays <= 90).length,
    expired: enriched.filter((e) => e.warranty?.expired).length,
  }), [enriched]);

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-selfit-500" /></div>;

  const labels = moduleLabels[modulo];
  const filterButtons = [
    { id: 'all' as const, label: 'Todas', count: stats.total, color: 'text-slate-700' },
    { id: 'active' as const, label: 'Vigentes', count: stats.active, color: 'text-emerald-600' },
    { id: 'expiring' as const, label: 'Vencendo', count: stats.expiring, color: 'text-amber-600' },
    { id: 'expired' as const, label: 'Vencidas', count: stats.expired, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><ShieldCheck className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Garantias e Alertas</h1>
          <p className="text-sm text-slate-500">Acompanhe garantias de {labels.itemPlural.toLowerCase()}</p>
        </div>
        <select value={regiaoFilter} onChange={(e) => setRegiaoFilter(e.target.value)} className="ml-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-selfit-500 focus:outline-none">
          <option value="all">Todas regioes</option>
          {regioes.map((r) => <option key={r.id} value={r.sigla}>{r.sigla}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {filterButtons.map((f, i) => (
          <Card key={f.id} className={`animate-fade-in-up cursor-pointer p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${filter === f.id ? 'ring-2 ring-selfit-500' : ''}`} style={{ animationDelay: `${i * 60}ms` }} onClick={() => setFilter(f.id)}>
            <p className="text-sm font-medium text-slate-500">{f.label}</p>
            <p className={`mt-1 font-display text-3xl font-bold ${f.color}`}>{f.count}</p>
          </Card>
        ))}
      </div>

      <Card className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <CardHeader className="border-b border-slate-100"><CardTitle className="text-lg">{labels.itemPlural} com Garantia ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Nenhum item com data de garantia cadastrada.</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 font-semibold text-slate-600">Item</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Categoria</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Unidade</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Regiao</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Vencimento</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Tempo Restante</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((e) => {
                    const w = e.warranty!;
                    return (
                      <tr key={e.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-5 py-3 font-semibold text-slate-900">{e.nome}</td>
                        <td className="px-5 py-3 text-slate-600">{categoriaLabels[e.categoria]}</td>
                        <td className="px-5 py-3 text-slate-600">{e.unidades?.nome ?? '-'}</td>
                        <td className="px-5 py-3 text-slate-600">{e.unidades?.regioes?.sigla ?? e.unidades?.uf ?? '-'}</td>
                        <td className="px-5 py-3 text-slate-600">{e.data_garantia ? new Date(e.data_garantia).toLocaleDateString('pt-BR') : '-'}</td>
                        <td className="px-5 py-3">
                          {w.expired ? (
                            <span className="flex items-center gap-1 font-semibold text-red-600"><XCircle className="h-4 w-4" /> Vencida</span>
                          ) : (
                            <div className="flex items-center gap-2 text-xs font-medium">
                              {w.years > 0 && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">{w.years}a</span>}
                              {w.months > 0 && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">{w.months}m</span>}
                              <span className={`rounded-md px-2 py-0.5 ${w.totalDays <= 30 ? 'bg-red-100 text-red-700' : w.totalDays <= 90 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{w.days}d</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {w.expired ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"><AlertTriangle className="h-3 w-3" /> Vencida</span>
                          ) : w.totalDays <= 30 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"><AlertTriangle className="h-3 w-3" /> Critico</span>
                          ) : w.totalDays <= 90 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"><Clock className="h-3 w-3" /> Atencao</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Calendar className="h-3 w-3" /> Vigente</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
