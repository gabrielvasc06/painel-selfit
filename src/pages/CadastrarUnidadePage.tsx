import { useRef, useState } from 'react';
import { Building2, CheckCircle2, FileSpreadsheet, FileText, Loader2, MapPin, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useInventory } from '@/providers/InventoryProvider';
import { normalizeUnitName, parseUnidadesCsv, parseUnidadesRows, type UnidadeCsvPreview } from '@/services/inventory/inventoryLogic';
import { apiRequest, notifyInventoryUpdated, type ApiEnvelope } from '@/services/api';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 transition-all focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20';

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function CadastrarUnidadePage() {
  const { regioes } = useInventory();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ nome: '', regiao_id: '', cnpj: '', logradouro: '', numero: '', bairro: '', cep: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<UnidadeCsvPreview[]>([]);
  const [imported, setImported] = useState(false);
  const [importing, setImporting] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    const normalized = key === 'cnpj' || key === 'cep'
      ? value.replace(/\D/g, '')
      : value.toLocaleUpperCase('pt-BR');
    setForm((current) => ({ ...current, [key]: normalized }));
    setSubmitted(false);
    setImported(false);
    setError('');
  };

  const resetForm = () => setForm({ nome: '', regiao_id: '', cnpj: '', logradouro: '', numero: '', bairro: '', cep: '' });

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const regiao = regioes.find((item) => item.id === form.regiao_id);
    if (!regiao) {
      setError('Selecione uma UF valida.');
      return;
    }
    if (form.cnpj.length !== 14 || form.cep.length !== 8 || !form.bairro.trim() || !form.logradouro.trim() || !form.numero.trim()) {
      setError('Preencha CNPJ (14 digitos), CEP (8 digitos), bairro, rua e numero.');
      return;
    }

    setError('');
    try {
      const result = await apiRequest<ApiEnvelope<never>>('/register/unidades', {
        method: 'POST',
        body: JSON.stringify({
          nome: normalizeUnitName(form.nome),
          tipo_unidade: 'PROPRIA',
          cnpj: formatCnpj(form.cnpj),
          cep: form.cep,
          uf: regiao.sigla,
          bairro: form.bairro.trim().toLocaleUpperCase('pt-BR'),
          rua: form.logradouro.trim().toLocaleUpperCase('pt-BR'),
          numero: form.numero.trim().toLocaleUpperCase('pt-BR'),
        }),
      });
      if (result.sucesso === false) throw new Error(result.message ?? result.mensagem ?? 'A API recusou o cadastro.');
      notifyInventoryUpdated();
      setSubmitted(true);
      resetForm();
      window.setTimeout(() => setSubmitted(false), 4000);
    } catch (submitError) {
      setError((submitError as Error).message || 'Nao foi possivel cadastrar a unidade.');
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'csv') {
        setPreview(parseUnidadesCsv(await file.text()));
      } else {
        if (extension !== 'xlsx') throw new Error('Use um arquivo .xlsx ou .csv.');
        const { default: readXlsxFile } = await import('read-excel-file/browser');
        const rawRows = await readXlsxFile(file) as unknown[];
        setPreview(parseUnidadesRows(normalizeWorkbookRows(rawRows)));
      }
      setImported(false);
      setError('');
    } catch (fileError) {
      setPreview([]);
      setError((fileError as Error).message || 'Nao foi possivel ler o arquivo.');
    }
  };

  const importPreview = async () => {
    const validRows = preview.filter((row) => !row.erro);
    if (validRows.length === 0) {
      setError('Nao ha linhas validas para enviar.');
      return;
    }

    setError('');
    setImporting(true);
    try {
      const result = await apiRequest<ApiEnvelope<never> & { total?: number }>('/register/unidades/bulk', {
        method: 'POST',
        body: JSON.stringify({
          unidades: validRows.map((row) => ({
            nome: normalizeUnitName(row.nome),
            tipo_unidade: 'PROPRIA',
            cnpj: formatCnpj(row.cnpj),
            cep: row.cep.replace(/\D/g, ''),
            uf: row.estado,
            bairro: row.bairro.trim().toLocaleUpperCase('pt-BR'),
            rua: row.logradouro.trim().toLocaleUpperCase('pt-BR'),
            numero: row.numero.trim().toLocaleUpperCase('pt-BR'),
          })),
        }),
      });
      if (result.sucesso === false) throw new Error(result.message ?? result.mensagem ?? 'A API recusou a importacao.');
      notifyInventoryUpdated();
      setImported(true);
      const invalidRows = preview.filter((row) => row.erro);
      setPreview(invalidRows);
      if (invalidRows.length > 0) setError(`${result.total ?? validRows.length} unidade(s) gravada(s). ${invalidRows.length} linha(s) com erro nao foram enviadas.`);
      else if (fileRef.current) fileRef.current.value = '';
    } catch (importError) {
      setError((importError as Error).message || 'Nao foi possivel importar o arquivo; nenhuma unidade do lote foi gravada.');
    } finally {
      setImporting(false);
    }
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
                  <input required maxLength={100} value={form.nome} onChange={(event) => update('nome', event.target.value)} placeholder="Ex: BOA VIAGEM" className={inputClass} />
                </Field>
                <Field label="CEP" icon={MapPin}>
                  <div className="flex gap-2">
                    <input required minLength={8} maxLength={8} pattern="[0-9]{8}" value={form.cep} onChange={(event) => update('cep', event.target.value)} placeholder="00000000" className={inputClass} />
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
                <Field label="Rua / Logradouro" icon={MapPin}>
                  <input required maxLength={150} value={form.logradouro} onChange={(event) => update('logradouro', event.target.value)} placeholder="Ex: RUA BRUNO VELOSO" className={inputClass} />
                </Field>
                <Field label="Numero" icon={FileText}>
                  <input required maxLength={20} value={form.numero} onChange={(event) => update('numero', event.target.value)} placeholder="Ex: 1234" className={inputClass} />
                </Field>
                <Field label="Bairro" icon={MapPin}>
                  <input required maxLength={100} value={form.bairro} onChange={(event) => update('bairro', event.target.value)} placeholder="Ex: BOA VIAGEM" className={inputClass} />
                </Field>
                <Field label="CNPJ" icon={FileText}>
                  <input required minLength={18} maxLength={18} value={formatCnpj(form.cnpj)} onChange={(event) => update('cnpj', event.target.value)} inputMode="numeric" placeholder="22.902.694/0001-95" className={inputClass} />
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
              <p className="text-xs text-slate-500">XLSX ou CSV: nome, CNPJ, CEP, UF, bairro, rua e número</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:bg-white"
          >
            <UploadCloud className="mb-3 h-8 w-8 text-selfit-500" />
            <span className="text-sm font-semibold text-slate-800">Selecionar arquivo Excel ou CSV</span>
            <span className="mt-1 text-xs text-slate-500">.xlsx ou .csv</span>
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={(event) => void handleFile(event)} className="hidden" />

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
              <Button type="button" onClick={importPreview} disabled={importing} className="w-full">{importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : 'Importar unidades validas'}</Button>
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

function normalizeWorkbookRows(rawRows: unknown[]): Array<Record<string, unknown>> {
  const first = rawRows[0];
  if (first && typeof first === 'object' && 'data' in first && Array.isArray((first as { data?: unknown }).data)) {
    return (rawRows as Array<{ sheet?: string; data: unknown[][] }>).flatMap((sheet) => sheetToRows(sheet.data, sheet.sheet));
  }
  return sheetToRows(rawRows as unknown[][]);
}

function sheetToRows(sheetRows: unknown[][], sheetName = '') {
  const [headers = [], ...dataRows] = sheetRows;
  return dataRows.map((cells) => Object.fromEntries([
    ...headers.map((header, index) => [String(header ?? ''), cells[index] ?? '']),
    ['_sheet', sheetName],
  ]));
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof Building2; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon className="h-4 w-4 text-slate-400" /> {label}</label>
      {children}
    </div>
  );
}
