import { useMemo, useRef, useState } from 'react';
import { Building2, Camera, Cpu, Layers, MapPin, Tv, Upload, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useInventory } from '@/providers/InventoryProvider';
import { useModulo } from '@/providers/ModuloProvider';
import { categoriaLabels, moduleLabels } from '@/services/inventory/inventoryTypes';

type PlantaLocal = {
  unidadeId: string;
  url: string;
  tipo: string;
};

export function PlantaPage() {
  const { modulo } = useModulo();
  const { regioes, getUnidadesComRegiao, getEquipamentosByModulo, cameras } = useInventory();
  const fileRef = useRef<HTMLInputElement>(null);
  const [regiaoFilter, setRegiaoFilter] = useState('all');
  const [selectedUnidadeId, setSelectedUnidadeId] = useState('');
  const [plantas, setPlantas] = useState<PlantaLocal[]>([]);

  const unidades = getUnidadesComRegiao();
  const filteredUnidades = regiaoFilter === 'all' ? unidades : unidades.filter((unidade) => unidade.uf === regiaoFilter || unidade.regioes?.sigla === regiaoFilter);
  const selectedUnidade = unidades.find((unidade) => unidade.id === selectedUnidadeId);
  const planta = plantas.find((item) => item.unidadeId === selectedUnidadeId);
  const labels = moduleLabels[modulo];
  const MainIcon = modulo === 'tvs' ? Tv : modulo === 'cameras' ? Camera : Cpu;

  const monitorItems = useMemo(() => {
    if (!selectedUnidadeId) return [];

    if (modulo === 'cameras') {
      return cameras
        .filter((camera) => camera.unidade_id === selectedUnidadeId)
        .map((camera) => ({
          id: camera.id,
          nome: camera.nome,
          tipo: 'Camera',
          status: camera.status === 'ativa' ? 'Ativo' : camera.status === 'manutencao' ? 'Manutencao' : 'Offline',
          statusClass: camera.status === 'ativa' ? 'bg-emerald-500' : camera.status === 'manutencao' ? 'bg-amber-500' : 'bg-red-500',
        }));
    }

    return getEquipamentosByModulo(modulo)
      .filter((item) => item.unidade_id === selectedUnidadeId)
      .map((item) => ({
        id: item.id,
        nome: item.nome,
        tipo: categoriaLabels[item.categoria],
        status: item.status === 'ativo' ? 'Ativo' : item.status === 'manutencao' ? 'Manutencao' : 'Outros',
        statusClass: item.status === 'ativo' ? 'bg-emerald-500' : item.status === 'manutencao' ? 'bg-amber-500' : 'bg-slate-500',
      }));
  }, [cameras, getEquipamentosByModulo, modulo, selectedUnidadeId]);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedUnidadeId) return;
    const url = URL.createObjectURL(file);
    setPlantas((current) => [
      ...current.filter((item) => item.unidadeId !== selectedUnidadeId),
      { unidadeId: selectedUnidadeId, url, tipo: file.type },
    ]);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><MapPin className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Monitoramento</h1>
          <p className="text-sm text-slate-500">Acompanhe {labels.itemPlural.toLowerCase()} por unidade e planta local</p>
        </div>
      </div>

      <Card className="animate-fade-in-up p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <select value={regiaoFilter} onChange={(event) => { setRegiaoFilter(event.target.value); setSelectedUnidadeId(''); }} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700">
            <option value="all">Todas regioes</option>
            {regioes.map((regiao) => <option key={regiao.id} value={regiao.sigla}>{regiao.sigla}</option>)}
          </select>
          <select value={selectedUnidadeId} onChange={(event) => setSelectedUnidadeId(event.target.value)} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700">
            <option value="">Selecione uma unidade...</option>
            {filteredUnidades.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome} - {unidade.cidade ?? '-'}</option>)}
          </select>
          {selectedUnidade && (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-selfit-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-selfit-600">
              <Upload className="h-4 w-4" /> Upload Planta
              <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.svg,image/*" onChange={handleUpload} className="hidden" />
            </label>
          )}
        </div>
      </Card>

      {!selectedUnidade ? (
        <Card className="p-12 text-center"><p className="text-slate-400">Selecione uma unidade para acompanhar o monitoramento.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
          <Card className="animate-fade-in-up overflow-hidden" style={{ animationDelay: '80ms' }}>
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5 text-selfit-500" /> {selectedUnidade.nome}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {planta ? (
                <div className="relative min-h-[420px] bg-slate-900">
                  <img src={planta.url} alt="Planta baixa" className="h-[520px] w-full object-contain" />
                  <div className="absolute left-4 top-4 rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow">
                    {monitorItems.length} {labels.itemPlural.toLowerCase()} em acompanhamento
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 bg-slate-50 text-center">
                  <Upload className="h-10 w-10 text-slate-400" />
                  <p className="text-sm font-medium text-slate-600">Nenhuma planta local carregada</p>
                  <p className="text-xs text-slate-400">Use o upload para visualizar a planta nesta sessao</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="animate-fade-in-up" style={{ animationDelay: '160ms' }}>
            <CardHeader className="border-b border-slate-100"><CardTitle className="flex items-center gap-2 text-base"><Layers className="h-4 w-4 text-selfit-500" /> {labels.itemPlural} ({monitorItems.length})</CardTitle></CardHeader>
            <CardContent className="pt-4">
              <div className="scrollbar-thin max-h-[34rem] space-y-2 overflow-y-auto">
                {monitorItems.length === 0 ? (
                  <div className="py-10 text-center">
                    <XCircle className="mx-auto mb-3 h-9 w-9 text-slate-300" />
                    <p className="text-xs text-slate-400">Nenhum item cadastrado nesta unidade.</p>
                  </div>
                ) : (
                  monitorItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><MainIcon className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.nome}</p>
                        <p className="truncate text-xs text-slate-500">{item.tipo}</p>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full ${item.statusClass}`} title={item.status} />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
