// Arquivo: src/components/inventory/EquipmentRegistrationForm.tsx
// Serve para: formulario compartilhado para cadastrar TVs, equipamentos e cameras.

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ApiError, apiRequest, notifyInventoryUpdated, type ApiEnvelope } from '@/services/api';
import { dateBrToIso, maskDateBr } from '@/utils/date';

export type EquipmentField = {
  uf: string;
  unidade_nome: string;
  nome_identificacao: string;
  categoria: string;
  marca: string;
  status: string;
  data_garantia: string;
};

const emptyForm: EquipmentField = {
  uf: '',
  unidade_nome: '',
  nome_identificacao: '',
  categoria: '',
  marca: '',
  status: 'ATIVO',
  data_garantia: '',
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 transition-all focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20';

export function EquipmentRegistrationForm({
  title,
  category,
  categories,
  units,
}: {
  title: string;
  category?: string;
  categories?: { value: string; label: string }[];
  units: { nome: string; uf: string | null }[];
}) {
  const [form, setForm] = useState<EquipmentField>({ ...emptyForm, categoria: category ?? '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const states = [...new Set(units.map((unit) => unit.uf).filter((state): state is string => Boolean(state)))].sort();
  const availableUnits = units.filter((unit) => unit.uf === form.uf).sort((left, right) => left.nome.localeCompare(right.nome));

  const update = (key: keyof EquipmentField, value: string) => {
    const uppercase = key !== 'data_garantia';
    setForm((current) => ({
      ...current,
      [key]: uppercase ? value.toLocaleUpperCase('pt-BR') : value,
      ...(key === 'uf' ? { unidade_nome: '' } : {}),
    }));
    setSuccess('');
    setError('');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, key === 'data_garantia' ? value.trim() : value.trim().toLocaleUpperCase('pt-BR')]),
    ) as EquipmentField;
    if (!payload.uf || !payload.unidade_nome || !units.some((unit) => unit.uf === payload.uf && unit.nome === payload.unidade_nome)) {
      setError('Selecione um estado e uma unidade cadastrada nesse estado.');
      setSaving(false);
      return;
    }
    const dataGarantiaIso = dateBrToIso(payload.data_garantia);
    if (!dataGarantiaIso) {
      setError('Informe a data de garantia no formato DD/MM/AAAA.');
      setSaving(false);
      return;
    }
    const { uf, ...equipmentPayload } = payload;
    const apiPayload = { ...equipmentPayload, data_garantia: dataGarantiaIso, unidade_uf: uf };

    try {
      const result = await apiRequest<ApiEnvelope<never>>('/register/equipamentos', {
        method: 'POST',
        body: JSON.stringify(apiPayload),
      });
      if (result.sucesso === false) throw new ApiError(result.message ?? result.mensagem ?? 'A API recusou o cadastro.', 400);
      notifyInventoryUpdated();
      setSuccess(result.message ?? result.mensagem ?? 'Cadastro realizado com sucesso.');
      setForm({ ...emptyForm, categoria: category ?? '' });
    } catch (submitError) {
      setError((submitError as Error).message || 'Nao foi possivel cadastrar. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const field = (name: keyof EquipmentField, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block space-y-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <input
        required
        value={form[name]}
        onChange={(event) => update(name, event.target.value)}
        className={`${inputClass} uppercase`}
        {...props}
      />
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><Save className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">Campos conforme o cadastro do banco de dados</p>
        </div>
      </div>

      {success && <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700"><CheckCircle2 className="h-5 w-5 shrink-0" /><p className="font-medium">{success}</p></div>}
      {error && <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700"><AlertCircle className="h-5 w-5 shrink-0" /><p className="font-medium">{error}</p></div>}

      <Card className="animate-fade-in-up border-black" style={{ animationDelay: '80ms' }}>
        <CardHeader className="border-b border-slate-100"><CardTitle className="text-lg">Dados do Equipamento</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                <span>Estado / UF</span>
                <select required value={form.uf} onChange={(event) => update('uf', event.target.value)} className={inputClass}>
                  <option value="">Selecione o estado...</option>
                  {states.map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
              </label>
              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                <span>Unidade</span>
                <select required value={form.unidade_nome} onChange={(event) => update('unidade_nome', event.target.value)} disabled={!form.uf || availableUnits.length === 0} className={inputClass}>
                  <option value="">{!form.uf ? 'Selecione primeiro a UF' : availableUnits.length ? 'Selecione a unidade...' : 'Nenhuma unidade cadastrada nesta UF'}</option>
                  {availableUnits.map((unit) => <option key={`${unit.uf}-${unit.nome}`} value={unit.nome}>{unit.nome}</option>)}
                </select>
              </label>
              {field('nome_identificacao', 'Identificação', { placeholder: 'Ex.: BOA VIAGEM 1', maxLength: 100 })}
              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                <span>Categoria</span>
                {categories ? (
                  <select required value={form.categoria} onChange={(event) => update('categoria', event.target.value)} className={inputClass}>
                    <option value="">Selecione a categoria...</option>
                    {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                ) : <input required readOnly value={form.categoria} className={inputClass} />}
              </label>
              {field('marca', 'Marca', { maxLength: 50 })}
              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                <span>Status</span>
                <select required value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
                  <option value="ATIVO">ATIVO</option>
                  <option value="EM MANUTENCAO">EM MANUTENCAO</option>
                  <option value="INATIVO">INATIVO</option>
                </select>
              </label>
              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                <span>Data de garantia</span>
                <input required inputMode="numeric" maxLength={10} placeholder="DD/MM/AAAA" value={form.data_garantia} onChange={(event) => update('data_garantia', maskDateBr(event.target.value))} className={inputClass} />
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" disabled={saving} className="flex-1 sm:flex-none">
                {saving ? <><Loader2 className="h-5 w-5 animate-spin" /> Enviando...</> : <><Save className="h-5 w-5" /> Cadastrar</>}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={() => { setForm({ ...emptyForm, categoria: category ?? '' }); setError(''); setSuccess(''); }}>Limpar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
