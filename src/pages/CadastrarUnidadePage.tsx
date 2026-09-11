import { useRef, useState } from 'react';
import { Building2, CheckCircle2, FileSpreadsheet, FileText, Loader2, MapPin, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useInventory } from '@/providers/InventoryProvider';
import { parseUnidadesCsv, type UnidadeCsvPreview } from '@/services/inventory/inventoryLogic';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 transition-all focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20';

export function CadastrarUnidadePage() {
  const { regioes, addUnidade, addUnidades, addHistorico } = useInventory();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ nome: '', regiao_id: '', cidade: '', cnpj: '', logradouro: '', numero: '', bairro: '', cep: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<UnidadeCsvPreview[]>([]);
  const [imported, setImported] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSubmitted(false);
    setImported(false);
    setError('');
  };

  const resetForm = () => setForm({ nome: '', regiao_id: '', cidade: '', cnpj: '', logradouro: '', numero: '', bairro: '', cep: '' });

  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      setError('Informe um CEP com 8 digitos.');
      return;
    }

    setLoadingCep(true);
    setError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) throw new Error('CEP nao encontrado.');

      const regiao = regioes.find((item) => item.sigla === data.uf);
      setForm((current) => ({
        ...current,
        regiao_id: regiao?.id ?? current.regiao_id,
        cidade: data.localidade ?? current.cidade,
        logradouro: data.logradouro ?? current.logradouro,
        bairro: data.bairro ?? current.bairro,
        cep,
      }));
    } catch (err) {
      setError((err as Error).message || 'Nao foi possivel consultar o CEP.');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.nome || !form.regiao_id) return;

    const unidade = addUnidade(form);
    addHistorico({
      modulo: 'tvs',
      acao: 'Nova unidade cadastrada',
      detalhe: `Unidade ${unidade.nome} cadastrada em ${unidade.uf ?? '-'}`,
      unidade_nome: unidade.nome,
      regiao_sigla: unidade.uf,
      tv_codigo: null,
      usuario: 'admin',
    });

    setSubmitted(true);
    resetForm();
    window.setTimeout(() => setSubmitted(false), 4000);
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(parseUnidadesCsv(String(reader.result ?? '')));
      setImported(false);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const importPreview = () => {
    const validRows = preview.filter((row) => !row.erro);
    const inputs = validRows.map((row) => ({
      nome: row.nome,
      cidade: row.cidade,
      logradouro: row.logradouro,
      numero: row.numero,
      cep: row.cep,
      bairro: row.bairro,
      cnpj: row.cnpj,
      regiao_id: regioes.find((regiao) => regiao.sigla === row.estado)?.id ?? row.estado,
    })).filter((row) => regioes.some((regiao) => regiao.id === row.regiao_id));

    const created = addUnidades(inputs);
    if (created.length > 0) {
      addHistorico({
        modulo: 'tvs',
        acao: 'Importacao de unidades',
        detalhe: `${created.length} unidades importadas pela planilha`,
        unidade_nome: null,
        regiao_sigla: null,
        tv_codigo: null,
        usuario: 'admin',
      });
    }
    setImported(true);
    setPreview([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><Building2 className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Cadastrar Unidade</h1>
          <p className="text-sm text-slate-500">Cadastro manual, consulta CEP e importacao de planilha</p>
        </div>
      </div>

      {submitted && <SuccessMessage text="Unidade cadastrada com sucesso." />}
      {imported && <SuccessMessage text="Planilha importada com sucesso." />}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 animate-fade-in"><p className="font-medium">{error}</p></div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_26rem]">
        <Card className="animate-fade-in-up border-black" style={{ animationDelay: '80ms' }}>
          <CardHeader className="border-b border-slate-100"><CardTitle className="text-lg">Dados da Unidade</CardTitle></CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Nome da Unidade" icon={Building2}>
                  <input required value={form.nome} onChange={(event) => update('nome', event.target.value)} placeholder="Ex: Boa Viagem" className={inputClass} />
                </Field>
                <Field label="CEP" icon={MapPin}>
                  <div className="flex gap-2">
                    <input value={form.cep} onChange={(event) => update('cep', event.target.value)} placeholder="00000000" className={inputClass} />
                    <Button type="button" variant="outline" onClick={buscarCep} disabled={loadingCep}>
                      {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                    </Button>
                  </div>
                </Field>
                <Field label="Estado" icon={MapPin}>
                  <select required value={form.regiao_id} onChange={(event) => update('regiao_id', event.target.value)} className={inputClass}>
                    <option value="">Selecione o estado...</option>
                    {regioes.map((regiao) => <option key={regiao.id} value={regiao.id}>{regiao.sigla} - {regiao.nome}</option>)}
                  </select>
                </Field>
                <Field label="Cidade" icon={MapPin}>
                  <input value={form.cidade} onChange={(event) => update('cidade', event.target.value)} placeholder="Ex: Recife" className={inputClass} />
                </Field>
                <Field label="Rua / Logradouro" icon={MapPin}>
                  <input value={form.logradouro} onChange={(event) => update('logradouro', event.target.value)} placeholder="Ex: Av. Boa Viagem" className={inputClass} />
                </Field>
                <Field label="Numero" icon={FileText}>
                  <input value={form.numero} onChange={(event) => update('numero', event.target.value)} placeholder="Ex: 1234" className={inputClass} />
                </Field>
                <Field label="Bairro" icon={MapPin}>
                  <input value={form.bairro} onChange={(event) => update('bairro', event.target.value)} placeholder="Ex: Pina" className={inputClass} />
                </Field>
                <Field label="CNPJ" icon={FileText}>
                  <input value={form.cnpj} onChange={(event) => update('cnpj', event.target.value)} placeholder="00.000.000/0000-00" className={inputClass} />
                </Field>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" size="lg" className="flex-1 sm:flex-none"><Building2 className="h-5 w-5" /> Cadastrar Unidade</Button>
                <Button type="button" variant="outline" size="lg" onClick={resetForm}>Limpar</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up border-black p-5" style={{ animationDelay: '120ms' }}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><FileSpreadsheet className="h-5 w-5" /></div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Importar Planilha</h2>
              <p className="text-xs text-slate-500">CSV: nome, cidade, rua, estado/uf, numero, cep, bairro, cnpj</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:bg-white"
          >
            <UploadCloud className="mb-3 h-8 w-8 text-selfit-500" />
            <span className="text-sm font-semibold text-slate-800">Selecionar arquivo CSV</span>
            <span className="mt-1 text-xs text-slate-500">Separado por virgula ou ponto e virgula</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />

          {preview.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Unidade</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((row, index) => (
                      <tr key={`${row.nome}-${index}`}>
                        <td className="px-3 py-2 font-semibold text-slate-800">{row.nome || '-'}</td>
                        <td className="px-3 py-2">{row.estado || '-'}</td>
                        <td className={`px-3 py-2 font-semibold ${row.erro ? 'text-red-600' : 'text-emerald-600'}`}>{row.erro ?? 'OK'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="button" onClick={importPreview} className="w-full">Importar unidades validas</Button>
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}

function SuccessMessage({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 animate-fade-in">
      <CheckCircle2 className="h-5 w-5 shrink-0" />
      <p className="font-medium">{text}</p>
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
