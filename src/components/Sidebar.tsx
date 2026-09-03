import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Search,
  PlusCircle,
  MapPin,
  LogOut,
  Menu,
  X,
  Tv,
  Building2,
  Cpu,
  ShieldCheck,
  Wrench,
  Layers,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModuloTipo } from '@/lib/supabase';

export type PageId =
  | 'dashboard'
  | 'consultar'
  | 'cadastrar'
  | 'cadastrar_unidade'
  | 'cadastrar_equipamento'
  | 'equipamentos'
  | 'regiao'
  | 'garantias'
  | 'manutencoes'
  | 'planta'
  | 'import_csv';

interface SidebarProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
  onLogout: () => void;
  userName?: string;
  modulo: ModuloTipo;
}

function getNavSections(modulo: ModuloTipo): { label: string; items: { id: PageId; label: string; icon: typeof LayoutDashboard }[] }[] {
  const isTvs = modulo === 'tvs';

  return [
    {
      label: 'Visao Geral',
      items: [{ id: 'dashboard', label: 'Painel Principal', icon: LayoutDashboard }],
    },
    {
      label: 'Consultas',
      items: [
        { id: 'consultar', label: 'Consultar Unidades', icon: Search },
        { id: 'equipamentos', label: isTvs ? 'TVs' : 'Equipamentos de TI', icon: isTvs ? Tv : Cpu },
        { id: 'regiao', label: 'Por Regiao', icon: MapPin },
      ],
    },
    {
      label: 'Cadastros',
      items: [
        isTvs
          ? { id: 'cadastrar', label: 'Cadastrar TV', icon: Tv }
          : { id: 'cadastrar_equipamento', label: 'Cadastrar Equipamento', icon: PlusCircle },
        { id: 'cadastrar_unidade', label: 'Cadastrar Unidade', icon: Building2 },
        { id: 'import_csv', label: 'Importar CSV', icon: Upload },
      ],
    },
    {
      label: 'Gestao',
      items: [
        { id: 'garantias', label: 'Garantias', icon: ShieldCheck },
        { id: 'manutencoes', label: 'Manutencoes', icon: Wrench },
        { id: 'planta', label: 'Planta Interativa', icon: Layers },
      ],
    },
  ];
}

export function Sidebar({ current, onNavigate, onLogout, userName = 'admin', modulo }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navSections = getNavSections(modulo);

  useEffect(() => {
    setMobileOpen(false);
  }, [current]);

  return (
    <>
      <button onClick={() => setMobileOpen(true)} className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white shadow-lg lg:hidden" aria-label="Abrir menu">
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-black text-white transition-transform duration-300 lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="relative overflow-hidden border-b border-white/10 px-6 py-6">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-selfit-500/20 blur-2xl" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-selfit-500 to-selfit-700 shadow-lg shadow-selfit-500/30">
                {modulo === 'tvs' ? <Tv className="h-6 w-6 text-white" /> : <Cpu className="h-6 w-6 text-white" />}
              </div>
              <div>
                <h1 className="font-display text-xl font-extrabold leading-tight text-selfit-500">SELFIT</h1>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{modulo === 'tvs' ? 'Painel TVs' : 'Painel TI'}</p>
              </div>
            </div>
            <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Fechar menu"><X className="h-5 w-5" /></button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Gestao de Inventario v2.0</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4 scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.label} className="mb-1">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">{section.label}</p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = current === item.id;
                return (
                  <button key={item.id} onClick={() => onNavigate(item.id)}
                    className={cn('group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all', active ? 'bg-selfit-500 text-white shadow-lg shadow-selfit-500/20' : 'text-slate-300 hover:bg-white/5 hover:text-white')}>
                    <Icon className={cn('h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110', active ? 'text-white' : 'text-slate-400 group-hover:text-selfit-400')} />
                    <span className="truncate">{item.label}</span>
                    {active && <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-selfit-500 text-sm font-bold text-white">{userName.charAt(0).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="truncate text-xs text-slate-400">Administrador</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-selfit-400 transition-colors hover:bg-selfit-500/10 hover:text-selfit-300">
            <LogOut className="h-5 w-5" /> Sair
          </button>
        </div>
      </aside>
    </>
  );
}
