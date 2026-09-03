import { Tv, Server, Camera, ArrowRight, LogOut, ShieldCheck, User } from 'lucide-react';
import type { ModuloTipo } from '@/lib/supabase';

interface ModuleSelectScreenProps {
  userName: string;
  onSelectModulo: (modulo: ModuloTipo) => void;
  onLogout: () => void;
}

export function ModuleSelectScreen({ userName, onSelectModulo, onLogout }: ModuleSelectScreenProps) {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-12 overflow-hidden">
      {/* Background Decorativo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-red-600/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 font-bold text-white shadow-lg shadow-red-600/30">
            SF
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">SELFIT</h1>
            <p className="text-xs text-slate-400">Plataforma Unificada de Infraestrutura</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-1.5 text-xs text-slate-300">
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

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto w-full my-auto py-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Selecione o Módulo de Trabalho
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Escolha abaixo o ambiente de gestão para acessar as unidades, relatórios e controle de inventário.
          </p>
        </div>

        {/* Grid ajustado para 3 colunas em telas médias/grandes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Módulo 1: TVs */}
          <button
            onClick={() => onSelectModulo('tvs')}
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:border-red-500/60 hover:bg-slate-900 hover:shadow-2xl hover:shadow-red-600/10"
          >
            <div className="absolute top-0 right-0 h-32 w-32 -mr-8 -mt-8 rounded-full bg-red-600/10 blur-2xl group-hover:bg-red-600/20 transition-all" />
            <div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500 transition group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white">
                <Tv className="h-8 w-8" />
              </div>
              <h3 className="mt-6 text-2xl font-bold text-white group-hover:text-red-400 transition-colors">
                Gestão de TVs
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Controle exclusivo de Smart TVs e status de funcionamento e mapeamento por unidade.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-red-500 group-hover:translate-x-1 transition-transform">
              <span>Acessar Módulo /tvs</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </button>

          {/* Card Módulo 2: Equipamentos TI */}
          <button
            onClick={() => onSelectModulo('equipamentos')}
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/60 hover:bg-slate-900 hover:shadow-2xl hover:shadow-indigo-600/10"
          >
            <div className="absolute top-0 right-0 h-32 w-32 -mr-8 -mt-8 rounded-full bg-indigo-600/10 blur-2xl group-hover:bg-indigo-600/20 transition-all" />
            <div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 transition group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white">
                <Server className="h-8 w-8" />
              </div>
              <h3 className="mt-6 text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                Gestão de Equipamentos de TI
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Gerenciamento de periféricos, computadores, switches, catracas, leitores faciais e ativos de rede.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>Acessar Módulo /equipamentos</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </button>

          {/* Card Módulo 3: Câmeras / CFTV */}
          <button
            onClick={() => onSelectModulo('cameras')}
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/60 hover:bg-slate-900 hover:shadow-2xl hover:shadow-emerald-600/10"
          >
            <div className="absolute top-0 right-0 h-32 w-32 -mr-8 -mt-8 rounded-full bg-emerald-600/10 blur-2xl group-hover:bg-emerald-600/20 transition-all" />
            <div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 transition group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white">
                <Camera className="h-8 w-8" />
              </div>
              <h3 className="mt-6 text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                Gestão de Câmeras
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Monitoramento do sistema de CFTV, DVRs, NVRs, IPs e status de câmeras por unidade.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Acessar Módulo /cameras</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center gap-2 text-xs text-slate-500 max-w-6xl mx-auto w-full pt-6 border-t border-slate-800/80">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>Selfit Academias &bull; Acesso Corporativo Restrito TI</span>
      </footer>
    </div>
  );
}