import { useState } from 'react';
import { Building, Calendar, CheckCircle2, FileText, Hash, MapPin, Monitor, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useInventory } from '@/providers/InventoryProvider';
import { buildTvName } from '@/services/inventory/inventoryLogic';

const statusOptions = [
  { v: 'ativo', l: 'Ativa', c: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { v: 'manutencao', l: 'Manutencao', c: 'border-selfit-300 bg-selfit-50 text-selfit-700' },
  { v: 'outros', l: 'Outros', c: 'border-amber-300 bg-amber-50 text-amber-700' },
] as const;

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 transition-all focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20 disabled:cursor-not-allowed disabled:opacity-50';

const initialForm = {
  unidade_id: '',
  regiao_id: '',
  eletromidia_id: '',
  modelo: '',
  marca: '',
  data_garantia: '',
  status: 'ativo',
  obs: '',
};

export function CadastrarPage() {
  const { regioes, getUnidadesComRegiao, addEquipamento, nextTvNumber } = useInventory();
  const unidades = getUnidadesComRegiao();
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);

  const filteredUnidades = form.regiao_id ? unidades.filter((unidade) => unidade.regiao_id === form.regiao_id) : [];
  const showObs = form.status === 'manutencao' || form.status === 'outros';
  const nextNumber = nextTvNumber();

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'regiao_id' ? { unidade_id: '' } : {}),
      ...(key === 'status' && value === 'ativo' ? { obs: '' } : {}),
    }));
    setSubmitted(false);
  };

  const reset = () => {
    setForm(initialForm);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.unidade_id) return;

    const unidade = unidades.find((item) => item.id === form.unidade_id);
    const tvName = buildTvName(unidade?.nome ?? '', nextNumber);

    addEquipamento({
      unidade_id: form.unidade_id,
      categoria: 'TV',
      nome: tvName,
      eletromidia_id: form.eletromidia_id,
      marca: form.marca,
      modelo: form.modelo,
      data_garantia: form.data_garantia,
      status: form.status as 'ativo' | 'manutencao' | 'outros',
      observacoes: showObs ? form.obs : '',
    }, 'tvs');

    setSubmitted(true);
    reset();
    window.setTimeout(() => setSubmitted(false), 4000);
  };

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
          <p className="font-medium">TV cadastrada com sucesso.</p>
        </div>
      )}

      <Card className="animate-fade-in-up border-black" style={{ animationDelay: '80ms' }}>
        <CardHeader className="border-b border-slate-100"><CardTitle className="text-lg">Dados da TV</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Estado" icon={MapPin}>
                <select required value={form.regiao_id} onChange={(event) => update('regiao_id', event.target.value)} className={inputClass}>
                  <option value="">Selecione o estado...</option>
                  {regioes.map((regiao) => <option key={regiao.id} value={regiao.id}>{regiao.sigla} - {regiao.nome}</option>)}
                </select>
              </Field>
              <Field label="Unidade" icon={Building}>
                <div className="flex gap-2">
                  <select required value={form.unidade_id} onChange={(event) => update('unidade_id', event.target.value)} className={inputClass} disabled={!form.regiao_id}>
                    <option value="">{form.regiao_id ? 'Selecione a unidade...' : 'Escolha um estado primeiro'}</option>
                    {filteredUnidades.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome}{unidade.cidade ? ` - ${unidade.cidade}` : ''}</option>)}
                  </select>
                  <input value={nextNumber} readOnly title="Numero da TV" className={`${inputClass} !w-20 shrink-0 cursor-not-allowed px-3 text-center font-bold text-slate-700`} />
                </div>
              </Field>
              <Field label="ID Eletromidia" icon={Hash}>
                <input value={form.eletromidia_id} onChange={(event) => update('eletromidia_id', event.target.value)} placeholder="Ex: ELM-000123" className={inputClass} />
              </Field>
              <Field label="Marca" icon={FileText}>
                <input value={form.marca} onChange={(event) => update('marca', event.target.value)} placeholder="Ex: Samsung" className={inputClass} />
              </Field>
              <Field label="Modelo" icon={Monitor}>
                <input value={form.modelo} onChange={(event) => update('modelo', event.target.value)} placeholder='Ex: Smart TV 55"' className={inputClass} />
              </Field>
              <Field label="Data de Garantia" icon={Calendar}>
                <input type="date" value={form.data_garantia} onChange={(event) => update('data_garantia', event.target.value)} className={inputClass} />
              </Field>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Status inicial</label>
              <div className="flex flex-wrap gap-3">
                {statusOptions.map((status) => (
                  <button
                    key={status.v}
                    type="button"
                    onClick={() => update('status', status.v)}
                    className={`rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${form.status === status.v ? `${status.c} ring-2 ring-current ring-offset-1` : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                  >
                    {status.l}
                  </button>
                ))}
              </div>
            </div>

            {showObs && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Observacoes</label>
                <textarea value={form.obs} onChange={(event) => update('obs', event.target.value)} rows={3} placeholder="Descreva o motivo de manutencao ou outros." className={`${inputClass} resize-none`} />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" className="flex-1 sm:flex-none"><PlusCircle className="h-5 w-5" /> Cadastrar TV</Button>
              <Button type="button" variant="outline" size="lg" onClick={reset}>Limpar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof PlusCircle; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Icon className="h-4 w-4 text-slate-400" /> {label}
      </label>
      {children}
    </div>
  );
}
