// Grafico compartilhado entre o painel e a visao regional.
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

