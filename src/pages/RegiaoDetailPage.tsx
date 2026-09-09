import { ArrowLeft, Building, Camera, Cpu, MapPin, Tv } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DonutChart } from '@/pages/DashboardPage';
import { useInventory } from '@/providers/InventoryProvider';
import { moduleLabels } from '@/services/inventory/inventoryTypes';
import { useModulo } from '@/providers/ModuloProvider';

export function RegiaoDetailPage({ regiaoId, onBack }: { regiaoId: string; onBack: () => void }) {
  const { modulo } = useModulo();
  const { regioes, unidades, getEquipamentosByModulo, cameras } = useInventory();
  const regiao = regioes.find((item) => item.id === regiaoId);
  const labels = moduleLabels[modulo];
  const MainIcon = modulo === 'tvs' ? Tv : modulo === 'cameras' ? Camera : Cpu;

  if (!regiao) {
    return <Card className="p-12 text-center"><p className="text-slate-400">Regiao nao encontrada.</p></Card>;
  }

  const unidadesDaRegiao = unidades.filter((unidade) => unidade.regiao_id === regiaoId);
  const unitIds = unidadesDaRegiao.map((unidade) => unidade.id);
  const cameraItems = modulo === 'cameras' ? cameras.filter((camera) => unitIds.includes(camera.unidade_id)) : [];
  const equipamentoItems = modulo === 'cameras' ? [] : getEquipamentosByModulo(modulo).filter((item) => item.unidade_id && unitIds.includes(item.unidade_id));
  const total = modulo === 'cameras' ? cameraItems.length : equipamentoItems.length;
  const ativas = modulo === 'cameras'
    ? cameraItems.filter((item) => item.status === 'ativa').length
    : equipamentoItems.filter((item) => item.status === 'ativo').length;
  const manutencao = modulo === 'cameras'
    ? cameraItems.filter((item) => item.status === 'manutencao').length
    : equipamentoItems.filter((item) => item.status === 'manutencao').length;
  const outros = modulo === 'cameras'
    ? cameraItems.filter((item) => item.status === 'inativa').length
    : equipamentoItems.filter((item) => item.status === 'outros' || item.status === 'inativo').length;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-selfit-600">
        <ArrowLeft className="h-4 w-4" /> Voltar as regioes
      </button>

      <div className="flex flex-col gap-4 rounded-2xl bg-black p-6 shadow-lg animate-fade-in sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-selfit-500 to-selfit-700 text-white">
            <MapPin className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-white">{regiao.sigla}</h1>
            <p className="text-sm text-white/60">{regiao.nome} - {regiao.macroregiao}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
            <MainIcon className="h-5 w-5 text-white" />
            <span className="font-display text-2xl font-bold text-white">{total}</span>
            <span className="text-sm text-white/70">{labels.itemPlural}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
            <Building className="h-5 w-5 text-white" />
            <span className="font-display text-2xl font-bold text-white">{unidadesDaRegiao.length}</span>
            <span className="text-sm text-white/70">Unidades</span>
          </div>
        </div>
      </div>

      <Card className="animate-fade-in-up p-6">
        <CardHeader className="px-0 pt-0"><CardTitle className="text-lg">Distribuicao Geral</CardTitle></CardHeader>
        <CardContent className="px-0">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
            <DonutChart ativas={ativas} manutencao={manutencao} outros={outros} total={total} label={labels.itemPlural} />
            <div className="w-full max-w-xs space-y-2">
              <LegendRow label="Em operacao" value={ativas} total={total} color="bg-emerald-500" />
              <LegendRow label="Manutencao" value={manutencao} total={total} color="bg-selfit-500" />
              <LegendRow label="Outros" value={outros} total={total} color="bg-amber-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 font-display text-xl font-bold text-slate-900">Dashboard por Unidade</h2>
        {unidadesDaRegiao.length === 0 ? (
          <Card className="p-12 text-center"><p className="text-slate-400">Nenhuma unidade cadastrada neste estado.</p></Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {unidadesDaRegiao.map((unidade, index) => {
              const unitCameraItems = modulo === 'cameras' ? cameras.filter((item) => item.unidade_id === unidade.id) : [];
              const unitEquipamentoItems = modulo === 'cameras' ? [] : getEquipamentosByModulo(modulo).filter((item) => item.unidade_id === unidade.id);
              const unitTotal = modulo === 'cameras' ? unitCameraItems.length : unitEquipamentoItems.length;
              const unitActive = modulo === 'cameras' ? unitCameraItems.filter((item) => item.status === 'ativa').length : unitEquipamentoItems.filter((item) => item.status === 'ativo').length;
              const unitMaint = modulo === 'cameras' ? unitCameraItems.filter((item) => item.status === 'manutencao').length : unitEquipamentoItems.filter((item) => item.status === 'manutencao').length;
              const unitOther = modulo === 'cameras' ? unitCameraItems.filter((item) => item.status === 'inativa').length : unitEquipamentoItems.filter((item) => item.status === 'outros' || item.status === 'inativo').length;
              return (
                <Card key={unidade.id} className="animate-fade-in-up p-6" style={{ animationDelay: `${index * 80}ms` }}>
                  <CardHeader className="flex flex-row items-center justify-between px-0 pt-0">
                    <CardTitle className="text-base">{unidade.nome}</CardTitle>
                    <span className="rounded-lg bg-selfit-50 px-2 py-0.5 text-xs font-bold text-selfit-700">{unitTotal} {labels.itemPlural}</span>
                  </CardHeader>
                  <CardContent className="px-0">
                    <div className="flex flex-col items-center gap-3">
                      <DonutChart ativas={unitActive} manutencao={unitMaint} outros={unitOther} total={unitTotal} label={labels.itemPlural} />
                      <div className="w-full space-y-1.5">
                        <LegendRow label="Em operacao" value={unitActive} total={unitTotal} color="bg-emerald-500" />
                        <LegendRow label="Manutencao" value={unitMaint} total={unitTotal} color="bg-selfit-500" />
                        <LegendRow label="Outros" value={unitOther} total={unitTotal} color="bg-amber-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function LegendRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="flex-1 text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-700">{value} ({total ? ((value / total) * 100).toFixed(0) : 0}%)</span>
    </div>
  );
}
