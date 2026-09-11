import { Archive, Building2, Camera, Cpu, Tv, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useInventory } from '@/providers/InventoryProvider';
import { moduleLabels } from '@/services/inventory/inventoryTypes';
import { useModulo } from '@/providers/ModuloProvider';

export function DashboardPage() {
  const { modulo } = useModulo();
  const { historicos, unidades, getEquipamentosByModulo, cameras } = useInventory();

  const labels = moduleLabels[modulo];
  const items = modulo === 'cameras' ? [] : getEquipamentosByModulo(modulo);
  const totalItens = modulo === 'cameras' ? cameras.length : items.length;
  const ativos = modulo === 'cameras'
    ? cameras.filter((camera) => camera.status === 'ativa').length
    : items.filter((item) => item.status === 'ativo').length;
  const manutencao = modulo === 'cameras'
    ? cameras.filter((camera) => camera.status === 'manutencao').length
    : items.filter((item) => item.status === 'manutencao').length;
  const outros = modulo === 'cameras'
    ? cameras.filter((camera) => camera.status === 'inativa').length
    : items.filter((item) => item.status === 'outros' || item.status === 'inativo').length;
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

export function DonutChart({ ativas, manutencao, outros, total, label = 'Itens' }: { ativas: number; manutencao: number; outros: number; total: number; label?: string }) {
  const circumference = 2 * Math.PI * 50;
  const ativaPct = total ? ativas / total : 0;
  const manutPct = total ? manutencao / total : 0;
  const outrosPct = total ? outros / total : 0;

  return (
    <div className="relative h-48 w-48">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="16" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="#10b981" strokeWidth="16" strokeDasharray={`${ativaPct * circumference} ${circumference}`} strokeLinecap="round" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="#E10613" strokeWidth="16" strokeDasharray={`${manutPct * circumference} ${circumference}`} strokeDashoffset={`${-ativaPct * circumference}`} strokeLinecap="round" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="#f59e0b" strokeWidth="16" strokeDasharray={`${outrosPct * circumference} ${circumference}`} strokeDashoffset={`${-(ativaPct + manutPct) * circumference}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-extrabold text-slate-900">{total}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
    </div>
  );
}

function getPercent(value: number, total: number) {
  return total ? `${((value / total) * 100).toFixed(1)}%` : '0%';
}
