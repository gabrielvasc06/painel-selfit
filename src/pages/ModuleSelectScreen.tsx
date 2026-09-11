import { ArrowRight, Camera, LogOut, Server, ShieldCheck, Tv, User } from 'lucide-react';
import selfitLogoUrl from '@/assets/logos/selfit-logo.png';
import type { ModuloTipo } from '@/services/inventory/inventoryTypes';

interface ModuleSelectScreenProps {
  userName: string;
  onSelectModulo: (modulo: ModuloTipo) => void;
  onLogout: () => void;
}

const modules = [
  {
    id: 'tvs' as const,
    title: 'Gestao de TVs',
    description: 'Controle de Smart TVs, status de funcionamento e mapeamento por unidade.',
    icon: Tv,
    color: 'red',
  },
  {
    id: 'equipamentos' as const,
    title: 'Gestao de Equipamentos',
    description: 'Gerenciamento de notebooks, totens, catracas, leitores faciais e rede.',
    icon: Server,
    color: 'indigo',
  },
  {
    id: 'cameras' as const,
    title: 'Gestao de Cameras',
    description: 'Cadastro e consulta de cameras por unidade e status.',
    icon: Camera,
    color: 'emerald',
  },
];

const colorClasses = {
  red: {
    hover: 'hover:border-red-500/60 hover:shadow-red-600/10',
    glow: 'bg-red-600/10 group-hover:bg-red-600/20',
    icon: 'border-red-500/20 bg-red-500/10 text-red-500 group-hover:bg-red-600',
    title: 'group-hover:text-red-400',
    action: 'text-red-500',
  },
  indigo: {
    hover: 'hover:border-indigo-500/60 hover:shadow-indigo-600/10',
    glow: 'bg-indigo-600/10 group-hover:bg-indigo-600/20',
    icon: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600',
    title: 'group-hover:text-indigo-400',
    action: 'text-indigo-400',
  },
  emerald: {
    hover: 'hover:border-emerald-500/60 hover:shadow-emerald-600/10',
    glow: 'bg-emerald-600/10 group-hover:bg-emerald-600/20',
    icon: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-600',
    title: 'group-hover:text-emerald-400',
    action: 'text-emerald-400',
  },
};

export function ModuleSelectScreen({ userName, onSelectModulo, onLogout }: ModuleSelectScreenProps) {
  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-slate-950 p-6 text-slate-100 sm:p-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <img src={selfitLogoUrl} alt="Selfit" className="h-12 w-12 rounded-xl object-contain" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">SELFIT</h1>
            <p className="text-xs text-slate-400">Plataforma Unificada de Infraestrutura</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-1.5 text-xs text-slate-300 sm:flex">
            <User className="h-3.5 w-3.5 text-red-500" />
            <span>{userName}</span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2 text-xs font-medium text-slate-400 transition hover:border-red-500/50 hover:bg-red-950/20 hover:text-red-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto my-auto w-full max-w-6xl py-10">
        <div className="mb-12 text-center">
          <img src={selfitLogoUrl} alt="Selfit" className="mx-auto mb-7 h-24 w-24 rounded-2xl object-contain shadow-lg shadow-red-600/20" />
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Selecione o Modulo de Trabalho
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400 sm:text-base">
            Escolha o ambiente de gestao para acessar filtros, cadastros e consultas do inventario.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            const colors = colorClasses[module.color as keyof typeof colorClasses];
            return (
              <button
                key={module.id}
                onClick={() => onSelectModulo(module.id)}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:bg-slate-900 hover:shadow-2xl ${colors.hover}`}
              >
                <div className={`absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full blur-2xl transition-all ${colors.glow}`} />
                <div>
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition group-hover:scale-110 group-hover:text-white ${colors.icon}`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className={`mt-6 text-2xl font-bold text-white transition-colors ${colors.title}`}>
                    {module.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{module.description}</p>
                </div>

                <div className={`mt-8 flex items-center gap-2 text-sm font-semibold transition-transform group-hover:translate-x-1 ${colors.action}`}>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-center gap-2 border-t border-slate-800/80 pt-6 text-xs text-slate-500">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>Selfit Academias - Acesso Corporativo Restrito TI</span>
      </footer>
    </div>
  );
}
