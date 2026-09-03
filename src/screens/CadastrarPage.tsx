import { useEffect, useState } from 'react';
import { PlusCircle, Tv, MapPin, Building, Monitor, Loader2, CheckCircle2, Calendar, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase, type Regiao, type Unidade, logHistorico } from '@/lib/supabase';

const statusOptions = [
  { v: 'ativo', l: 'Ativa', c: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { v: 'manutencao', l: 'Manutencao', c: 'border-selfit-300 bg-selfit-50 text-selfit-700' },
  { v: 'outros', l: 'Outros', c: 'border-amber-300 bg-amber-50 text-amber-700' },
];

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 transition-all focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20 disabled:cursor-not-allowed disabled:opacity-50';

export function CadastrarPage() {
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [form, setForm] = useState({ unidade_id: '', regiao_id: '', modelo: '', marca: '', data_garantia: '', status: 'ativo', obs: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextNumber, setNextNumber] = useState('TV-01');

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

  useEffect(() => {
    if (!form.unidade_id) {
      setNextNumber('TV-01');
      return;
    }
    (async () => {
      const { count } = await supabase
        .from('equipamentos')
        .select('*', { count: 'exact', head: true })
        .eq('unidade_id', form.unidade_id)
        .eq('categoria', 'TV');
      setNextNumber(`TV-${String((count ?? 0) + 1).padStart(2, '0')}`);
    })();
  }, [form.unidade_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.unidade_id) return;
    const unidade = unidades.find((u) => u.id === form.unidade_id);
    const regiao = regioes.find((r) => r.id === form.regiao_id);

    const { error: insertError } = await supabase.from('equipamentos').insert({
      unidade_id: form.unidade_id,
      categoria: 'TV',
      nome: nextNumber,
      marca: form.marca || null,
      modelo: form.modelo || null,
      data_garantia: form.data_garantia || null,
      status: form.status,
      observacoes: form.obs || null,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    await logHistorico({
      acao: 'Nova TV cadastrada',
      tv_codigo: nextNumber,
      unidade_nome: unidade?.nome ?? null,
      regiao_sigla: regiao?.sigla ?? null,
      detalhe: `${nextNumber} cadastrada na unidade ${unidade?.nome ?? '-'} (${regiao?.sigla ?? '-'})`,
    });

    setSubmitted(true);
    setForm({ unidade_id: '', regiao_id: '', modelo: '', marca: '', data_garantia: '', status: 'ativo', obs: '' });
    setNextNumber('TV-01');
    setTimeout(() => setSubmitted(false), 4000);
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-selfit-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><PlusCircle className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Cadastrar Nova TV</h1>
          <p className="text-sm text-slate-500">Registre uma TV ou display no inventario</p>
        </div>
      </div>

      {submitted && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="font-medium">TV cadastrada com sucesso e registrada no historico.</p>
        </div>
      )}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 animate-fade-in"><p className="font-medium">{error}</p></div>}

      <Card className="animate-fade-in-up border-black" style={{ animationDelay: '80ms' }}>
        <CardHeader className="border-b border-slate-100"><CardTitle className="text-lg">Dados da TV</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Identificacao automatica" icon={Tv}>
                <input value={nextNumber} readOnly className={`${inputClass} cursor-not-allowed font-bold text-slate-700`} />
              </Field>
              <Field label="Regiao" icon={MapPin}>
                <select required value={form.regiao_id} onChange={(e) => update('regiao_id', e.target.value)} className={inputClass}>
                  <option value="">Selecione a regiao...</option>
                  {regioes.map((r) => <option key={r.id} value={r.id}>{r.sigla} - {r.nome}</option>)}
                </select>
              </Field>
              <Field label="Unidade" icon={Building}>
                <select required value={form.unidade_id} onChange={(e) => update('unidade_id', e.target.value)} className={inputClass} disabled={!form.regiao_id}>
                  <option value="">{form.regiao_id ? 'Selecione a unidade...' : 'Escolha uma regiao primeiro'}</option>
                  {filteredUnidades.map((u) => <option key={u.id} value={u.id}>{u.nome}{u.cidade ? ` - ${u.cidade}` : ''}</option>)}
                </select>
              </Field>
              <Field label="Marca" icon={FileText}>
                <input value={form.marca} onChange={(e) => update('marca', e.target.value)} placeholder="Ex: Samsung" className={inputClass} />
              </Field>
              <Field label="Modelo" icon={Monitor}>
                <input value={form.modelo} onChange={(e) => update('modelo', e.target.value)} placeholder='Ex: Smart TV 55"' className={inputClass} />
              </Field>
              <Field label="Data de Garantia" icon={Calendar}>
                <input type="date" value={form.data_garantia} onChange={(e) => update('data_garantia', e.target.value)} className={inputClass} />
              </Field>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Status inicial</label>
              <div className="flex flex-wrap gap-3">
                {statusOptions.map((s) => (
                  <button key={s.v} type="button" onClick={() => update('status', s.v)}
                    className={`rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${form.status === s.v ? `${s.c} ring-2 ring-current ring-offset-1` : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                    {s.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Observacoes</label>
              <textarea value={form.obs} onChange={(e) => update('obs', e.target.value)} rows={3} placeholder="Notas sobre localizacao, troca, defeito ou instalacao..." className={`${inputClass} resize-none`} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" className="flex-1 sm:flex-none"><PlusCircle className="h-5 w-5" /> Cadastrar TV</Button>
              <Button type="button" variant="outline" size="lg" onClick={() => { setForm({ unidade_id: '', regiao_id: '', modelo: '', marca: '', data_garantia: '', status: 'ativo', obs: '' }); setNextNumber('TV-01'); }}>Limpar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof Tv; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Icon className="h-4 w-4 text-slate-400" /> {label}
      </label>
      {children}
    </div>
  );
}
