// Arquivo: src/pages/ManutencoesPage.tsx
// Serve para: registra, consulta, edita e remove manutencoes do modulo atual.

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Pencil, Plus, Save, Search, Trash2, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiGetList, apiRequest, inventoryUpdatedEvent, notifyInventoryUpdated, type ApiEnvelope, type ApiMaintenanceRecord, type ApiUnitRecord } from '@/services/api';
import { categoriaLabels, moduleLabels, type ModuloTipo } from '@/services/inventory/inventoryTypes';
import { useInventory } from '@/providers/InventoryProvider';
import { useModulo } from '@/providers/ModuloProvider';
import { formatDateBr } from '@/utils/date';

interface MaintenanceForm {
  equipamento_id: string;
  descricao: string;
  data_envio: string;
  data_retorno: string;
  custo: string;
  status_manutencao: string;
}

const emptyForm: MaintenanceForm = {
  equipamento_id: '',
  descricao: '',
  data_envio: '',
  data_retorno: '',
  custo: '',
  status_manutencao: 'ABERTA',
};

const moduleApiType: Record<ModuloTipo, string> = {
  tvs: 'TV',
  equipamentos: 'EQUIPAMENTO',
  cameras: 'CAMERA',
};

function moduleMatches(record: ApiMaintenanceRecord, module: ModuloTipo) {
  if (module === 'tvs') return record.tipo_modulo === 'TV' || record.categoria === 'TV';
  if (module === 'cameras') return record.tipo_modulo === 'CAMERA' || record.categoria === 'CAMERAS';
  return record.tipo_modulo === 'EQUIPAMENTO' || (!record.tipo_modulo && record.categoria !== 'TV' && record.categoria !== 'CAMERAS');
}

