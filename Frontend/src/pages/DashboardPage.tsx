import { DonutChart } from '@/components/charts/DonutChart';
// Arquivo: Frontend/src/pages/DashboardPage.tsx
// Serve para: painel resumido com indicadores gerais do modulo atual.

import { Archive, Building2, Camera, Cpu, Tv, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useInventario } from '@/hooks/useInventario';
import { moduleLabels } from '@/utils/inventoryTypes';
import { useModulo } from '@/hooks/useModulo';

function getPercent(value: number, total: number) {
  return total ? `${((value / total) * 100).toFixed(1)}%` : '0%';
}

export function DashboardPage() {
  const { modulo } = useModulo();
  const { unidades, getEquipamentosByModulo } = useInventario();

  const labels = moduleLabels[modulo];
  const items = getEquipamentosByModulo(modulo);
  const totalItens = items.length;
  const ativos = items.filter((item) => item.status === 'ativo').length;
  const manutencao = items.filter((item) => item.status === 'manutencao').length;
  const outros = items.filter((item) => item.status === 'outros' || item.status === 'inativo').length;
  const MainIcon = modulo === 'tvs' ? Tv : modulo === 'cameras' ? Camera : Cpu;

  const overviewMetrics = [
    { label: labels.itemPlural, value: `${totalItens} cadastrados`, color: 'border-l-selfit-500', icon: MainIcon },
    { label: 'Unidades', value: `${unidades.length} cadastradas`, color: 'border-l-emerald-500', icon: Building2 },
  ];

  const statuses = [
    { label: 'Em operacao', count: ativos, percentage: getPercent(ativos, totalItens), description: 'Funcionando normalmente', icon: MainIcon, cardClass: 'bg-emerald-50 border-emerald-200', textClass: 'text-emerald-700', barClass: 'bg-emerald-500' },
    { label: 'Em Manutencao', count: manutencao, percentage: getPercent(manutencao, totalItens), description: 'Em reparo ou acompanhamento', icon: Wrench, cardClass: 'bg-selfit-50 border-selfit-200', textClass: 'text-selfit-700', barClass: 'bg-selfit-500' },
    { label: 'Outros', count: outros, percentage: getPercent(outros, totalItens), description: modulo === 'cameras' ? 'Offline ou inativas' : 'Inativos ou em outra situacao', icon: Archive, cardClass: 'bg-amber-50 border-amber-200', textClass: 'text-amber-800', barClass: 'bg-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {overviewMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className={`animate-fade-in-up border-l-4 ${metric.color} p-5`} style={{ animationDelay: `${index * 80}ms` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold text-slate-900">{metric.value}</p>
                </div>
                <Icon className="h-8 w-8 text-slate-200" />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_1fr]">
        <Card className="animate-fade-in-up p-6" style={{ animationDelay: '120ms' }}>
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg">Distribuicao do Inventario</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="flex flex-col items-center gap-4">
              <DonutChart ativas={ativos} manutencao={manutencao} outros={outros} total={totalItens} label={labels.itemPlural} />
              <p className="text-center text-sm text-slate-500">Resumo atual do modulo selecionado</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {statuses.map((status, index) => {
            const Icon = status.icon;
            return (
              <Card key={status.label} className={`animate-slide-in-right border ${status.cardClass} p-5`} style={{ animationDelay: `${index * 80 + 120}ms` }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${status.cardClass} ${status.textClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${status.textClass}`}>{status.label}</h3>
                      <p className="text-sm text-slate-600">{status.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <strong className={`block font-display text-2xl font-bold ${status.textClass}`}>{status.count}</strong>
                    <span className="text-sm text-slate-500">{status.percentage}</span>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/50">
                  <div className={`h-full rounded-full ${status.barClass} transition-all duration-700`} style={{ width: status.percentage }} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

