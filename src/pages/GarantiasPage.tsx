import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Calendar, Clock, Search, ShieldCheck, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useInventory } from '@/providers/InventoryProvider';
import { categoriaLabels, moduleLabels, type Equipamento } from '@/services/inventory/inventoryTypes';
import { useModulo } from '@/providers/ModuloProvider';

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

function normalizeSearchTerm(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function GarantiasPage({ onBack }: { onBack: () => void }) {
  const { modulo } = useModulo();
  const { regioes, getUnidade, getEquipamentosByModulo } = useInventory();
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
  const [regiaoFilter, setRegiaoFilter] = useState('all');
  const [query, setQuery] = useState('');

  const equipamentos = useMemo(() => (
    modulo === 'cameras' ? [] : getEquipamentosByModulo(modulo)
  ), [getEquipamentosByModulo, modulo]);

  const enriched = useMemo(() => equipamentos.map((item) => ({ ...item, warranty: calcWarranty(item.data_garantia) })), [equipamentos]);

  const searched = useMemo(() => {
    const term = normalizeSearchTerm(query);
    const hasActiveSearch = Boolean(term) || regiaoFilter !== 'all';
    if (!hasActiveSearch) return [];

    let result = enriched.filter((item) => item.warranty);

    if (regiaoFilter !== 'all') {
      result = result.filter((item) => {
        const unidade = item.unidade_id ? getUnidade(item.unidade_id) : undefined;
        return unidade?.regioes?.sigla === regiaoFilter || unidade?.uf === regiaoFilter;
      });
    }

    if (term) {
      result = result.filter((item) => {
        const unidade = item.unidade_id ? getUnidade(item.unidade_id) : undefined;
        return unidade?.nome ? normalizeSearchTerm(unidade.nome).includes(term) : false;
      });
    }

    return result;
  }, [enriched, getUnidade, query, regiaoFilter]);

  const filtered = useMemo(() => {
    const result = searched;

    if (filter === 'active') return result.filter((item) => item.warranty && !item.warranty.expired && item.warranty.totalDays > 90);
    if (filter === 'expiring') return result.filter((item) => item.warranty && !item.warranty.expired && item.warranty.totalDays <= 90);
    if (filter === 'expired') return result.filter((item) => item.warranty?.expired);
    return result;
  }, [filter, searched]);

  const stats = useMemo(() => ({
    total: searched.length,
    active: searched.filter((item) => item.warranty && !item.warranty.expired && item.warranty.totalDays > 90).length,
    expiring: searched.filter((item) => item.warranty && !item.warranty.expired && item.warranty.totalDays <= 90).length,
    expired: searched.filter((item) => item.warranty?.expired).length,
  }), [searched]);

  const labels = moduleLabels[modulo];
  const hasActiveSearch = query.trim().length > 0 || regiaoFilter !== 'all';
  const filterButtons = [
    { id: 'all' as const, label: 'Todas', count: stats.total, color: 'text-slate-700' },
    { id: 'active' as const, label: 'Vigentes', count: stats.active, color: 'text-emerald-600' },
    { id: 'expiring' as const, label: 'Vencendo', count: stats.expiring, color: 'text-amber-600' },
    { id: 'expired' as const, label: 'Vencidas', count: stats.expired, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-selfit-600">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><ShieldCheck className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Garantias e Alertas</h1>
          <p className="text-sm text-slate-500">Acompanhe garantias de {labels.itemPlural.toLowerCase()}</p>
        </div>
        <div className="ml-auto flex w-full max-w-xl flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar pelo nome da unidade..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-700 focus:border-selfit-500 focus:outline-none focus:ring-2 focus:ring-selfit-500/20"
            />
          </div>
          <select value={regiaoFilter} onChange={(event) => setRegiaoFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-selfit-500 focus:outline-none">
            <option value="all">Todos estados</option>
            {regioes.map((regiao) => <option key={regiao.id} value={regiao.sigla}>{regiao.sigla}</option>)}
          </select>
        </div>
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
        <CardHeader className="border-b border-slate-100"><CardTitle className="text-lg">Resultados de Garantia ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!hasActiveSearch ? (
            <p className="py-12 text-center text-sm text-slate-400">Busque pelo nome da unidade ou filtre por estado para ver garantias.</p>
          ) : filtered.length === 0 ? (
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
                    <th className="px-5 py-3 font-semibold text-slate-600">Atualizado</th>
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
      <td className="px-5 py-3 text-slate-600">{formatDateTime(item.updated_at ?? item.created_at)}</td>
    </tr>
  );
}
