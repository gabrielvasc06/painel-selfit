import { useState } from 'react';
import { Building2, Camera, CheckCircle2, Hash, MapPin, Network, Tag, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useInventory } from '@/contexts/InventoryContext';
import { statusCameraLabels, tipoCameraLabels, type Camera as CameraType } from '@/lib/inventoryTypes';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 transition-all focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20 disabled:cursor-not-allowed disabled:opacity-50';

export function CadastrarCameraPage() {
  const { regioes, getUnidadesComRegiao, addCamera } = useInventory();
  const unidades = getUnidadesComRegiao();
  const [form, setForm] = useState({
    regiao_id: '',
    unidade_id: '',
    nome: '',
    tipo: 'ip' as CameraType['tipo'],
    setor: '',
    ip_address: '',
    canal_dvr: '',
    marca: '',
    modelo: '',
    status: 'ativa' as CameraType['status'],
  });
  const [submitted, setSubmitted] = useState(false);

  const filteredUnidades = form.regiao_id ? unidades.filter((unidade) => unidade.regiao_id === form.regiao_id) : [];

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value, ...(key === 'regiao_id' ? { unidade_id: '' } : {}) }));
    setSubmitted(false);
  };

  const reset = () => {
    setForm({ regiao_id: '', unidade_id: '', nome: '', tipo: 'ip', setor: '', ip_address: '', canal_dvr: '', marca: '', modelo: '', status: 'ativa' });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.unidade_id || !form.nome) return;

    addCamera({
      unidade_id: form.unidade_id,
      nome: form.nome,
      tipo: form.tipo,
      setor: form.setor,
      ip_address: form.ip_address.trim() || null,
      canal_dvr: form.canal_dvr ? Number(form.canal_dvr) : null,
      marca: form.marca,
      modelo: form.modelo,
      status: form.status,
    });

    setSubmitted(true);
    reset();
    window.setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><Camera className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Cadastrar Camera</h1>
          <p className="text-sm text-slate-500">Registre cameras, IPs, canais e status do CFTV</p>
        </div>
      </div>

      {submitted && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="font-medium">Camera cadastrada com sucesso.</p>
        </div>
      )}

      <Card className="animate-fade-in-up border-black" style={{ animationDelay: '80ms' }}>
        <CardHeader className="border-b border-slate-100"><CardTitle className="text-lg">Dados da Camera</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <Field label="Nome / Identificacao" icon={Video}>
                <input required value={form.nome} onChange={(event) => update('nome', event.target.value)} placeholder="Ex: CAM-01 - Entrada" className={inputClass} />
              </Field>
              <Field label="Tipo" icon={Camera}>
                <select value={form.tipo} onChange={(event) => update('tipo', event.target.value)} className={inputClass}>
                  {Object.entries(tipoCameraLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Setor" icon={MapPin}>
                <input value={form.setor} onChange={(event) => update('setor', event.target.value)} placeholder="Ex: Recepcao" className={inputClass} />
              </Field>
              <Field label="Endereco IP (opcional)" icon={Network}>
                <input value={form.ip_address} onChange={(event) => update('ip_address', event.target.value)} placeholder="Opcional: 192.168.1.100" className={`${inputClass} font-mono`} />
              </Field>
              <Field label="Canal DVR (opcional)" icon={Hash}>
                <input type="number" min="1" value={form.canal_dvr} onChange={(event) => update('canal_dvr', event.target.value)} placeholder="Opcional: 4" className={inputClass} />
              </Field>
              <Field label="Status" icon={Camera}>
                <select value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
                  {Object.entries(statusCameraLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Marca" icon={Tag}>
                <input value={form.marca} onChange={(event) => update('marca', event.target.value)} placeholder="Ex: Intelbras" className={inputClass} />
              </Field>
              <Field label="Modelo" icon={Tag}>
                <input value={form.modelo} onChange={(event) => update('modelo', event.target.value)} placeholder="Ex: VIP 1130 B" className={inputClass} />
              </Field>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" className="flex-1 sm:flex-none"><Camera className="h-5 w-5" /> Cadastrar Camera</Button>
              <Button type="button" variant="outline" size="lg" onClick={reset}>Limpar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof Camera; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon className="h-4 w-4 text-slate-400" /> {label}</label>
      {children}
    </div>
  );
}
