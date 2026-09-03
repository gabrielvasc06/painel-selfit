import { useEffect, useMemo, useState } from 'react';
import { Wrench, Calendar, User, DollarSign, Plus, Loader2, Trash2, History, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase, type Equipamento, type Manutencao, type Regiao, type Unidade, categoriaLabels, moduleLabels } from '@/lib/supabase';
import { useModulo } from '@/App';

interface EquipamentoWithUnidade extends Equipamento {
  unidades?: Unidade & { regioes?: Regiao };
}

const tipoLabels: Record<string, string> = {
  troca: 'Troca',
  reparo: 'Reparo',
  chamado_tecnico: 'Chamado Tecnico',
  preventiva: 'Preventiva',
  outros: 'Outros',
};

const tipoColors: Record<string, string> = {
  troca: 'bg-sky-100 text-sky-700 border-sky-200',
  reparo: 'bg-amber-100 text-amber-700 border-amber-200',
  chamado_tecnico: 'bg-selfit-100 text-selfit-700 border-selfit-200',
  preventiva: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  outros: 'bg-slate-100 text-slate-600 border-slate-200',
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 transition-all focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20';

export function ManutencoesPage() {
  const { modulo, isTvOnly } = useModulo();
  const [equipamentos, setEquipamentos] = useState<EquipamentoWithUnidade[]>([]);
  const [manutencoes, setManutencoes] = useState<(Manutencao & { equipamentos?: EquipamentoWithUnidade })[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [regiaoFilter, setRegiaoFilter] = useState('all');
  const [form, setForm] = useState({ equipamento_id: '', tipo: 'reparo', descricao: '', responsavel: '', data_manutencao: '', custo: '' });
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    const equipmentQuery = supabase.from('equipamentos').select('*, unidades(*, regioes(*))').order('nome');
    const [{ data: eqs }, { data: regs }] = await Promise.all([
      isTvOnly ? equipmentQuery.eq('categoria', 'TV') : equipmentQuery.neq('categoria', 'TV'),
      supabase.from('regioes').select('*').order('sigla'),
    ]);
    const scopedEquipamentos = (eqs as EquipamentoWithUnidade[]) ?? [];
    const ids = scopedEquipamentos.map((eq) => eq.id);
    const { data: mans } = ids.length
      ? await supabase.from('manutencoes').select('*, equipamentos(*, unidades(*, regioes(*)))').in('equipamento_id', ids).order('data_manutencao', { ascending: false })
      : { data: [] };
    setEquipamentos(scopedEquipamentos);
    setRegioes((regs as Regiao[]) ?? []);
    setManutencoes((mans as (Manutencao & { equipamentos?: EquipamentoWithUnidade })[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [isTvOnly]);

  const filteredEquipamentos = useMemo(() => (
    regiaoFilter === 'all' ? equipamentos : equipamentos.filter((eq) => eq.unidades?.regioes?.sigla === regiaoFilter || eq.unidades?.uf === regiaoFilter)
  ), [equipamentos, regiaoFilter]);

  const filteredManutencoes = useMemo(() => (
    regiaoFilter === 'all' ? manutencoes : manutencoes.filter((m) => m.equipamentos?.unidades?.regioes?.sigla === regiaoFilter || m.equipamentos?.unidades?.uf === regiaoFilter)
  ), [manutencoes, regiaoFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.equipamento_id) return;
    const { error: insErr } = await supabase.from('manutencoes').insert({
      equipamento_id: form.equipamento_id,
      tipo: form.tipo,
      descricao: form.descricao || null,
      responsavel: form.responsavel || null,
      data_manutencao: form.data_manutencao || new Date().toISOString().split('T')[0],
      custo: form.custo ? parseFloat(form.custo) : null,
    });
    if (insErr) { setError(insErr.message); return; }
    setForm({ equipamento_id: '', tipo: 'reparo', descricao: '', responsavel: '', data_manutencao: '', custo: '' });
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registro de manutencao?')) return;
    await supabase.from('manutencoes').delete().eq('id', id);
    setManutencoes((prev) => prev.filter((m) => m.id !== id));
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-selfit-500" /></div>;

  const labels = moduleLabels[modulo];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in lg:flex-row lg:items-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><Wrench className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Historico de Manutencoes</h1>
          <p className="text-sm text-slate-500">Registros exclusivos de {labels.itemPlural.toLowerCase()}</p>
        </div>
        <div className="ml-auto flex gap-3">
          <select value={regiaoFilter} onChange={(e) => setRegiaoFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-selfit-500 focus:outline-none">
            <option value="all">Todas regioes</option>
            {regioes.map((r) => <option key={r.id} value={r.sigla}>{r.sigla}</option>)}
          </select>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> Registrar</Button>
        </div>
      </div>

      {showForm && (
        <Card className="animate-fade-in-up border-black p-6">
          <CardHeader className="px-0 pt-0"><CardTitle className="text-lg">Nova Manutencao</CardTitle></CardHeader>
          <CardContent className="px-0 pt-4">
            {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Wrench className="h-4 w-4 text-slate-400" /> {labels.item}</label>
                  <select required value={form.equipamento_id} onChange={(e) => setForm((f) => ({ ...f, equipamento_id: e.target.value }))} className={inputClass}>
                    <option value="">Selecione...</option>
                    {filteredEquipamentos.map((eq) => <option key={eq.id} value={eq.id}>{eq.nome} - {categoriaLabels[eq.categoria]} ({eq.unidades?.nome ?? '-'})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Wrench className="h-4 w-4 text-slate-400" /> Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} className={inputClass}>
                    {Object.entries(tipoLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><User className="h-4 w-4 text-slate-400" /> Responsavel</label>
                  <input value={form.responsavel} onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))} placeholder="Ex: Joao Silva" className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Calendar className="h-4 w-4 text-slate-400" /> Data</label>
                  <input type="date" value={form.data_manutencao} onChange={(e) => setForm((f) => ({ ...f, data_manutencao: e.target.value }))} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><DollarSign className="h-4 w-4 text-slate-400" /> Custo (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.custo} onChange={(e) => setForm((f) => ({ ...f, custo: e.target.value }))} placeholder="0.00" className={inputClass} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Descricao</label>
                <textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={3} placeholder="Descreva a manutencao realizada..." className={`${inputClass} resize-none`} />
              </div>
              <div className="flex gap-3">
                <Button type="submit" size="lg"><Wrench className="h-5 w-5" /> Registrar</Button>
                <Button type="button" variant="outline" size="lg" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="animate-fade-in-up" style={{ animationDelay: '80ms' }}>
        <CardHeader className="border-b border-slate-100"><CardTitle className="flex items-center gap-2 text-lg"><History className="h-5 w-5 text-selfit-500" /> Registros ({filteredManutencoes.length})</CardTitle></CardHeader>
        <CardContent className="pt-6">
          {filteredManutencoes.length === 0 ? (
            <div className="py-12 text-center"><Wrench className="mx-auto mb-3 h-10 w-10 text-slate-300" /><p className="text-sm text-slate-400">Nenhuma manutencao registrada.</p></div>
          ) : (
            <div className="space-y-3">
              {filteredManutencoes.map((m) => {
                const eq = m.equipamentos;
                return (
                  <div key={m.id} className="flex items-start gap-4 rounded-xl border border-slate-100 p-4 transition-colors hover:bg-slate-50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Wrench className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{eq?.nome ?? 'Item removido'}</p>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${tipoColors[m.tipo] ?? tipoColors.outros}`}>{tipoLabels[m.tipo] ?? m.tipo}</span>
                      </div>
                      {eq && <p className="text-xs text-slate-500">{categoriaLabels[eq.categoria]} - {eq.unidades?.nome ?? '-'} <MapPin className="ml-1 inline h-3 w-3" /> {eq.unidades?.regioes?.sigla ?? eq.unidades?.uf ?? '-'}</p>}
                      {m.descricao && <p className="mt-1 text-sm text-slate-600">{m.descricao}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(m.data_manutencao).toLocaleDateString('pt-BR')}</span>
                        {m.responsavel && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {m.responsavel}</span>}
                        {m.custo != null && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> R$ {m.custo.toFixed(2)}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(m.id)} className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
