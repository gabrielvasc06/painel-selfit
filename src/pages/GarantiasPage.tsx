import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Calendar, Clock, Loader2, Search, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { apiGetList, type ApiEquipmentRecord, type ApiUnitRecord } from '@/services/api';
import { moduleLabels, type ModuloTipo } from '@/services/inventory/inventoryTypes';
import { useModulo } from '@/providers/ModuloProvider';
import { formatDateBr } from '@/utils/date';

const moduleApiType: Record<ModuloTipo, string> = {
  tvs: 'TV',
  equipamentos: 'EQUIPAMENTO',
  cameras: 'CAMERA',
};

function belongsToModule(item: ApiEquipmentRecord, module: ModuloTipo) {
  if (module === 'tvs') return item.tipo_modulo === 'TV' || item.categoria === 'TV';
  if (module === 'cameras') return item.tipo_modulo === 'CAMERA' || item.categoria === 'CAMERAS';
  return item.tipo_modulo === 'EQUIPAMENTO' || (!item.tipo_modulo && item.categoria !== 'TV' && item.categoria !== 'CAMERAS');
}

function daysUntil(dateValue: string) {
  const target = new Date(`${dateValue.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function GarantiasPage({ onBack }: { onBack: () => void }) {
  const { modulo } = useModulo();
  const [records, setRecords] = useState<ApiEquipmentRecord[]>([]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ApiUnitRecord[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (query.trim().length < 3) {
        setRecords([]);
        setLoading(false);
        setError('');
        return;
      }
      const params = new URLSearchParams({ tipo: moduleApiType[modulo] });
      if (query.trim()) params.set('busca', query.trim());
      setLoading(true);
      setError('');
      void apiGetList<ApiEquipmentRecord>(`/equipamentos/garantia?${params.toString()}`)
      .then((items) => { if (active) setRecords(items); })
      .catch((loadError) => { if (active) setError((loadError as Error).message || 'Nao foi possivel carregar as garantias.'); })
      .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [modulo, query]);

  useEffect(() => {
    const term = query.trim();
    const digits = term.replace(/\D/g, '');
    if (term.length < 3 && digits.length < 3) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setLoadingSuggestions(true);
      const params = new URLSearchParams(digits.length >= 3 ? { busca: term } : { prefixo: term });
      void apiGetList<ApiUnitRecord>(`/unidades?${params.toString()}`)
        .then((items) => { if (active) setSuggestions(items.slice(0, 8)); })
        .catch(() => { if (active) setSuggestions([]); })
        .finally(() => { if (active) setLoadingSuggestions(false); });
    }, 200);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const searched = useMemo(() => {
    return records.filter((item) => belongsToModule(item, modulo))
  }, [modulo, records]);

  const counts = useMemo(() => {
    const active = searched.filter((item) => daysUntil(item.data_garantia) > 90).length;
    const expiring = searched.filter((item) => daysUntil(item.data_garantia) >= 0 && daysUntil(item.data_garantia) <= 90).length;
    const expired = searched.filter((item) => daysUntil(item.data_garantia) < 0).length;
    return { all: searched.length, active, expiring, expired };
  }, [searched]);

  const visible = searched.filter((item) => filter === 'all'
    || (filter === 'active' && daysUntil(item.data_garantia) > 90)
    || (filter === 'expiring' && daysUntil(item.data_garantia) >= 0 && daysUntil(item.data_garantia) <= 90)
    || (filter === 'expired' && daysUntil(item.data_garantia) < 0));

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-selfit-600"><ArrowLeft className="h-4 w-4" />Voltar</button>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><ShieldCheck className="h-5 w-5" /></div>
        <div><h1 className="font-display text-2xl font-bold">Garantias</h1><p className="text-sm text-slate-500">Consulta de {moduleLabels[modulo].itemPlural.toLowerCase()} no banco de dados</p></div>
      </div>
      <Card className="p-4 shadow-sm">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pelo nome da unidade" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm uppercase" />
          {(suggestions.length > 0 || loadingSuggestions) && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {loadingSuggestions ? <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Buscando unidades...</div> : suggestions.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => {
                    setQuery(unit.nome);
                    setSuggestions([]);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-semibold uppercase text-slate-900">{unit.nome}</span>
                  <span className="text-xs uppercase text-slate-500">{unit.uf ?? '-'} - {unit.cep ?? '-'}</span>
                </button>
              ))}
            </div>
          )}
        </label>
      </Card>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{([['all','Todas'],['active','Vigentes'],['expiring','Vencendo'],['expired','Vencidas']] as const).map(([id,label]) => <button key={id} type="button" onClick={() => setFilter(id)} className={`rounded-lg border bg-white p-4 text-left ${filter === id ? 'border-selfit-500 ring-1 ring-selfit-500' : 'border-slate-200'}`}><span className="text-sm text-slate-500">{label}</span><strong className="mt-1 block text-2xl">{counts[id]}</strong></button>)}</div>
      {error && <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</p>}
      {query.trim().length < 3 ? (
        <Card className="p-10 text-center text-sm text-slate-500">Digite ao menos 3 caracteres do nome da unidade para consultar as garantias.</Card>
      ) : <Card><CardHeader className="border-b border-slate-100"><CardTitle>Registros ({visible.length})</CardTitle></CardHeader><CardContent className="p-0">
        {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Consultando garantias...</div>
          : visible.length === 0 ? <p className="p-12 text-center text-sm text-slate-500">{error ? 'Falha na consulta da API.' : 'Nenhum registro encontrado para esse filtro.'}</p>
            : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Identificacao</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Unidade / UF</th><th className="px-4 py-3">Marca</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Situacao</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((item) => { const remaining = daysUntil(item.data_garantia); return <tr key={item.id} className="uppercase"><td className="px-4 py-3 font-semibold">{item.nome_identificacao}</td><td className="px-4 py-3">{item.categoria}</td><td className="px-4 py-3">{item.unidade_nome} / {item.uf ?? '-'}</td><td className="px-4 py-3">{item.marca}</td><td className="px-4 py-3">{formatDateBr(item.data_garantia)}</td><td className="px-4 py-3">{remaining < 0 ? 'VENCIDA' : remaining <= 90 ? <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />VENCE EM {remaining} DIAS</span> : <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />VIGENTE</span>}</td></tr>; })}</tbody></table></div>}
      </CardContent></Card>}
    </div>
  );
}
