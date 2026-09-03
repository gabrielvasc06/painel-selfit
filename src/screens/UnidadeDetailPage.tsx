import { useEffect, useState } from 'react';
import { ArrowLeft, Tv, MapPin, Building, Wrench, CheckCircle2, Archive, Loader2, FileText, Hash, BadgeCheck, Cpu, Pencil, Trash2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase, type Equipamento, type Unidade, type Regiao, categoriaLabels, moduleLabels, statusEquipLabels } from '@/lib/supabase';
import { DonutChart } from '@/screens/DashboardPage';
import { useModulo } from '@/App';

const statusConfig = {
  ativo: { label: 'Ativo', icon: CheckCircle2, class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  manutencao: { label: 'Manutencao', icon: Wrench, class: 'bg-selfit-100 text-selfit-700 border-selfit-200' },
  inativo: { label: 'Inativo', icon: Archive, class: 'bg-slate-100 text-slate-600 border-slate-200' },
  outros: { label: 'Outros', icon: Archive, class: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20';

export function UnidadeDetailPage({ unidadeId, onBack }: { unidadeId: string; onBack: () => void }) {
  const { modulo, isTvOnly } = useModulo();
  const [unidade, setUnidade] = useState<Unidade & { regioes?: Regiao } | null>(null);
  const [itens, setItens] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Equipamento | null>(null);
  const [editForm, setEditForm] = useState({ nome: '', marca: '', modelo: '', status: 'ativo', observacoes: '' });
  const [toast, setToast] = useState('');

  const loadData = async () => {
    setLoading(true);
    const equipmentQuery = supabase.from('equipamentos').select('*').eq('unidade_id', unidadeId).order('nome');
    const [{ data: u }, { data: itemList }] = await Promise.all([
      supabase.from('unidades').select('*, regioes(*)').eq('id', unidadeId).maybeSingle(),
      isTvOnly ? equipmentQuery.eq('categoria', 'TV') : equipmentQuery.neq('categoria', 'TV'),
    ]);
    setUnidade(u as (Unidade & { regioes?: Regiao }) | null);
    setItens((itemList as Equipamento[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [unidadeId, isTvOnly]);

  const openEdit = (item: Equipamento) => {
    setEditing(item);
    setEditForm({ nome: item.nome, marca: item.marca ?? '', modelo: item.modelo ?? '', status: item.status, observacoes: item.observacoes ?? '' });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase.from('equipamentos').update({
      nome: editForm.nome,
      marca: editForm.marca || null,
      modelo: editForm.modelo || null,
      status: editForm.status,
      observacoes: editForm.observacoes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', editing.id);
    if (error) {
      setToast(error.message);
      return;
    }
    setToast(`${moduleLabels[modulo].item} atualizado.`);
    setEditing(null);
    loadData();
  };

  const deleteItem = async (item: Equipamento) => {
    if (!confirm(`Deletar "${item.nome}"?`)) return;
    const { error } = await supabase.from('equipamentos').delete().eq('id', item.id);
    if (error) {
      setToast(error.message);
      return;
    }
    setItens((prev) => prev.filter((e) => e.id !== item.id));
    setToast(`${moduleLabels[modulo].item} deletado.`);
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-selfit-500" /></div>;
  if (!unidade) return <Card className="p-12 text-center"><p className="text-slate-400">Unidade nao encontrada.</p></Card>;

  const labels = moduleLabels[modulo];
  const MainIcon = isTvOnly ? Tv : Cpu;
  const ativos = itens.filter((t) => t.status === 'ativo').length;
  const manutencao = itens.filter((t) => t.status === 'manutencao').length;
  const outros = itens.filter((t) => t.status === 'outros' || t.status === 'inativo').length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed right-5 top-20 z-50 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg animate-fade-in">
          {toast}<button className="ml-3 text-slate-400" onClick={() => setToast('')}>x</button>
        </div>
      )}
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-selfit-600">
        <ArrowLeft className="h-4 w-4" /> Voltar a lista
      </button>

      <div className="flex flex-col gap-4 rounded-2xl border-2 border-black bg-white p-6 shadow-sm animate-fade-in sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white"><Building className="h-7 w-7" /></div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">{unidade.nome}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {unidade.regioes?.sigla ?? unidade.uf} - {unidade.regioes?.nome ?? 'Regiao'}</span>
              <span>{unidade.cidade ?? '-'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-selfit-50 px-4 py-3">
          <MainIcon className="h-5 w-5 text-selfit-600" />
          <span className="font-display text-2xl font-bold text-selfit-700">{itens.length}</span>
          <span className="text-sm text-selfit-600">{labels.itemPlural}</span>
        </div>
      </div>

      <Card className="animate-fade-in-up border-slate-200 p-5" style={{ animationDelay: '40ms' }}>
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-selfit-500" />
          <h2 className="font-display text-base font-bold text-slate-900">Amostra cadastral da filial</h2>
          <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">Planilha oficial</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RegistrationItem icon={BadgeCheck} label="CNPJ" value={unidade.cnpj ?? 'Nao informado'} />
          <RegistrationItem icon={Hash} label="Codigo EVO" value={unidade.codigo_evo ?? 'Nao informado'} />
          <RegistrationItem icon={MapPin} label="Municipio / UF" value={`${unidade.cidade ?? 'Nao informado'}${unidade.uf ? ` / ${unidade.uf}` : ''}`} />
          <RegistrationItem icon={FileText} label="Amostra" value={unidade.amostra ?? 'Relacao de filiais Selfit'} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_1fr]">
        <Card className="animate-fade-in-up p-6">
          <CardHeader className="px-0 pt-0"><CardTitle className="text-lg">Status de {labels.itemPlural}</CardTitle></CardHeader>
          <CardContent className="px-0">
            <div className="flex flex-col items-center gap-4">
              <DonutChart ativas={ativos} manutencao={manutencao} outros={outros} total={itens.length} label={labels.itemPlural} />
              <div className="w-full space-y-2">
                <LegendRow label="Ativos" value={ativos} total={itens.length} color="bg-emerald-500" />
                <LegendRow label="Manutencao" value={manutencao} total={itens.length} color="bg-selfit-500" />
                <LegendRow label="Outros" value={outros} total={itens.length} color="bg-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up overflow-hidden border-black" style={{ animationDelay: '80ms' }}>
          <CardHeader className="border-b-2 border-black"><CardTitle className="text-lg">{labels.itemPlural} Cadastrados</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 font-semibold text-slate-600">Nome</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Categoria</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Modelo</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itens.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Nenhum item cadastrado nesta unidade.</td></tr>
                  ) : (
                    itens.map((item) => {
                      const sc = statusConfig[item.status] ?? statusConfig.outros;
                      const StatusIcon = sc.icon;
                      return (
                        <tr key={item.id} className="transition-colors hover:bg-slate-50">
                          <td className="px-5 py-3 font-semibold text-slate-900">{item.nome}</td>
                          <td className="px-5 py-3 text-slate-600">{categoriaLabels[item.categoria]}</td>
                          <td className="px-5 py-3 text-slate-600">{item.modelo ?? '-'}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${sc.class}`}>
                              <StatusIcon className="h-3.5 w-3.5" /> {sc.label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-selfit-50 hover:text-selfit-600" title="Atualizar"><Pencil className="h-4 w-4" /></button>
                              <button onClick={() => deleteItem(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500" title="Deletar"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setEditing(null)}>
          <Card className="w-full max-w-lg p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <CardTitle className="text-lg">Atualizar {labels.item}</CardTitle>
              <button onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input value={editForm.nome} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))} className={inputClass} placeholder="Nome" />
              <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}>
                {Object.entries(statusEquipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input value={editForm.marca} onChange={(e) => setEditForm((f) => ({ ...f, marca: e.target.value }))} className={inputClass} placeholder="Marca" />
              <input value={editForm.modelo} onChange={(e) => setEditForm((f) => ({ ...f, modelo: e.target.value }))} className={inputClass} placeholder="Modelo" />
              <textarea value={editForm.observacoes} onChange={(e) => setEditForm((f) => ({ ...f, observacoes: e.target.value }))} className={`${inputClass} resize-none sm:col-span-2`} rows={3} placeholder="Observacoes" />
            </div>
            <div className="mt-5 flex gap-2">
              <Button type="button" onClick={saveEdit}><Save className="h-4 w-4" /> Salvar</Button>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function RegistrationItem({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="break-words text-sm font-semibold text-slate-800">{value}</p>
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