function dateValue(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

export function ManutencoesPage({ onBack }: { onBack: () => void }) {
  const { modulo } = useModulo();
  const { getEquipamentosByModulo } = useInventory();
  const equipmentOptions = getEquipamentosByModulo(modulo);
  const labels = moduleLabels[modulo];

  const [records, setRecords] = useState<ApiMaintenanceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<ApiUnitRecord[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiMaintenanceRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiMaintenanceRecord | null>(null);
  const [form, setForm] = useState<MaintenanceForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const term = search.trim();
      if (term.length < 3) {
        setRecords([]);
        setLoading(false);
        setError('');
        return;
      }

      const params = new URLSearchParams({ tipo: moduleApiType[modulo], busca: term });
      setLoading(true);
      setError('');
      void apiGetList<ApiMaintenanceRecord>(`/equipamentos/manutencao?${params.toString()}`)
        .then((items) => { if (active) setRecords(items); })
        .catch((loadError) => { if (active) setError((loadError as Error).message || 'Nao foi possivel carregar manutencoes.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [modulo, reloadKey, search]);

  useEffect(() => {
    const term = search.trim();
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
  }, [search]);

  useEffect(() => {
    const refresh = () => setReloadKey((value) => value + 1);
    window.addEventListener(inventoryUpdatedEvent, refresh);
    return () => window.removeEventListener(inventoryUpdatedEvent, refresh);
  }, []);

  const scoped = useMemo(() => records.filter((record) => moduleMatches(record, modulo)), [modulo, records]);

  const beginEdit = (record: ApiMaintenanceRecord) => {
    setEditing(record);
    setForm({
      equipamento_id: record.equipamento_id,
      descricao: record.descricao_manutencao,
      data_envio: dateValue(record.data_envio),
      data_retorno: dateValue(record.data_retorno),
      custo: record.custo == null ? '' : String(record.custo),
      status_manutencao: record.status_manutencao,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.equipamento_id || !form.descricao.trim() || !form.data_envio) return;

    setSaving(true);
    setError('');
    setSuccess('');
    const payload = {
      equipamento_id: form.equipamento_id,
      descricao: form.descricao.trim().toLocaleUpperCase('pt-BR'),
      data_envio: form.data_envio,
      data_retorno: form.data_retorno || null,
      custo: form.custo ? Number(form.custo) : null,
      status_manutencao: form.status_manutencao.toLocaleUpperCase('pt-BR'),
    };

    try {
      const result = await apiRequest<ApiEnvelope<{ id: number }>>(editing ? `/manutencoes/${editing.manutencao_id}` : '/manutencoes', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      if (result.sucesso === false) throw new Error(result.message ?? result.mensagem ?? 'A API recusou a manutencao.');
      closeForm();
      setSuccess(result.message ?? result.mensagem ?? (editing ? 'Manutencao atualizada com sucesso.' : 'Manutencao registrada com sucesso.'));
      notifyInventoryUpdated();
      setReloadKey((value) => value + 1);
    } catch (saveError) {
      setError((saveError as Error).message || 'Nao foi possivel salvar a manutencao.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: ApiMaintenanceRecord) => {
    setError('');
    setSuccess('');
    try {
      const result = await apiRequest<ApiEnvelope<never>>(`/manutencoes/${record.manutencao_id}`, { method: 'DELETE' });
      notifyInventoryUpdated();
      setReloadKey((value) => value + 1);
      setPendingDelete(null);
      setSuccess(result.message ?? result.mensagem ?? 'Manutencao removida com sucesso.');
    } catch (removeError) {
      setError((removeError as Error).message || 'Nao foi possivel remover a manutencao.');
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-selfit-600"><ArrowLeft className="h-4 w-4" />Voltar</button>

      <div className="flex flex-col gap-4 rounded-2xl border-2 border-black bg-white px-6 py-5 lg:flex-row lg:items-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><Wrench className="h-5 w-5" /></div>
        <div><h1 className="font-display text-2xl font-bold">Manutencoes</h1><p className="text-sm text-slate-500">Registros do banco para {labels.itemPlural}</p></div>
        <div className="ml-auto flex w-full max-w-xl flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pelo nome da unidade" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm uppercase" />
            {(suggestions.length > 0 || loadingSuggestions) && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                {loadingSuggestions ? <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Buscando unidades...</div> : suggestions.map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => {
                      setSearch(unit.nome);
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
          <Button size="sm" onClick={() => { setEditing(null); setForm(emptyForm); setShowForm((current) => !current); }}>{showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{showForm ? 'Fechar' : 'Registrar'}</Button>
        </div>
      </div>

      {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}

      {showForm && (
        <Card className="border-black p-5">
          <CardHeader className="px-0 pt-0"><CardTitle>{editing ? 'Atualizar manutencao' : 'Registrar manutencao'}</CardTitle></CardHeader>
          <CardContent className="px-0">
            <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">Item<select required disabled={Boolean(editing)} value={form.equipamento_id} onChange={(event) => setForm((current) => ({ ...current, equipamento_id: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Selecione...</option>{equipmentOptions.map((item) => <option key={item.id} value={item.id}>{item.nome} - {item.marca ?? ''}</option>)}</select></label>
              <label className="space-y-1 text-sm font-medium">Status<select value={form.status_manutencao} onChange={(event) => setForm((current) => ({ ...current, status_manutencao: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option>ABERTA</option><option>CONCLUIDA</option><option>CANCELADA</option></select></label>
              <label className="space-y-1 text-sm font-medium">Data de envio<input required type="date" value={form.data_envio} onChange={(event) => setForm((current) => ({ ...current, data_envio: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="space-y-1 text-sm font-medium">Data de retorno<input type="date" value={form.data_retorno} onChange={(event) => setForm((current) => ({ ...current, data_retorno: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="space-y-1 text-sm font-medium">Custo<input type="number" step="0.01" min="0" value={form.custo} onChange={(event) => setForm((current) => ({ ...current, custo: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="space-y-1 text-sm font-medium sm:col-span-2">Descricao<textarea required maxLength={65535} rows={3} value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value.toLocaleUpperCase('pt-BR') }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 uppercase" /></label>
              <div className="flex gap-2 sm:col-span-2"><Button disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editing ? 'Salvar' : 'Registrar'}</Button><Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      {search.trim().length < 3 ? (
        <Card className="p-10 text-center text-sm text-slate-500">Digite ao menos 3 caracteres do nome da unidade para consultar as manutencoes.</Card>
      ) : (
        <Card>
          <CardHeader className="border-b border-slate-100"><CardTitle>Manutencoes encontradas ({scoped.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Consultando manutencoes...</div>
              : scoped.length === 0 ? <p className="p-12 text-center text-sm text-slate-500">{error ? 'Falha na consulta da API.' : 'Nenhuma manutencao encontrada.'}</p>
                : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Unidade / UF</th><th className="px-4 py-3">Descricao</th><th className="px-4 py-3">Envio</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Acoes</th></tr></thead><tbody className="divide-y divide-slate-100">{scoped.map((record) => <tr key={record.manutencao_id} className="uppercase"><td className="px-4 py-3 font-semibold">{record.nome_identificacao}</td><td className="px-4 py-3">{categoriaLabels[record.categoria] ?? record.categoria}</td><td className="px-4 py-3">{record.unidade_nome} / {record.uf ?? '-'}</td><td className="max-w-xs px-4 py-3 normal-case">{record.descricao_manutencao}</td><td className="px-4 py-3">{formatDateBr(record.data_envio)}</td><td className="px-4 py-3">{record.status_manutencao}</td><td className="px-4 py-3"><div className="flex gap-1"><button type="button" title="Atualizar" onClick={() => beginEdit(record)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button><button type="button" title="Remover" onClick={() => setPendingDelete(record)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Confirmar exclusao"
        description="Revise a manutencao antes de remover."
        details={pendingDelete?.nome_identificacao}
        confirmLabel="Remover manutencao"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && void remove(pendingDelete)}
      />

      {success && createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setSuccess('')}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-950">Concluido</h2>
                  <p className="mt-1 text-sm text-slate-500">{success}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSuccess('')} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-end bg-slate-50 px-5 py-4">
              <Button type="button" onClick={() => setSuccess('')}>OK</Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
