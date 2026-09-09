import { useMemo, useState } from 'react';
import { Calendar, DollarSign, History, MapPin, Plus, Trash2, User, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useInventory } from '@/providers/InventoryProvider';
import { categoriaLabels, moduleLabels, type Equipamento, type Manutencao } from '@/services/inventory/inventoryTypes';
import { useModulo } from '@/providers/ModuloProvider';

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
  const { modulo } = useModulo();
  const { regioes, getUnidade, getEquipamentosByModulo, cameras, manutencoes, addManutencao, deleteManutencao } = useInventory();
  const [showForm, setShowForm] = useState(false);
  const [regiaoFilter, setRegiaoFilter] = useState('all');
  const [form, setForm] = useState({ equipamento_id: '', tipo: 'reparo', descricao: '', responsavel: '', data_manutencao: '', custo: '' });

  const equipamentos = useMemo(() => {
    if (modulo === 'cameras') {
      return cameras.map((camera): Equipamento => ({
        id: camera.id,
        nome: camera.nome,
        categoria: 'TV',
        unidade_id: camera.unidade_id,
        status: camera.status === 'ativa' ? 'ativo' : camera.status === 'manutencao' ? 'manutencao' : 'inativo',
        marca: camera.marca,
        modelo: camera.modelo,
      }));
    }

    return getEquipamentosByModulo(modulo);
  }, [cameras, getEquipamentosByModulo, modulo]);

  const filteredEquipamentos = useMemo(() => (
    regiaoFilter === 'all'
      ? equipamentos
      : equipamentos.filter((item) => {
          const unidade = item.unidade_id ? getUnidade(item.unidade_id) : undefined;
          return unidade?.regioes?.sigla === regiaoFilter || unidade?.uf === regiaoFilter;
        })
  ), [equipamentos, getUnidade, regiaoFilter]);

  const scopedManutencoes = useMemo(() => (
    manutencoes
      .filter((item) => item.modulo === modulo)
      .filter((item) => regiaoFilter === 'all' || (() => {
        const equipamento = equipamentos.find((eq) => eq.id === item.equipamento_id);
        const unidade = equipamento?.unidade_id ? getUnidade(equipamento.unidade_id) : undefined;
        return unidade?.regioes?.sigla === regiaoFilter || unidade?.uf === regiaoFilter;
      })())
  ), [equipamentos, getUnidade, manutencoes, modulo, regiaoFilter]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.equipamento_id) return;
    addManutencao({
      equipamento_id: form.equipamento_id,
      tipo: form.tipo as Manutencao['tipo'],
      descricao: form.descricao || null,
      responsavel: form.responsavel || null,
      data_manutencao: form.data_manutencao || new Date().toISOString().split('T')[0],
      custo: form.custo ? parseFloat(form.custo) : null,
      modulo,
    });
    setForm({ equipamento_id: '', tipo: 'reparo', descricao: '', responsavel: '', data_manutencao: '', custo: '' });
    setShowForm(false);
  };

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
          <select value={regiaoFilter} onChange={(event) => setRegiaoFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-selfit-500 focus:outline-none">
            <option value="all">Todas regioes</option>
            {regioes.map((regiao) => <option key={regiao.id} value={regiao.sigla}>{regiao.sigla}</option>)}
          </select>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> Registrar</Button>
        </div>
      </div>

      {showForm && (
        <Card className="animate-fade-in-up border-black p-6">
          <CardHeader className="px-0 pt-0"><CardTitle className="text-lg">Nova Manutencao</CardTitle></CardHeader>
          <CardContent className="px-0 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Wrench className="h-4 w-4 text-slate-400" /> {labels.item}</label>
                  <select required value={form.equipamento_id} onChange={(event) => setForm((current) => ({ ...current, equipamento_id: event.target.value }))} className={inputClass}>
                    <option value="">Selecione...</option>
                    {filteredEquipamentos.map((item) => {
                      const unidade = item.unidade_id ? getUnidade(item.unidade_id) : undefined;
                      return <option key={item.id} value={item.id}>{item.nome} - {modulo === 'cameras' ? 'Camera' : categoriaLabels[item.categoria]} ({unidade?.nome ?? '-'})</option>;
                    })}
                  </select>
                </div>
                <Field label="Tipo" icon={Wrench}>
                  <select value={form.tipo} onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value }))} className={inputClass}>
                    {Object.entries(tipoLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="Responsavel" icon={User}>
                  <input value={form.responsavel} onChange={(event) => setForm((current) => ({ ...current, responsavel: event.target.value }))} placeholder="Ex: Joao Silva" className={inputClass} />
                </Field>
                <Field label="Data" icon={Calendar}>
                  <input type="date" value={form.data_manutencao} onChange={(event) => setForm((current) => ({ ...current, data_manutencao: event.target.value }))} className={inputClass} />
                </Field>
                <Field label="Custo (R$)" icon={DollarSign}>
                  <input type="number" step="0.01" min="0" value={form.custo} onChange={(event) => setForm((current) => ({ ...current, custo: event.target.value }))} placeholder="0.00" className={inputClass} />
                </Field>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Descricao</label>
                <textarea value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} rows={3} placeholder="Descreva a manutencao realizada..." className={`${inputClass} resize-none`} />
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
        <CardHeader className="border-b border-slate-100"><CardTitle className="flex items-center gap-2 text-lg"><History className="h-5 w-5 text-selfit-500" /> Registros ({scopedManutencoes.length})</CardTitle></CardHeader>
        <CardContent className="pt-6">
          {scopedManutencoes.length === 0 ? (
            <div className="py-12 text-center"><Wrench className="mx-auto mb-3 h-10 w-10 text-slate-300" /><p className="text-sm text-slate-400">Nenhuma manutencao registrada neste modulo.</p></div>
          ) : (
            <div className="space-y-3">
              {scopedManutencoes.map((manutencao) => {
                const item = equipamentos.find((eq) => eq.id === manutencao.equipamento_id);
                const unidade = item?.unidade_id ? getUnidade(item.unidade_id) : undefined;
                return (
                  <div key={manutencao.id} className="flex items-start gap-4 rounded-xl border border-slate-100 p-4 transition-colors hover:bg-slate-50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Wrench className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{item?.nome ?? 'Item removido'}</p>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${tipoColors[manutencao.tipo] ?? tipoColors.outros}`}>{tipoLabels[manutencao.tipo] ?? manutencao.tipo}</span>
                      </div>
                      {item && <p className="text-xs text-slate-500">{modulo === 'cameras' ? 'Camera' : categoriaLabels[item.categoria]} - {unidade?.nome ?? '-'} <MapPin className="ml-1 inline h-3 w-3" /> {unidade?.regioes?.sigla ?? unidade?.uf ?? '-'}</p>}
                      {manutencao.descricao && <p className="mt-1 text-sm text-slate-600">{manutencao.descricao}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(manutencao.data_manutencao).toLocaleDateString('pt-BR')}</span>
                        {manutencao.responsavel && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {manutencao.responsavel}</span>}
                        {manutencao.custo != null && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> R$ {manutencao.custo.toFixed(2)}</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteManutencao(manutencao.id)} className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
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

function Field({ label, icon: Icon, children }: { label: string; icon: typeof Wrench; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon className="h-4 w-4 text-slate-400" /> {label}</label>
      {children}
    </div>
  );
}
