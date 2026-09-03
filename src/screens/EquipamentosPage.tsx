import { useEffect, useMemo, useState } from 'react';
import { Cpu, Search, MapPin, Building2, Tag, Hash, Calendar, Wrench, Loader2, X, Tv, Pencil, Trash2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase, type Equipamento, type Unidade, type Regiao, categoriaLabels, statusEquipLabels, tiCategorias, moduleLabels } from '@/lib/supabase';
import { useModulo } from '@/App';

interface EquipamentoWithUnidade extends Equipamento {
  unidades?: Unidade & { regioes?: Regiao };
}

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  manutencao: 'bg-selfit-100 text-selfit-700 border-selfit-200',
  inativo: 'bg-slate-100 text-slate-600 border-slate-200',
  outros: 'bg-amber-100 text-amber-700 border-amber-200',
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20';

export function EquipamentosPage() {
  const { modulo, isTvOnly } = useModulo();
  const [equipamentos, setEquipamentos] = useState<EquipamentoWithUnidade[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regiaoFilter, setRegiaoFilter] = useState('all');
  const [selected, setSelected] = useState<EquipamentoWithUnidade | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nome: '', marca: '', modelo: '', status: 'ativo', data_garantia: '', posicao: '', observacoes: '' });
  const [toast, setToast] = useState('');

  const loadData = async () => {
    setLoading(true);
    const baseQuery = supabase.from('equipamentos').select('*, unidades(*, regioes(*))').order('nome');
    const [{ data: eqs }, { data: regs }] = await Promise.all([
      isTvOnly ? baseQuery.eq('categoria', 'TV') : baseQuery.neq('categoria', 'TV'),
      supabase.from('regioes').select('*').order('sigla'),
    ]);
    setEquipamentos((eqs as EquipamentoWithUnidade[]) ?? []);
    setRegioes((regs as Regiao[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [isTvOnly]);

  const filtered = useMemo(() => {
    let result = equipamentos;
    if (regiaoFilter !== 'all') result = result.filter((e) => e.unidades?.regioes?.sigla === regiaoFilter || e.unidades?.uf === regiaoFilter);
    if (catFilter !== 'all') result = result.filter((e) => e.categoria === catFilter);
    if (statusFilter !== 'all') result = result.filter((e) => e.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((e) => [e.nome, e.marca, e.modelo, e.asset_tag, e.numero_serie, e.unidades?.nome].some((value) => value?.toLowerCase().includes(q)));
    }
    return result;
  }, [equipamentos, query, catFilter, statusFilter, regiaoFilter]);

  const openEdit = (item: EquipamentoWithUnidade) => {
    setSelected(item);
    setEditing(true);
    setEditForm({
      nome: item.nome,
      marca: item.marca ?? '',
      modelo: item.modelo ?? '',
      status: item.status,
      data_garantia: item.data_garantia ?? '',
      posicao: item.posicao ?? '',
      observacoes: item.observacoes ?? '',
    });
  };

  const saveEdit = async () => {
    if (!selected) return;
    const { error } = await supabase.from('equipamentos').update({
      nome: editForm.nome,
      marca: editForm.marca || null,
      modelo: editForm.modelo || null,
      status: editForm.status,
      data_garantia: editForm.data_garantia || null,
      posicao: editForm.posicao || null,
      observacoes: editForm.observacoes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id);
    if (error) {
      setToast(error.message);
      return;
    }
    setToast(`${moduleLabels[modulo].item} atualizado.`);
    setEditing(false);
    setSelected(null);
    loadData();
  };

  const deleteItem = async (item: EquipamentoWithUnidade) => {
    if (!confirm(`Deletar "${item.nome}"?`)) return;
    const { error } = await supabase.from('equipamentos').delete().eq('id', item.id);
    if (error) {
      setToast(error.message);
      return;
    }
    setEquipamentos((prev) => prev.filter((e) => e.id !== item.id));
    if (selected?.id === item.id) setSelected(null);
    setToast(`${moduleLabels[modulo].item} deletado.`);
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-selfit-500" /></div>;

  const labels = moduleLabels[modulo];
  const categorias = isTvOnly ? ['TV'] : tiCategorias;
  const MainIcon = isTvOnly ? Tv : Cpu;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed right-5 top-20 z-50 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg animate-fade-in">
          {toast}
          <button className="ml-3 text-slate-400" onClick={() => setToast('')}>x</button>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><MainIcon className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{isTvOnly ? 'TVs e Displays' : 'Equipamentos de TI'}</h1>
          <p className="text-sm text-slate-500">{isTvOnly ? 'Exclusivamente TVs e displays cadastrados' : 'Exclusivamente ativos de TI cadastrados'}</p>
        </div>
        <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">{filtered.length}</span>
      </div>

      <Card className="animate-fade-in-up p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, marca, modelo, serie..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20" />
          </div>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-selfit-500 focus:outline-none">
            <option value="all">Todas categorias</option>
            {categorias.map((c) => <option key={c} value={c}>{categoriaLabels[c]}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-selfit-500 focus:outline-none">
            <option value="all">Todos status</option>
            {Object.entries(statusEquipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={regiaoFilter} onChange={(e) => setRegiaoFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-selfit-500 focus:outline-none">
            <option value="all">Todas regioes</option>
            {regioes.map((r) => <option key={r.id} value={r.sigla}>{r.sigla}</option>)}
          </select>
          {(query || catFilter !== 'all' || statusFilter !== 'all' || regiaoFilter !== 'all') && (
            <button onClick={() => { setQuery(''); setCatFilter('all'); setStatusFilter('all'); setRegiaoFilter('all'); }} className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /> Limpar</button>
          )}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-slate-400">Nenhum item encontrado.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e, i) => (
            <Card key={e.id} className="animate-fade-in-up border-black p-5 transition-all hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${i * 50}ms` }}>
              <CardContent className="px-0 pt-0">
                <div className="flex items-start justify-between gap-3">
                  <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => { setSelected(e); setEditing(false); }}>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white"><MainIcon className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-lg font-bold text-slate-900">{e.nome}</h3>
                      <p className="truncate text-xs text-slate-500">{categoriaLabels[e.categoria]} - {e.unidades?.nome ?? '-'}</p>
                    </div>
                  </button>
                  <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusColors[e.status]}`}>{statusEquipLabels[e.status]}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  {e.marca && <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {e.marca}</span>}
                  {e.modelo && <span>{e.modelo}</span>}
                  {e.asset_tag && <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> {e.asset_tag}</span>}
                  {e.data_garantia && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(e.data_garantia).toLocaleDateString('pt-BR')}</span>}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /> Atualizar</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => deleteItem(e)}><Trash2 className="h-4 w-4" /> Deletar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelected(null)}>
          <Card className="w-full max-w-2xl p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white"><MainIcon className="h-6 w-6" /></div>
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">{selected.nome}</h2>
                  <p className="text-sm text-slate-500">{categoriaLabels[selected.categoria]}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            {editing ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input value={editForm.nome} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))} className={inputClass} placeholder="Nome" />
                <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}>
                  {Object.entries(statusEquipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input value={editForm.marca} onChange={(e) => setEditForm((f) => ({ ...f, marca: e.target.value }))} className={inputClass} placeholder="Marca" />
                <input value={editForm.modelo} onChange={(e) => setEditForm((f) => ({ ...f, modelo: e.target.value }))} className={inputClass} placeholder="Modelo" />
                <input type="date" value={editForm.data_garantia} onChange={(e) => setEditForm((f) => ({ ...f, data_garantia: e.target.value }))} className={inputClass} />
                <input value={editForm.posicao} onChange={(e) => setEditForm((f) => ({ ...f, posicao: e.target.value }))} className={inputClass} placeholder="Posicao" />
                <textarea value={editForm.observacoes} onChange={(e) => setEditForm((f) => ({ ...f, observacoes: e.target.value }))} className={`${inputClass} resize-none sm:col-span-2`} rows={3} placeholder="Observacoes" />
                <div className="flex gap-2 sm:col-span-2">
                  <Button type="button" onClick={saveEdit}><Save className="h-4 w-4" /> Salvar</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <DetailRow label="Unidade" value={selected.unidades?.nome ?? '-'} icon={Building2} />
                  <DetailRow label="Regiao" value={selected.unidades?.regioes?.sigla ?? selected.unidades?.uf ?? '-'} icon={MapPin} />
                  <DetailRow label="Asset Tag" value={selected.asset_tag ?? '-'} icon={Hash} />
                  <DetailRow label="Marca" value={selected.marca ?? '-'} icon={Tag} />
                  <DetailRow label="Modelo" value={selected.modelo ?? '-'} icon={Tag} />
                  <DetailRow label="Numero de Serie" value={selected.numero_serie ?? '-'} icon={Hash} />
                  <DetailRow label="Garantia" value={selected.data_garantia ? new Date(selected.data_garantia).toLocaleDateString('pt-BR') : '-'} icon={Calendar} />
                  <DetailRow label="Status" value={statusEquipLabels[selected.status]} icon={Wrench} />
                </div>
                {selected.observacoes && <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{selected.observacoes}</div>}
                <div className="mt-5 flex gap-2">
                  <Button type="button" variant="outline" onClick={() => openEdit(selected)}><Pencil className="h-4 w-4" /> Atualizar</Button>
                  <Button type="button" variant="outline" onClick={() => deleteItem(selected)}><Trash2 className="h-4 w-4" /> Deletar</Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Cpu }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-slate-400" />
      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
