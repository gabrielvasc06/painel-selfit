import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Pencil, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiGetList, apiRequest, inventoryUpdatedEvent, notifyInventoryUpdated, type ApiEnvelope, type ApiEquipmentRecord } from '@/services/api';
import { moduleLabels, type ModuloTipo } from '@/services/inventory/inventoryTypes';
import { useModulo } from '@/providers/ModuloProvider';
import { dateBrToIso, formatDateBr, isoToDateBr, maskDateBr } from '@/utils/date';

function formatDate(value?: string | null) {
  return formatDateBr(value);
}

function moduleMatches(item: ApiEquipmentRecord, modulo: ModuloTipo) {
  if (modulo === 'tvs') return item.tipo_modulo === 'TV' || item.categoria === 'TV';
  if (modulo === 'cameras') return item.tipo_modulo === 'CAMERA' || item.categoria === 'CAMERAS';
  return item.tipo_modulo === 'EQUIPAMENTO' || (!item.tipo_modulo && item.categoria !== 'TV' && item.categoria !== 'CAMERAS');
}

export function EquipmentListPage() {
  const { modulo } = useModulo();
  const [records, setRecords] = useState<ApiEquipmentRecord[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<ApiEquipmentRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiEquipmentRecord | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void apiGetList<ApiEquipmentRecord>('/equipamentos/consultar')
      .then((items) => { if (active) setRecords(items); })
      .catch((loadError) => { if (active) setError((loadError as Error).message || 'Nao foi possivel carregar os registros.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  useEffect(() => {
    const refresh = () => setReloadKey((value) => value + 1);
    window.addEventListener(inventoryUpdatedEvent, refresh);
    return () => window.removeEventListener(inventoryUpdatedEvent, refresh);
  }, []);

  const saveEquipment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    const dataGarantiaIso = dateBrToIso(editing.data_garantia);
    if (!dataGarantiaIso) {
      setError('Informe a garantia no formato DD/MM/AAAA.');
      setSaving(false);
      return;
    }
    try {
      const result = await apiRequest<ApiEnvelope<never>>(`/equipamentos/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          unidade_nome: editing.unidade_nome,
          nome_identificacao: editing.nome_identificacao,
          categoria: editing.categoria,
          marca: editing.marca,
          status: editing.status,
          data_garantia: dataGarantiaIso,
        }),
      });
      if (result.sucesso === false) throw new Error(result.mensagem ?? result.message ?? 'A API recusou a atualizacao.');
      setEditing(null);
      notifyInventoryUpdated();
      setReloadKey((value) => value + 1);
    } catch (saveError) {
      setError((saveError as Error).message || 'Nao foi possivel atualizar o registro.');
    } finally {
      setSaving(false);
    }
  };

  const removeEquipment = async (item: ApiEquipmentRecord) => {
    setError('');
    try {
      await apiRequest(`/equipamentos/${item.id}`, { method: 'DELETE' });
      notifyInventoryUpdated();
      setReloadKey((value) => value + 1);
      setPendingDelete(null);
    } catch (removeError) {
      setError((removeError as Error).message || 'Nao foi possivel remover o registro.');
    }
  };

  const categories = useMemo(() => [...new Set(records.filter((item) => moduleMatches(item, modulo)).map((item) => item.categoria))].sort(), [modulo, records]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleUpperCase('pt-BR');
    return records.filter((item) => moduleMatches(item, modulo))
      .filter((item) => category === 'all' || item.categoria === category)
      .filter((item) => status === 'all' || item.status.toLocaleUpperCase('pt-BR') === status)
      .filter((item) => !term || [item.nome_identificacao, item.unidade_nome, item.categoria, item.marca].some((value) => value?.toLocaleUpperCase('pt-BR').includes(term)));
  }, [category, modulo, query, records, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><Search className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{moduleLabels[modulo].itemPlural}</h1>
          <p className="text-sm text-slate-500">Registros carregados do banco de dados</p>
        </div>
        <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{filtered.length}</span>
        <button type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={loading} aria-label="Atualizar lista" title="Atualizar lista" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(16rem,1fr)_14rem_14rem]">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar identificacao, unidade ou marca" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm uppercase text-slate-800 focus:border-selfit-500 focus:outline-none" />
          </label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            <option value="all">Todas as categorias</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            <option value="all">Todos os status</option>
            <option value="ATIVO">ATIVO</option>
            <option value="EM MANUTENCAO">EM MANUTENCAO</option>
            <option value="INATIVO">INATIVO</option>
            <option value="OUTROS">OUTROS</option>
          </select>
        </div>
      </Card>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}
      <Card>
        <CardHeader className="border-b border-slate-100"><CardTitle className="text-lg">Resultados ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando registros...</div>
            : filtered.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">{error ? 'Nao foi possivel consultar os registros.' : 'Nenhum registro encontrado.'}</p>
              : <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500"><tr>
                  <th className="px-4 py-3">Identificacao</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Unidade</th><th className="px-4 py-3">Marca</th><th className="px-4 py-3">Garantia</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Acoes</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => <tr key={item.id} className="text-slate-700">
                    <td className="px-4 py-3 font-semibold uppercase text-slate-900">{item.nome_identificacao}</td><td className="px-4 py-3 uppercase">{item.categoria}</td><td className="px-4 py-3 uppercase">{item.unidade_nome}</td><td className="px-4 py-3 uppercase">{item.marca}</td><td className="px-4 py-3">{formatDate(item.data_garantia)}</td><td className="px-4 py-3 uppercase">{item.status}</td><td className="px-4 py-3"><div className="flex gap-1"><button type="button" onClick={() => setEditing({ ...item, data_garantia: isoToDateBr(item.data_garantia) })} title="Atualizar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => setPendingDelete(item)} title="Remover" className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></td>
                  </tr>)}
                </tbody>
              </table></div>}
        </CardContent>
      </Card>

      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}><Card className="w-full max-w-3xl p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between"><CardTitle>Atualizar registro</CardTitle><button type="button" onClick={() => setEditing(null)} aria-label="Fechar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <form onSubmit={saveEquipment} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {([['unidade_nome','Unidade'],['nome_identificacao','Identificacao'],['marca','Marca'],['data_garantia','Garantia']] as const).map(([key,label]) => <label key={key} className="space-y-1 text-sm font-medium text-slate-700"><span>{label}</span><input required inputMode={key === 'data_garantia' ? 'numeric' : undefined} placeholder={key === 'data_garantia' ? 'DD/MM/AAAA' : undefined} maxLength={key === 'data_garantia' ? 10 : key === 'marca' ? 50 : 100} value={editing[key] ?? ''} onChange={(event) => setEditing((current) => current ? { ...current, [key]: key === 'data_garantia' ? maskDateBr(event.target.value) : event.target.value.toLocaleUpperCase('pt-BR') } : current)} className="w-full rounded-lg border border-slate-300 px-3 py-2 uppercase" /></label>)}
          <label className="space-y-1 text-sm font-medium text-slate-700"><span>Status</span><select value={editing.status} onChange={(event) => setEditing((current) => current ? { ...current, status: event.target.value } : current)} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option>ATIVO</option><option>EM MANUTENCAO</option><option>INATIVO</option><option>OUTROS</option></select></label>
          <div className="flex gap-2 sm:col-span-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancelar</button></div>
        </form>
      </Card></div>}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Confirmar exclusao"
        description="Revise o registro antes de remover."
        details={pendingDelete?.nome_identificacao}
        confirmLabel="Remover registro"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && void removeEquipment(pendingDelete)}
      />
    </div>
  );
}
