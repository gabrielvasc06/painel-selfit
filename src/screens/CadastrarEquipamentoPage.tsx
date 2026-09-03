import { useEffect, useState } from 'react';
import { Cpu, MapPin, Building2, Tag, Monitor, Hash, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase, type Regiao, type Unidade, type EquipamentoCategoria, categoriaLabels, logHistorico, tiCategorias } from '@/lib/supabase';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 transition-all focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20';

export function CadastrarEquipamentoPage() {
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [form, setForm] = useState({
    unidade_id: '', regiao_id: '', categoria: '' as EquipamentoCategoria | '',
    nome: '', asset_tag: '', marca: '', modelo: '', numero_serie: '',
    data_garantia: '', posicao: '', obs: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: regs }, { data: unids }] = await Promise.all([
        supabase.from('regioes').select('*').order('sigla'),
        supabase.from('unidades').select('*').order('nome'),
      ]);
      setRegioes((regs as Regiao[]) ?? []);
      setUnidades((unids as Unidade[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filteredUnidades = form.regiao_id ? unidades.filter((u) => u.regiao_id === form.regiao_id) : unidades;

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value, ...(key === 'regiao_id' ? { unidade_id: '' } : {}) }));
    setSubmitted(false);
    setError('');
  };

  const resetForm = () => setForm({ unidade_id: '', regiao_id: '', categoria: '', nome: '', asset_tag: '', marca: '', modelo: '', numero_serie: '', data_garantia: '', posicao: '', obs: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.unidade_id || !form.categoria || !form.nome) return;
    const unidade = unidades.find((u) => u.id === form.unidade_id);
    const regiao = regioes.find((r) => r.id === form.regiao_id);
    const { error: insertError } = await supabase.from('equipamentos').insert({
      unidade_id: form.unidade_id,
      categoria: form.categoria,
      nome: form.nome,
      asset_tag: form.asset_tag || null,
      marca: form.marca || null,
      modelo: form.modelo || null,
      numero_serie: form.numero_serie || null,
      data_garantia: form.data_garantia || null,
      posicao: form.posicao || null,
      posicao_rack_u: null,
      observacoes: form.obs || null,
    });
    if (insertError) { setError(insertError.message); return; }
    await logHistorico({
      acao: 'Novo equipamento de TI cadastrado',
      detalhe: `${categoriaLabels[form.categoria]} "${form.nome}" cadastrado em ${unidade?.nome ?? '-'} (${regiao?.sigla ?? '-'})`,
      unidade_nome: unidade?.nome ?? null,
      regiao_sigla: regiao?.sigla ?? null,
    });
    setSubmitted(true);
    resetForm();
    setTimeout(() => setSubmitted(false), 4000);
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-selfit-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><Cpu className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Cadastrar Equipamento</h1>
          <p className="text-sm text-slate-500">Registre computadores, totens, catracas, impressoras e perifericos</p>
        </div>
      </div>

      {submitted && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0" /><p className="font-medium">Equipamento cadastrado com sucesso.</p>
        </div>
      )}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 animate-fade-in"><p className="font-medium">{error}</p></div>}

      <Card className="animate-fade-in-up border-black" style={{ animationDelay: '80ms' }}>
        <CardHeader className="border-b border-slate-100"><CardTitle className="text-lg">Dados do Equipamento</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Categoria do Equipamento</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {tiCategorias.map((cat) => (
                  <button key={cat} type="button" onClick={() => update('categoria', cat)}
                    className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${form.categoria === cat ? 'border-selfit-500 bg-selfit-50 text-selfit-700 ring-2 ring-selfit-500/20' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                    {categoriaLabels[cat]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Regiao" icon={MapPin}>
                <select required value={form.regiao_id} onChange={(e) => update('regiao_id', e.target.value)} className={inputClass}>
                  <option value="">Selecione...</option>
                  {regioes.map((r) => <option key={r.id} value={r.id}>{r.sigla} - {r.nome}</option>)}
                </select>
              </Field>
              <Field label="Unidade" icon={Building2}>
                <select required value={form.unidade_id} onChange={(e) => update('unidade_id', e.target.value)} className={inputClass} disabled={!form.regiao_id}>
                  <option value="">{form.regiao_id ? 'Selecione...' : 'Escolha regiao'}</option>
                  {filteredUnidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </Field>
              <Field label="Nome / Identificacao" icon={Tag}>
                <input required value={form.nome} onChange={(e) => update('nome', e.target.value)} placeholder="Ex: Catraca Entrada 01" className={inputClass} />
              </Field>
              <Field label="ID / Asset Tag" icon={Hash}>
                <input value={form.asset_tag} onChange={(e) => update('asset_tag', e.target.value)} placeholder="Ex: AST-00123" className={inputClass} />
              </Field>
              <Field label="Marca" icon={Tag}>
                <input value={form.marca} onChange={(e) => update('marca', e.target.value)} placeholder="Ex: Dell" className={inputClass} />
              </Field>
              <Field label="Modelo" icon={Monitor}>
                <input value={form.modelo} onChange={(e) => update('modelo', e.target.value)} placeholder="Ex: OptiPlex" className={inputClass} />
              </Field>
              <Field label="Numero de Serie" icon={Hash}>
                <input value={form.numero_serie} onChange={(e) => update('numero_serie', e.target.value)} placeholder="Ex: SN12345" className={inputClass} />
              </Field>
              <Field label="Data de Garantia" icon={Calendar}>
                <input type="date" value={form.data_garantia} onChange={(e) => update('data_garantia', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Posicao / Localizacao na academia" icon={MapPin}>
                <input value={form.posicao} onChange={(e) => update('posicao', e.target.value)} placeholder="Ex: Recepcao, sala tecnica" className={inputClass} />
              </Field>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Observacoes</label>
              <textarea value={form.obs} onChange={(e) => update('obs', e.target.value)} rows={2} placeholder="Notas adicionais..." className={`${inputClass} resize-none`} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" className="flex-1 sm:flex-none"><Cpu className="h-5 w-5" /> Cadastrar Equipamento</Button>
              <Button type="button" variant="outline" size="lg" onClick={resetForm}>Limpar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof Cpu; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon className="h-4 w-4 text-slate-400" /> {label}</label>
      {children}
    </div>
  );
}
