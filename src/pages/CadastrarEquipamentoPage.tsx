import { useState } from 'react';
import { Building2, Calendar, CheckCircle2, Cpu, Hash, MapPin, Monitor, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useInventory } from '@/providers/InventoryProvider';
import { categoriaLabels, statusEquipLabels, tiCategorias, type EquipamentoCategoria, type EquipamentoStatus } from '@/services/inventory/inventoryTypes';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 transition-all focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20 disabled:cursor-not-allowed disabled:opacity-50';

export function CadastrarEquipamentoPage() {
  const { regioes, getUnidadesComRegiao, addEquipamento } = useInventory();
  const unidades = getUnidadesComRegiao();
  const [form, setForm] = useState({
    unidade_id: '',
    regiao_id: '',
    categoria: '' as EquipamentoCategoria | '',
    nome: '',
    asset_tag: '',
    marca: '',
    modelo: '',
    data_garantia: '',
    status: 'ativo' as EquipamentoStatus,
    obs: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const filteredUnidades = form.regiao_id ? unidades.filter((unidade) => unidade.regiao_id === form.regiao_id) : [];
  const showAssetTag = form.categoria === 'tv_box';

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'regiao_id' ? { unidade_id: '' } : {}),
      ...(key === 'categoria' && value !== 'tv_box' ? { asset_tag: '' } : {}),
    }));
    setSubmitted(false);
  };

  const resetForm = () => {
    setForm({ unidade_id: '', regiao_id: '', categoria: '', nome: '', asset_tag: '', marca: '', modelo: '', data_garantia: '', status: 'ativo', obs: '' });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.unidade_id || !form.categoria || !form.nome) return;

    addEquipamento({
      unidade_id: form.unidade_id,
      categoria: form.categoria,
      nome: form.nome,
      asset_tag: form.asset_tag,
      marca: form.marca,
      modelo: form.modelo,
      data_garantia: form.data_garantia,
      status: form.status,
      observacoes: form.obs,
    }, 'equipamentos');

    setSubmitted(true);
    resetForm();
    window.setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><Cpu className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Cadastrar Equipamento</h1>
          <p className="text-sm text-slate-500">Registre notebooks, totens, catracas, leitores e rede</p>
        </div>
      </div>

      {submitted && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="font-medium">Equipamento cadastrado com sucesso.</p>
        </div>
      )}

      <Card className="animate-fade-in-up border-black" style={{ animationDelay: '80ms' }}>
        <CardHeader className="border-b border-slate-100"><CardTitle className="text-lg">Dados do Equipamento</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Categoria do Equipamento</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {tiCategorias.map((categoria) => (
                  <button
                    key={categoria}
                    type="button"
                    onClick={() => update('categoria', categoria)}
                    className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${form.categoria === categoria ? 'border-selfit-500 bg-selfit-50 text-selfit-700 ring-2 ring-selfit-500/20' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                  >
                    {categoriaLabels[categoria]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Estado" icon={MapPin}>
                <select required value={form.regiao_id} onChange={(event) => update('regiao_id', event.target.value)} className={inputClass}>
                  <option value="">Selecione...</option>
                  {regioes.map((regiao) => <option key={regiao.id} value={regiao.id}>{regiao.sigla} - {regiao.nome}</option>)}
                </select>
              </Field>
              <Field label="Unidade" icon={Building2}>
                <select required value={form.unidade_id} onChange={(event) => update('unidade_id', event.target.value)} className={inputClass} disabled={!form.regiao_id}>
                  <option value="">{form.regiao_id ? 'Selecione...' : 'Escolha um estado'}</option>
                  {filteredUnidades.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>)}
                </select>
              </Field>
              <Field label="Nome / Identificacao" icon={Tag}>
                <input required value={form.nome} onChange={(event) => update('nome', event.target.value)} placeholder="Ex: Catraca Entrada 01" className={inputClass} />
              </Field>
              {showAssetTag && (
                <Field label="ID / Asset Tag" icon={Hash}>
                  <input value={form.asset_tag} onChange={(event) => update('asset_tag', event.target.value)} placeholder="Ex: AST-00123" className={inputClass} />
                </Field>
              )}
              <Field label="Marca" icon={Tag}>
                <input value={form.marca} onChange={(event) => update('marca', event.target.value)} placeholder="Ex: Dell" className={inputClass} />
              </Field>
              <Field label="Modelo" icon={Monitor}>
                <input value={form.modelo} onChange={(event) => update('modelo', event.target.value)} placeholder="Ex: Latitude" className={inputClass} />
              </Field>
              <Field label="Data de Garantia" icon={Calendar}>
                <input type="date" value={form.data_garantia} onChange={(event) => update('data_garantia', event.target.value)} className={inputClass} />
              </Field>
              <Field label="Status" icon={Cpu}>
                <select value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
                  {Object.entries(statusEquipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Observacoes</label>
              <textarea value={form.obs} onChange={(event) => update('obs', event.target.value)} rows={2} placeholder="Notas adicionais..." className={`${inputClass} resize-none`} />
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
