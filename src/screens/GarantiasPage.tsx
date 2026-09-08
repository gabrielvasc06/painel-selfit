import { useMemo, useState } from 'react';
import { AlertTriangle, Calendar, Clock, ShieldCheck, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useInventory } from '@/contexts/InventoryContext';
import { categoriaLabels, moduleLabels, type Equipamento } from '@/lib/inventoryTypes';
import { useModulo } from '@/App';

interface WarrantyInfo {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  expired: boolean;
}

function calcWarranty(dataGarantia: string | null | undefined): WarrantyInfo | null {
  if (!dataGarantia) return null;
  const nowDate = new Date();
  const warranty = new Date(dataGarantia);
  const diffMs = warranty.getTime() - nowDate.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (totalDays < 0) return { years: 0, months: 0, days: 0, totalDays, expired: true };

  let years = warranty.getFullYear() - nowDate.getFullYear();
  let months = warranty.getMonth() - nowDate.getMonth();
  let days = warranty.getDate() - nowDate.getDate();
  if (days < 0) {
    months--;
    days += new Date(warranty.getFullYear(), warranty.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days), totalDays, expired: false };
}

export function GarantiasPage() {
  const { modulo } = useModulo();
  const { regioes, getUnidade, getEquipamentosByModulo } = useInventory();
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
  const [regiaoFilter, setRegiaoFilter] = useState('all');

  const equipamentos = useMemo(() => (
    modulo === 'cameras' ? [] : getEquipamentosByModulo(modulo)
  ), [getEquipamentosByModulo, modulo]);

  const enriched = useMemo(() => equipamentos.map((item) => ({ ...item, warranty: calcWarranty(item.data_garantia) })), [equipamentos]);

  const filtered = useMemo(() => {
    let result = enriched.filter((item) => item.warranty);
    if (regiaoFilter !== 'all') {
      result = result.filter((item) => {
        const unidade = item.unidade_id ? getUnidade(item.unidade_id) : undefined;
        return unidade?.regioes?.sigla === regiaoFilter || unidade?.uf === regiaoFilter;
      });
    }
    if (filter === 'active') return result.filter((item) => item.warranty && !item.warranty.expired && item.warranty.totalDays > 90);
    if (filter === 'expiring') return result.filter((item) => item.warranty && !item.warranty.expired && item.warranty.totalDays <= 90);
    if (filter === 'expired') return result.filter((item) => item.warranty?.expired);
    return result;
  }, [enriched, filter, getUnidade, regiaoFilter]);

  const stats = useMemo(() => ({
    total: enriched.filter((item) => item.warranty).length,
    active: enriched.filter((item) => item.warranty && !item.warranty.expired && item.warranty.totalDays > 90).length,
    expiring: enriched.filter((item) => item.warranty && !item.warranty.expired && item.warranty.totalDays <= 90).length,
    expired: enriched.filter((item) => item.warranty?.expired).length,
  }), [enriched]);

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
        <select value={regiaoFilter} onChange={(event) => setRegiaoFilter(event.target.value)} className="ml-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-selfit-500 focus:outline-none">
          <option value="all">Todas regioes</option>
          {regioes.map((regiao) => <option key={regiao.id} value={regiao.sigla}>{regiao.sigla}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {filterButtons.map((button, index) => (
          <Card key={button.id} className={`animate-fade-in-up cursor-pointer p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${filter === button.id ? 'ring-2 ring-selfit-500' : ''}`} style={{ animationDelay: `${index * 60}ms` }} onClick={() => setFilter(button.id)}>
            <p className="text-sm font-medium text-slate-500">{button.label}</p>
            <p className={`mt-1 font-display text-3xl font-bold ${button.color}`}>{button.count}</p>
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
                    <th className="px-5 py-3 font-semibold text-slate-600">Estado</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Vencimento</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Tempo Restante</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => <WarrantyRow key={item.id} item={item} unidade={item.unidade_id ? getUnidade(item.unidade_id) : undefined} />)}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WarrantyRow({ item, unidade }: { item: Equipamento & { warranty: WarrantyInfo | null }; unidade?: ReturnType<ReturnType<typeof useInventory>['getUnidade']> }) {
  const warranty = item.warranty!;
  return (
    <tr className="transition-colors hover:bg-slate-50">
      <td className="px-5 py-3 font-semibold text-slate-900">{item.nome}</td>
      <td className="px-5 py-3 text-slate-600">{categoriaLabels[item.categoria]}</td>
      <td className="px-5 py-3 text-slate-600">{unidade?.nome ?? '-'}</td>
      <td className="px-5 py-3 text-slate-600">{unidade?.regioes?.sigla ?? unidade?.uf ?? '-'}</td>
      <td className="px-5 py-3 text-slate-600">{item.data_garantia ? new Date(item.data_garantia).toLocaleDateString('pt-BR') : '-'}</td>
      <td className="px-5 py-3">
        {warranty.expired ? (
          <span className="flex items-center gap-1 font-semibold text-red-600"><XCircle className="h-4 w-4" /> Vencida</span>
        ) : (
          <div className="flex items-center gap-2 text-xs font-medium">
            {warranty.years > 0 && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">{warranty.years}a</span>}
            {warranty.months > 0 && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">{warranty.months}m</span>}
            <span className={`rounded-md px-2 py-0.5 ${warranty.totalDays <= 30 ? 'bg-red-100 text-red-700' : warranty.totalDays <= 90 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{warranty.days}d</span>
          </div>
        )}
      </td>
      <td className="px-5 py-3">
        {warranty.expired ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"><AlertTriangle className="h-3 w-3" /> Vencida</span>
        ) : warranty.totalDays <= 30 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"><AlertTriangle className="h-3 w-3" /> Critico</span>
        ) : warranty.totalDays <= 90 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"><Clock className="h-3 w-3" /> Atencao</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Calendar className="h-3 w-3" /> Vigente</span>
        )}
      </td>
    </tr>
  );
}
