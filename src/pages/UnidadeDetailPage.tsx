import { useState } from 'react';
import { AlertCircle, ArrowLeft, Building2, Loader2, MapPin, Pencil, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiRequest, notifyInventoryUpdated, type ApiEnvelope } from '@/services/api';
import { useInventory } from '@/providers/InventoryProvider';
import { categoriaLabels, statusEquipLabels, type Equipamento } from '@/services/inventory/inventoryTypes';
import { useModulo } from '@/providers/ModuloProvider';
import { dateBrToIso, formatDateBr, isoToDateBr, maskDateBr } from '@/utils/date';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20';

export function UnidadeDetailPage({ unidadeId, onBack }: { unidadeId: string; onBack: () => void }) {
  const { modulo } = useModulo();
  const { getUnidade, getEquipamentosByModulo } = useInventory();
  const unidade = getUnidade(unidadeId);
  const items = getEquipamentosByModulo(modulo).filter((item) => item.unidade_id === unidadeId);
  const [editing, setEditing] = useState<Equipamento | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Equipamento | null>(null);
  const [form, setForm] = useState({ nome: '', marca: '', status: 'ATIVO', data_garantia: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!unidade) return <Card className="p-12 text-center"><p className="text-slate-500">Unidade nao encontrada.</p></Card>;

  const openEdit = (item: Equipamento) => {
    setEditing(item);
    setForm({
      nome: item.nome,
      marca: item.marca ?? '',
      status: item.status.toLocaleUpperCase('pt-BR'),
      data_garantia: isoToDateBr(item.data_garantia),
    });
    setError('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    const dataGarantiaIso = dateBrToIso(form.data_garantia);
    if (!dataGarantiaIso) {
      setError('Informe a data de garantia no formato DD/MM/AAAA.');
      setSaving(false);
      return;
    }

    try {
      const result = await apiRequest<ApiEnvelope<never>>(`/equipamentos/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          unidade_nome: unidade.nome,
          nome_identificacao: form.nome.trim().toLocaleUpperCase('pt-BR'),
          marca: form.marca.trim().toLocaleUpperCase('pt-BR'),
          status: form.status.toLocaleUpperCase('pt-BR'),
          data_garantia: dataGarantiaIso,
        }),
      });
      if (result.sucesso === false) throw new Error(result.message ?? result.mensagem ?? 'A API recusou a atualizacao.');
      setEditing(null);
      notifyInventoryUpdated();
    } catch (saveError) {
      setError((saveError as Error).message || 'Nao foi possivel atualizar o equipamento.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: Equipamento) => {
    setError('');
    try {
      await apiRequest(`/equipamentos/${item.id}`, { method: 'DELETE' });
      notifyInventoryUpdated();
      setPendingDelete(null);
    } catch (removeError) {
      setError((removeError as Error).message || 'Nao foi possivel remover o equipamento.');
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-selfit-600"><ArrowLeft className="h-4 w-4" />Voltar</button>
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7" />
          <div>
            <h1 className="font-display text-2xl font-bold">{unidade.nome}</h1>
            <p className="flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" />{unidade.uf ?? '-'} - {unidade.bairro ?? '-'} - {unidade.logradouro ?? '-'}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Detail label="Tipo" value="Propria" />
          <Detail label="CNPJ" value={unidade.cnpj ?? '-'} />
          <Detail label="CEP" value={unidade.cep ?? '-'} />
          <Detail label="Numero" value={unidade.numero ?? '-'} />
        </div>
      </Card>

      {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}

      <Card>
        <CardHeader className="border-b border-slate-100"><CardTitle>Registros do modulo ({items.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">Nenhum item encontrado para esta unidade.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr><th className="px-4 py-3">Identificacao</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Marca</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Garantia</th><th className="px-4 py-3">Acoes</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="uppercase">
                      <td className="px-4 py-3 font-semibold">{item.nome}</td>
                      <td className="px-4 py-3">{categoriaLabels[item.categoria] ?? item.categoria}</td>
                      <td className="px-4 py-3">{item.marca ?? '-'}</td>
                      <td className="px-4 py-3">{statusEquipLabels[item.status] ?? item.status}</td>
                      <td className="px-4 py-3">{formatDateBr(item.data_garantia)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button type="button" title="Atualizar" onClick={() => openEdit(item)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                          <button type="button" title="Remover" onClick={() => setPendingDelete(item)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
        <Card className="w-full max-w-2xl p-6" onClick={(event) => event.stopPropagation()}>
          <div className="mb-5 flex items-center justify-between"><CardTitle>Atualizar {categoriaLabels[editing.categoria] ?? 'equipamento'}</CardTitle><button type="button" onClick={() => setEditing(null)} aria-label="Fechar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
          <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Identificacao"><input required maxLength={100} value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value.toLocaleUpperCase('pt-BR') }))} className={inputClass} /></Field>
            <Field label="Marca"><input required maxLength={50} value={form.marca} onChange={(event) => setForm((current) => ({ ...current, marca: event.target.value.toLocaleUpperCase('pt-BR') }))} className={inputClass} /></Field>
            <Field label="Status"><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className={inputClass}><option>ATIVO</option><option>EM MANUTENCAO</option><option>INATIVO</option></select></Field>
            <Field label="Data de garantia"><input required inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={form.data_garantia} onChange={(event) => setForm((current) => ({ ...current, data_garantia: maskDateBr(event.target.value) }))} className={inputClass} /></Field>
            <div className="flex gap-2 sm:col-span-2"><Button disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button></div>
          </form>
        </Card>
      </div>}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Confirmar exclusao"
        description="Revise o registro antes de remover."
        details={pendingDelete?.nome}
        confirmLabel="Remover registro"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && void remove(pendingDelete)}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="font-semibold text-slate-800">{value}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1 text-sm font-semibold text-slate-700"><span>{label}</span>{children}</label>;
}
