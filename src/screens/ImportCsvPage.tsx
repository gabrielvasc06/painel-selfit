import { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Download, 
  Loader2, 
  ArrowRight,
  Info
} from 'lucide-react';
import { supabase, logHistorico, type Unidade, type EquipamentoStatus } from '@/lib/supabase';
import { useModulo } from '@/contexts/ModuloContext';

interface CsvRowPreview {
  unidadeIdentificador: string;
  nome: string;
  categoria: string;
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  asset_tag?: string;
  posicao?: string;
  status: EquipamentoStatus;
  observacoes?: string;
  unidadeValida?: boolean;
  unidadeIdEncontrado?: string;
  unidadeNomeEncontrado?: string;
  erro?: string;
}

export function ImportCsvPage() {
  const { isTvOnly } = useModulo();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CsvRowPreview[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{ total: number } | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUnidades() {
      const { data } = await supabase.from('unidades').select('*');
      if (data) setUnidades(data);
    }
    loadUnidades();
  }, []);

  const handleDownloadTemplate = () => {
    let headers: string[];
    let exampleRow: string[];

    if (isTvOnly) {
      headers = ['Unidade (Nome ou Codigo EVO)', 'Codigo da TV', 'Marca', 'Modelo', 'Numero de Serie', 'Status (ativo/manutencao/inativo)', 'Posicao / Setor', 'Observacoes'];
      exampleRow = ['Unidade Paulista', 'TV-01-CARDIO', 'LG', 'Smart TV 55 4K', 'LG559823412', 'ativo', 'Pista Superior', 'Área esteiras'];
    } else {
      headers = ['Unidade (Nome ou Codigo EVO)', 'Nome do Item', 'Categoria', 'Asset Tag (Patrimonio)', 'Marca', 'Modelo', 'Numero de Serie', 'Status (ativo/manutencao/inativo)', 'Posicao / Rack', 'Observacoes'];
      exampleRow = ['Unidade Paulista', 'Switch Core 24p', 'switch', 'PAT-90812', 'Ubiquiti', 'UniFi Pro 24', 'UB987654321', 'ativo', 'Rack Sala TI U12', 'Patch cord azul'];
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(';'), exampleRow.join(';')].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', isTvOnly ? 'modelo_importacao_tvs.csv' : 'modelo_importacao_ti.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('O arquivo CSV deve conter um cabeçalho e pelo menos 1 linha de dados.');
    }

    const headerLine = lines[0];
    const separator = headerLine.includes(';') ? ';' : ',';
    const rows: CsvRowPreview[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(separator).map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length === 0 || cols.every((c) => c === '')) continue;

      let rowData: CsvRowPreview;

      if (isTvOnly) {
        const [unidadeIdent, codigo, marca, modelo, numSerie, statusStr, posicao, obs] = cols;
        const statusClean = (statusStr?.toLowerCase() ?? 'ativo') as EquipamentoStatus;

        rowData = {
          unidadeIdentificador: unidadeIdent || '',
          nome: codigo || `TV-${i}`,
          categoria: 'TV',
          marca: marca || undefined,
          modelo: modelo || undefined,
          numero_serie: numSerie || undefined,
          asset_tag: codigo || undefined,
          status: ['ativo', 'manutencao', 'inativo', 'outros'].includes(statusClean) ? statusClean : 'ativo',
          posicao: posicao || undefined,
          observacoes: obs || undefined,
        };
      } else {
        const [unidadeIdent, nomeItem, cat, assetTag, marca, modelo, numSerie, statusStr, posicao, obs] = cols;
        const statusClean = (statusStr?.toLowerCase() ?? 'ativo') as EquipamentoStatus;
        const catClean = (cat?.toLowerCase().replace(/\s+/g, '_') || 'computador');

        rowData = {
          unidadeIdentificador: unidadeIdent || '',
          nome: nomeItem || `Equipamento-${i}`,
          categoria: catClean === 'tv' ? 'computador' : catClean,
          asset_tag: assetTag || undefined,
          marca: marca || undefined,
          modelo: modelo || undefined,
          numero_serie: numSerie || undefined,
          status: ['ativo', 'manutencao', 'inativo', 'outros'].includes(statusClean) ? statusClean : 'ativo',
          posicao: posicao || undefined,
          observacoes: obs || undefined,
        };
      }

      const foundUnidade = unidades.find(
        (u) =>
          u.nome.toLowerCase().trim() === rowData.unidadeIdentificador.toLowerCase().trim() ||
          (u.codigo_evo && u.codigo_evo.toLowerCase().trim() === rowData.unidadeIdentificador.toLowerCase().trim()) ||
          u.id === rowData.unidadeIdentificador
      );

      if (foundUnidade) {
        rowData.unidadeValida = true;
        rowData.unidadeIdEncontrado = foundUnidade.id;
        rowData.unidadeNomeEncontrado = foundUnidade.nome;
      } else {
        rowData.unidadeValida = false;
        rowData.erro = `Unidade "${rowData.unidadeIdentificador || 'vazia'}" não encontrada.`;
      }

      rows.push(rowData);
    }

    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setGlobalError(null);
    setImportSuccess(null);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = parseCSV(text);
        setParsedData(parsed);
      } catch (err: any) {
        setGlobalError(err.message || 'Falha ao processar o arquivo CSV.');
        setParsedData([]);
      } finally {
        setParsing(false);
      }
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const handleExecuteImport = async () => {
    const validRows = parsedData.filter((r) => r.unidadeValida && r.unidadeIdEncontrado);
    if (validRows.length === 0) {
      setGlobalError('Não há registros válidos para importar.');
      return;
    }

    setImporting(true);
    setGlobalError(null);

    const payload = validRows.map((r) => ({
      unidade_id: r.unidadeIdEncontrado!,
      categoria: r.categoria,
      nome: r.nome,
      marca: r.marca ?? null,
      modelo: r.modelo ?? null,
      numero_serie: r.numero_serie ?? null,
      asset_tag: r.asset_tag ?? null,
      posicao: r.posicao ?? null,
      status: r.status,
      observacoes: r.observacoes ?? null,
    }));

    const { error } = await supabase.from('equipamentos').insert(payload);

    if (error) {
      setGlobalError(`Erro ao salvar no banco: ${error.message}`);
      setImporting(false);
      return;
    }

    await logHistorico({
      acao: `Importação em lote de ${isTvOnly ? 'TVs' : 'Equipamentos TI'} (${validRows.length} itens)`,
      detalhe: `Importado com sucesso via CSV`,
    });

    setImportSuccess({ total: validRows.length });
    setParsedData([]);
    setFile(null);
    setImporting(false);
  };

  const validCount = parsedData.filter((r) => r.unidadeValida).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Importação em Lote via CSV
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Módulo ativo: <strong className="text-slate-800">{isTvOnly ? 'Parque de TVs' : 'Equipamentos de TI'}</strong>
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border transition shadow-sm ${
            isTvOnly
              ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
              : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          <Download className="h-4 w-4" />
          <span>Baixar Modelo CSV</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-start gap-4">
        <div className={`p-2.5 rounded-xl shrink-0 ${isTvOnly ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
          <Info className="h-5 w-5" />
        </div>
        <div className="text-sm text-slate-600 space-y-1">
          <p className="font-semibold text-slate-900">Instruções:</p>
          <p>1. Preencha o arquivo com o <strong>Nome exato da Unidade</strong> ou <strong>Código EVO</strong>.</p>
          <p>2. Os dados serão gravados na categoria <span className="font-semibold">{isTvOnly ? '"TV"' : 'diferente de TV'}</span>.</p>
        </div>
      </div>

      {importSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
          <div>
            <h4 className="font-semibold">Importação concluída!</h4>
            <p className="text-sm text-emerald-700">{importSuccess.total} itens cadastrados com sucesso.</p>
          </div>
        </div>
      )}

      {globalError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
          <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
          <div>
            <h4 className="font-semibold">Atenção</h4>
            <p className="text-sm text-red-700">{globalError}</p>
          </div>
        </div>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 p-10 text-center cursor-pointer bg-white hover:bg-slate-50 transition"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-3 ${isTvOnly ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
          {parsing ? <Loader2 className="h-7 w-7 animate-spin" /> : <UploadCloud className="h-7 w-7" />}
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          {file ? file.name : 'Selecione ou solte o arquivo CSV aqui'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">Extensão .csv delimitada por ponto e vírgula (;) ou vírgula (,)</p>
      </div>

      {parsedData.length > 0 && (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Pré-visualização</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                <strong className="text-emerald-600">{validCount} válidos</strong> | <strong className="text-red-600">{invalidCount} pendentes</strong>
              </p>
            </div>
            <button
              onClick={handleExecuteImport}
              disabled={importing || validCount === 0}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow transition disabled:opacity-50 ${
                isTvOnly ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              <span>Gravar {validCount} Itens</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 uppercase tracking-wider text-slate-500 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Validação</th>
                  <th className="py-2.5 px-3">Unidade</th>
                  <th className="py-2.5 px-3">Item / TV</th>
                  {!isTvOnly && <th className="py-2.5 px-3">Categoria</th>}
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedData.map((row, idx) => (
                  <tr key={idx} className={row.unidadeValida ? '' : 'bg-red-50/40'}>
                    <td className="py-2.5 px-3 font-medium">
                      {row.unidadeValida ? (
                        <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> OK</span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {row.erro}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-900 font-medium">{row.unidadeNomeEncontrado || row.unidadeIdentificador}</td>
                    <td className="py-2.5 px-3">{row.nome}</td>
                    {!isTvOnly && <td className="py-2.5 px-3">{row.categoria}</td>}
                    <td className="py-2.5 px-3 font-semibold capitalize">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportCsvPage;