// Arquivo: src/pages/ConsultarPage.tsx
// Serve para: consulta unidades e mostra os itens cadastrados por unidade.

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ArrowLeft, Building2, Hash, Loader2, MapPin, Pencil, Save, Search, Trash2, Tv, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiGetList, apiRequest, notifyInventoryUpdated, type ApiEnvelope, type ApiUnitRecord } from '@/services/api';
import { useInventory } from '@/providers/InventoryProvider';
import { useModulo } from '@/providers/ModuloProvider';
import { moduleLabels, statusEquipLabels, type Equipamento, type EquipamentoStatus } from '@/services/inventory/inventoryTypes';
import { dateBrToIso, formatDateBr, isoToDateBr, maskDateBr } from '@/utils/date';

type EditForm = {
  nome: string;
  marca: string;
  status: EquipamentoStatus;
  data_garantia: string;
};

export function ConsultarPage() {
  const { modulo } = useModulo();
  const { getEquipamentosByModulo } = useInventory();
  const [query, setQuery] = useState('');
  const [units, setUnits] = useState<ApiUnitRecord[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ApiUnitRecord[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [editing, setEditing] = useState<Equipamento | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Equipamento | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ nome: '', marca: '', status: 'ativo', data_garantia: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);

  const itemsByUnit = useMemo(() => {
    const map = new Map<string, Equipamento[]>();
    for (const item of getEquipamentosByModulo(modulo)) {
      if (!item.unidade_id) continue;
      const current = map.get(item.unidade_id) ?? [];
      current.push(item);
      map.set(item.unidade_id, current);
    }
    return map;
  }, [getEquipamentosByModulo, modulo]);

  const selectedUnit = useMemo(() => {
    if (units.length === 0) return null;
    return units.find((unit) => unit.id === selectedUnitId) ?? units[0];
  }, [selectedUnitId, units]);

  const selectedItems = selectedUnit ? (itemsByUnit.get(String(selectedUnit.id)) ?? []) : [];
  const labels = moduleLabels[modulo];

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
        .then((result) => { if (active) setSuggestions(result.slice(0, 8)); })
        .catch(() => { if (active) setSuggestions([]); })
        .finally(() => { if (active) setLoadingSuggestions(false); });
    }, 200);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (!showResults && !editing) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [editing, showResults]);

  const openResult = (result: ApiUnitRecord[]) => {
    setUnits(result);
    setSelectedUnitId(result[0]?.id ?? null);
    setShowResults(true);
  };

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) {
      setError('Digite o nome da unidade, CNPJ ou CEP para consultar.');
      setUnits([]);
      setSelectedUnitId(null);
      setShowResults(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ busca: term });
      const result = await apiGetList<ApiUnitRecord>(`/unidades?${params.toString()}`);
      openResult(result);
      if (result.length === 0) setError('Nenhuma unidade encontrada para a busca informada.');
    } catch (loadError) {
      setUnits([]);
      setSelectedUnitId(null);
      setShowResults(false);
      setError((loadError as Error).message || 'Nao foi possivel consultar as unidades.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: Equipamento) => {
    setEditing(item);
    setEditForm({
      nome: item.nome,
      marca: item.marca ?? '',
      status: item.status,
      data_garantia: isoToDateBr(item.data_garantia),
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setEditForm({ nome: '', marca: '', status: 'ativo', data_garantia: '' });
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !selectedUnit) return;

    const warrantyDate = dateBrToIso(editForm.data_garantia);
    if (!editForm.nome.trim()) {
      setError('Informe a identificacao antes de salvar.');
      return;
    }
    if (!warrantyDate) {
      setError('Informe a garantia no formato dia/mes/ano, com 4 digitos no ano.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await apiRequest<ApiEnvelope<{ id: string }>>(`/equipamentos/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          unidade_nome: selectedUnit.nome,
          nome_identificacao: editForm.nome.trim().toLocaleUpperCase('pt-BR'),
          categoria: editing.categoria,
          marca: editForm.marca.trim().toLocaleUpperCase('pt-BR'),
          status: editForm.status.toLocaleUpperCase('pt-BR'),
          data_garantia: warrantyDate,
        }),
      });

      if (result.sucesso === false) throw new Error(result.mensagem ?? result.message ?? 'A API recusou a atualizacao.');
      closeEdit();
      notifyInventoryUpdated();
    } catch (saveError) {
      setError((saveError as Error).message || 'Nao foi possivel atualizar o registro.');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item: Equipamento) => {
    setError('');
    try {
      await apiRequest(`/equipamentos/${item.id}`, { method: 'DELETE' });
      notifyInventoryUpdated();
      if (editing?.id === item.id) closeEdit();
      setPendingDelete(null);
    } catch (removeError) {
      setError((removeError as Error).message || 'Nao foi possivel remover o registro.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl bg-black px-6 py-5 shadow-lg">
        <Search className="h-6 w-6 text-white" />
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Consultar Unidades</h1>
          <p className="text-sm text-white/70">Busque por nome da unidade, CNPJ ou CEP</p>
        </div>
      </div>

      <Card className="p-5 shadow-sm">
        <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
          <label className="relative block flex-1">
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Digite unidade, CNPJ ou CEP"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 uppercase text-slate-900 focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20"
            />
            {(suggestions.length > 0 || loadingSuggestions) && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                {loadingSuggestions ? <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Buscando unidades...</div> : suggestions.map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => {
                      setQuery(unit.nome);
                      setSuggestions([]);
                      openResult([unit]);
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
          <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Consultar
          </button>
        </form>
      </Card>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}

      {showResults && (
        createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-6" onClick={() => setShowResults(false)}>
          <Card className="flex max-h-[calc(100dvh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <CardHeader className="shrink-0 flex-row items-center justify-between gap-3 border-b border-slate-100 bg-white">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5" />Resultado da consulta</CardTitle>
                <p className="mt-1 text-sm text-slate-500">{units.length} unidade(s) encontrada(s)</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowResults(false)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Voltar</button>
              </div>
            </CardHeader>
            <CardContent className="scrollbar-thin flex-1 overflow-y-auto p-0">
              <aside className="border-b border-slate-100 bg-slate-50 p-3">
                {units.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Nenhuma unidade encontrada.</p> : units.map((unit) => {
                  const count = itemsByUnit.get(String(unit.id))?.length ?? 0;
                  const active = selectedUnit?.id === unit.id;
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => setSelectedUnitId(unit.id)}
                      className={`mb-2 w-full rounded-lg border p-3 text-left transition sm:mr-2 sm:inline-block sm:w-[calc(50%-0.5rem)] xl:w-[calc(33.333%-0.5rem)] ${active ? 'border-black bg-white shadow-sm' : 'border-transparent bg-transparent hover:border-slate-200 hover:bg-white'}`}
                    >
                      <span className="block text-sm font-bold uppercase text-slate-900">{unit.nome}</span>
                      <span className="mt-1 flex items-center gap-1 text-xs uppercase text-slate-500"><MapPin className="h-3 w-3" />{unit.uf ?? '-'} - {unit.bairro ?? '-'}</span>
                      <span className="mt-2 mr-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Propria</span>
                      <span className="mt-2 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">{count} {labels.itemPlural.toLowerCase()}</span>
                    </button>
                  );
                })}
              </aside>

              <section className="p-4 sm:p-5">
                {!selectedUnit ? <p className="p-10 text-center text-sm text-slate-500">Nenhuma unidade selecionada.</p> : (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-start">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white"><Building2 className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-display text-xl font-bold uppercase text-slate-950">{selectedUnit.nome}</h2>
                        <p className="mt-1 text-sm uppercase text-slate-500">{selectedUnit.rua ?? '-'}, {selectedUnit.numero ?? '-'} - {selectedUnit.bairro ?? '-'} / {selectedUnit.uf ?? '-'}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
                      <Detail icon={Hash} label="CNPJ" value={selectedUnit.cnpj} />
                      <Detail icon={MapPin} label="CEP" value={selectedUnit.cep ?? '-'} />
                      <Detail icon={MapPin} label="UF" value={selectedUnit.uf ?? '-'} />
                      <Detail icon={Building2} label="Tipo" value="Propria" />
                      <Detail icon={Tv} label={labels.itemPlural} value={String(selectedItems.length)} />
                    </div>

                    <div className="rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Tv className="h-4 w-4" />{labels.itemPlural} cadastrados</div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{selectedItems.length}</span>
                      </div>
                      {selectedItems.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">Nenhum registro deste modulo nesta unidade.</p> : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Identificacao</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Marca</th><th className="px-4 py-3">Garantia</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Acoes</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{selectedItems.map((item) => <tr key={item.id} className="uppercase"><td className="px-4 py-3 font-semibold">{item.nome}</td><td className="px-4 py-3">{item.categoria}</td><td className="px-4 py-3">{item.marca ?? '-'}</td><td className="px-4 py-3">{formatDateBr(item.data_garantia)}</td><td className="px-4 py-3">{statusEquipLabels[item.status] ?? item.status}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" title="Atualizar" onClick={() => startEdit(item)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Pencil className="h-4 w-4" /></button><button type="button" title="Remover" onClick={() => setPendingDelete(item)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </CardContent>
          </Card>
        </div>,
        document.body,
        )
      )}

      {editing && (
        createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-3 sm:p-6" onClick={closeEdit}>
          <Card className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <CardHeader className="shrink-0 flex-row items-center justify-between border-b border-slate-100 bg-white">
              <div>
                <CardTitle>Atualizar registro</CardTitle>
                <p className="mt-1 text-sm text-slate-500 uppercase">{editing.nome}</p>
              </div>
              <button type="button" onClick={closeEdit} aria-label="Fechar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="scrollbar-thin flex-1 overflow-y-auto p-5">
              <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-medium sm:col-span-2">Identificacao<input value={editForm.nome} onChange={(event) => setEditForm((current) => ({ ...current, nome: event.target.value.toLocaleUpperCase('pt-BR') }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 uppercase" /></label>
                <label className="space-y-1 text-sm font-medium">Marca<input value={editForm.marca} onChange={(event) => setEditForm((current) => ({ ...current, marca: event.target.value.toLocaleUpperCase('pt-BR') }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 uppercase" /></label>
                <label className="space-y-1 text-sm font-medium">Garantia<input inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} value={editForm.data_garantia} onChange={(event) => setEditForm((current) => ({ ...current, data_garantia: maskDateBr(event.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                <label className="space-y-1 text-sm font-medium">Status<select value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value as EquipamentoStatus }))} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option value="ativo">Ativo</option><option value="manutencao">Manutencao</option><option value="inativo">Inativo</option><option value="outros">Outros</option></select></label>
                <div className="flex gap-2 sm:col-span-2">
                  <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar</button>
                  <button type="button" onClick={closeEdit} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>,
        document.body,
        )
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Confirmar exclusao"
        description="Revise o registro antes de remover."
        details={pendingDelete?.nome}
        confirmLabel="Remover registro"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && void removeItem(pendingDelete)}
      />
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-slate-500"><Icon className="h-3.5 w-3.5" />{label}</p>
      <p className="mt-1 truncate font-semibold uppercase text-slate-800" title={value}>{value}</p>
    </div>
  );
}
