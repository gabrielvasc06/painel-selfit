import { ArrowRight, Building, Camera, Cpu, MapPin, Tv } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useInventory } from '@/providers/InventoryProvider';
import { moduleLabels } from '@/services/inventory/inventoryTypes';
import { useModulo } from '@/providers/ModuloProvider';

export function RegiaoPage({ onOpenRegiao }: { onOpenRegiao: (id: string) => void }) {
  const { modulo } = useModulo();
  const { regioes, unidades, getEquipamentosByModulo, cameras } = useInventory();
  const labels = moduleLabels[modulo];
  const MainIcon = modulo === 'tvs' ? Tv : modulo === 'cameras' ? Camera : Cpu;

  const grouped = regioes.reduce<Record<string, typeof regioes>>((acc, regiao) => {
    acc[regiao.macroregiao] = [...(acc[regiao.macroregiao] ?? []), regiao];
    return acc;
  }, {});

  const getStats = (regiaoId: string) => {
    const unitIds = unidades.filter((unidade) => unidade.regiao_id === regiaoId).map((unidade) => unidade.id);
    if (modulo === 'cameras') {
      const scoped = cameras.filter((camera) => unitIds.includes(camera.unidade_id));
      return {
        itens: scoped.length,
        unidades_count: unitIds.length,
        ativos: scoped.filter((camera) => camera.status === 'ativa').length,
        manutencao: scoped.filter((camera) => camera.status === 'manutencao').length,
        outros: scoped.filter((camera) => camera.status === 'inativa').length,
      };
    }

    const scoped = getEquipamentosByModulo(modulo).filter((item) => item.unidade_id && unitIds.includes(item.unidade_id));
    return {
      itens: scoped.length,
      unidades_count: unitIds.length,
      ativos: scoped.filter((item) => item.status === 'ativo').length,
      manutencao: scoped.filter((item) => item.status === 'manutencao').length,
      outros: scoped.filter((item) => item.status === 'outros' || item.status === 'inativo').length,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl bg-black px-6 py-5 shadow-lg animate-fade-in">
        <MapPin className="h-6 w-6 text-white" />
        <h1 className="font-display text-2xl font-bold text-white">Por Regiao</h1>
      </div>

      <div className="space-y-5">
        {Object.entries(grouped).map(([macroregiao, estados]) => (
          <Card key={macroregiao} className="animate-fade-in-up overflow-hidden border-black">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-selfit-500" /> {macroregiao}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-5 py-3 font-semibold text-slate-600">Estado</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Nome</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Unidades</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">{labels.itemPlural}</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Em operacao</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Manutencao</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Outros</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {estados.map((regiao) => {
                      const stats = getStats(regiao.id);
                      return (
                        <tr key={regiao.id} className="transition-colors hover:bg-slate-50">
                          <td className="px-5 py-3 font-display text-xl font-extrabold text-slate-900">{regiao.sigla}</td>
                          <td className="px-5 py-3 text-slate-700">{regiao.nome}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700"><Building className="h-4 w-4 text-slate-400" /> {stats.unidades_count}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700"><MainIcon className="h-4 w-4 text-selfit-500" /> {stats.itens}</span>
                          </td>
                          <td className="px-5 py-3 text-emerald-700">{stats.ativos}</td>
                          <td className="px-5 py-3 text-selfit-700">{stats.manutencao}</td>
                          <td className="px-5 py-3 text-amber-700">{stats.outros}</td>
                          <td className="px-5 py-3">
                            <button onClick={() => onOpenRegiao(regiao.id)} className="flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-selfit-50 hover:text-selfit-700">
                              Detalhes <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
