import { useEffect, useRef, useState } from 'react';
import { Building2, MapPin, FileText, Loader2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase, type Regiao, type Unidade, logHistorico } from '@/lib/supabase';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 transition-all focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20';

export function CadastrarUnidadePage() {
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [unidades, setUnidades] = useState<(Unidade & { regioes?: Regiao })[]>([]);
  const [form, setForm] = useState({ nome: '', regiao_id: '', cidade: '', cnpj: '', logradouro: '', numero: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: regs }, { data: unids }] = await Promise.all([
        supabase.from('regioes').select('*').order('sigla'),
        supabase.from('unidades').select('*, regioes(*)').order('nome'),
      ]);
      setRegioes((regs as Regiao[]) ?? []);
      setUnidades((unids as (Unidade & { regioes?: Regiao })[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSubmitted(false);
    setError('');
  };

  const resetForm = () => setForm({ nome: '', regiao_id: '', cidade: '', cnpj: '', logradouro: '', numero: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.nome || !form.regiao_id) return;
    const regiao = regioes.find((r) => r.id === form.regiao_id);
    const { data, error: insertError } = await supabase.from('unidades').insert({
      nome: form.nome,
      regiao_id: form.regiao_id,
      cidade: form.cidade || null,
      cnpj: form.cnpj || null,
      logradouro: form.logradouro || null,
      numero: form.numero || null,
      uf: regiao?.sigla ?? null,
    }).select('*, regioes(*)').single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await logHistorico({
      acao: 'Nova unidade cadastrada',
      detalhe: `Unidade ${form.nome} cadastrada em ${regiao?.sigla ?? '-'} (${form.cidade || '-'})`,
      unidade_nome: form.nome,
      regiao_sigla: regiao?.sigla ?? null,
    });
    if (data) setUnidades((prev) => [...prev, data as Unidade & { regioes?: Regiao }].sort((a, b) => a.nome.localeCompare(b.nome)));
    setSubmitted(true);
    resetForm();
    setTimeout(() => setSubmitted(false), 4000);
  };

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-selfit-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><Building2 className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Cadastrar Unidade</h1>
          <p className="text-sm text-slate-500">Cadastre uma nova unidade da Selfit</p>
        </div>
      </div>

      {submitted && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0" /><p className="font-medium">Unidade cadastrada com sucesso.</p>
        </div>
      )}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 animate-fade-in"><p className="font-medium">{error}</p></div>}

      <Card className="animate-fade-in-up border-black" style={{ animationDelay: '80ms' }}>
        <CardHeader className="border-b border-slate-100"><CardTitle className="text-lg">Dados da Unidade</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Nome da Unidade" icon={Building2}>
                <input required value={form.nome} onChange={(e) => update('nome', e.target.value)} placeholder="Ex: Boa Viagem" className={inputClass} />
              </Field>
              <Field label="Estado / Regiao" icon={MapPin}>
                <select required value={form.regiao_id} onChange={(e) => update('regiao_id', e.target.value)} className={inputClass}>
                  <option value="">Selecione o estado...</option>
                  {regioes.map((r) => <option key={r.id} value={r.id}>{r.sigla} - {r.nome}</option>)}
                </select>
              </Field>
              <Field label="Cidade" icon={MapPin}>
                <input value={form.cidade} onChange={(e) => update('cidade', e.target.value)} placeholder="Ex: Recife" className={inputClass} />
              </Field>
              <Field label="CNPJ" icon={FileText}>
                <input value={form.cnpj} onChange={(e) => update('cnpj', e.target.value)} placeholder="00.000.000/0000-00" className={inputClass} />
              </Field>
              <Field label="Rua / Logradouro" icon={MapPin}>
                <input value={form.logradouro} onChange={(e) => update('logradouro', e.target.value)} placeholder="Ex: Av. Boa Viagem" className={inputClass} />
              </Field>
              <Field label="Numero" icon={FileText}>
                <input value={form.numero} onChange={(e) => update('numero', e.target.value)} placeholder="Ex: 1234" className={inputClass} />
              </Field>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" className="flex-1 sm:flex-none"><Building2 className="h-5 w-5" /> Cadastrar Unidade</Button>
              <Button type="button" variant="outline" size="lg" onClick={resetForm}>Limpar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-slate-900">Regioes das Unidades</h2>
          <div className="flex gap-2">
            <button onClick={() => scroll('left')} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50" aria-label="Anterior"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={() => scroll('right')} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50" aria-label="Proxima"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin snap-x">
          {regioes.map((r) => {
            const count = unidades.filter((u) => u.regiao_id === r.id).length;
            return (
              <Card key={r.id} className="w-64 shrink-0 snap-center p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-3xl font-extrabold text-slate-900">{r.sigla}</p>
                    <p className="text-sm font-medium text-slate-500">{r.nome}</p>
                  </div>
                  <MapPin className="h-6 w-6 text-selfit-500" />
                </div>
                <p className="mt-4 text-sm text-slate-600"><strong>{count}</strong> {count === 1 ? 'unidade' : 'unidades'}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof Building2; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon className="h-4 w-4 text-slate-400" /> {label}</label>
      {children}
    </div>
  );
}
