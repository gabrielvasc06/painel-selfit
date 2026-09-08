/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { InventoryProvider } from '@/contexts/InventoryContext';
import { ModuloProvider, useModulo } from '@/contexts/ModuloContext';
import type { ModuloTipo } from '@/lib/inventoryTypes';
import { Sidebar, type PageId } from '@/components/Sidebar';
import { CadastrarCameraPage } from '@/screens/CadastrarCameraPage';
import { CadastrarEquipamentoPage } from '@/screens/CadastrarEquipamentoPage';
import { CadastrarPage } from '@/screens/CadastrarPage';
import { CadastrarUnidadePage } from '@/screens/CadastrarUnidadePage';
import { CamerasPage } from '@/screens/CamerasPage';
import { ConsultarPage } from '@/screens/ConsultarPage';
import { DashboardPage } from '@/screens/DashboardPage';
import { EquipamentosPage } from '@/screens/EquipamentosPage';
import { GarantiasPage } from '@/screens/GarantiasPage';
import { HistoricoPage } from '@/screens/HistoricoPage';
import { LoginScreen } from '@/screens/LoginScreen';
import { ManutencoesPage } from '@/screens/ManutencoesPage';
import { ModuleSelectScreen } from '@/screens/ModuleSelectScreen';
import { PlantaPage } from '@/screens/PlantaPage';
import { RegiaoDetailPage } from '@/screens/RegiaoDetailPage';
import { RegiaoPage } from '@/screens/RegiaoPage';
import { UnidadeDetailPage } from '@/screens/UnidadeDetailPage';

export { useModulo };

const validPages: PageId[] = ['dashboard', 'consultar', 'cadastrar', 'cadastrar_unidade', 'cadastrar_equipamento', 'equipamentos', 'regiao', 'garantias', 'manutencoes', 'planta'];

const pageMeta: Record<ModuloTipo, Record<PageId, { title: string; subtitle: string }>> = {
  tvs: {
    dashboard: { title: 'Painel Principal', subtitle: 'Visao geral das TVs' },
    consultar: { title: 'Consultar Unidades', subtitle: 'Busque unidades por estado e nome' },
    cadastrar: { title: 'Cadastrar TV', subtitle: 'Adicione uma TV ao inventario' },
    cadastrar_unidade: { title: 'Cadastrar Unidade', subtitle: 'Cadastro manual ou importacao de planilha' },
    cadastrar_equipamento: { title: 'Cadastrar TV', subtitle: 'Adicione uma TV ao inventario' },
    equipamentos: { title: 'TVs', subtitle: 'Lista de TVs cadastradas' },
    regiao: { title: 'Por Regiao', subtitle: 'Estados organizados por regiao' },
    garantias: { title: 'Garantias', subtitle: 'Alertas de garantia de TVs' },
    manutencoes: { title: 'Manutencoes', subtitle: 'Historico de TVs' },
    planta: { title: 'Monitoramento', subtitle: 'Acompanhamento visual de TVs' },
  },
  equipamentos: {
    dashboard: { title: 'Painel de Equipamentos', subtitle: 'Visao geral de equipamentos' },
    consultar: { title: 'Consultar Unidades', subtitle: 'Unidades filtradas por estado e nome' },
    cadastrar: { title: 'Cadastrar Equipamento', subtitle: 'Adicione ao inventario' },
    cadastrar_unidade: { title: 'Cadastrar Unidade', subtitle: 'Disponivel no modulo de TVs' },
    cadastrar_equipamento: { title: 'Cadastrar Equipamento', subtitle: 'Registre ativos de infraestrutura' },
    equipamentos: { title: 'Consultar Equipamentos', subtitle: 'Dados dos equipamentos cadastrados' },
    regiao: { title: 'Por Regiao', subtitle: 'Distribuicao por estado' },
    garantias: { title: 'Garantias', subtitle: 'Alertas de garantia de equipamentos' },
    manutencoes: { title: 'Manutencoes', subtitle: 'Historico de equipamentos' },
    planta: { title: 'Monitoramento', subtitle: 'Acompanhamento visual de equipamentos' },
  },
  cameras: {
    dashboard: { title: 'Painel de Cameras', subtitle: 'Visao geral do CFTV' },
    consultar: { title: 'Consultar Unidades', subtitle: 'Unidades com filtros para cameras' },
    cadastrar: { title: 'Cadastrar Camera', subtitle: 'Registre cameras no inventario' },
    cadastrar_unidade: { title: 'Cadastrar Unidade', subtitle: 'Disponivel no modulo de TVs' },
    cadastrar_equipamento: { title: 'Cadastrar Camera', subtitle: 'Registre pontos de camera' },
    equipamentos: { title: 'Consultar Cameras', subtitle: 'Dados das cameras cadastradas' },
    regiao: { title: 'Por Regiao', subtitle: 'Distribuicao de cameras por estado' },
    garantias: { title: 'Garantias', subtitle: 'Visao de contratos e cobertura de cameras' },
    manutencoes: { title: 'Manutencoes', subtitle: 'Historico de cameras' },
    planta: { title: 'Monitoramento', subtitle: 'Acompanhamento visual de cameras' },
  },
};

function readStoredModule(): ModuloTipo | null {
  const stored = localStorage.getItem('selfit.currentModule');
  return stored === 'tvs' || stored === 'equipamentos' || stored === 'cameras' ? stored : null;
}

function readStoredPage(): PageId {
  const stored = localStorage.getItem('selfit.page');
  return validPages.includes(stored as PageId) ? stored as PageId : 'dashboard';
}

function readStoredDrill(): { type: string; id: string } | null {
  const stored = localStorage.getItem('selfit.drill');
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    return typeof parsed?.type === 'string' && typeof parsed?.id === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function moduleBadge(modulo: ModuloTipo) {
  if (modulo === 'tvs') return 'Modulo: Gestao de TVs';
  if (modulo === 'cameras') return 'Modulo: Gestao de Cameras';
  return 'Modulo: Gestao de Equipamentos';
}

function AppShell() {
  const [authed, setAuthed] = useState(() => localStorage.getItem('selfit.authenticated') === 'true');
  const [userName, setUserName] = useState(() => localStorage.getItem('selfit.userName') ?? '');
  const [currentModule, setCurrentModule] = useState<ModuloTipo | null>(readStoredModule);
  const [page, setPage] = useState<PageId>(readStoredPage);
  const [drill, setDrill] = useState<{ type: string; id: string } | null>(readStoredDrill);

  useEffect(() => {
    localStorage.setItem('selfit.authenticated', String(authed));
  }, [authed]);

  useEffect(() => {
    if (userName) localStorage.setItem('selfit.userName', userName);
    else localStorage.removeItem('selfit.userName');
  }, [userName]);

  useEffect(() => {
    if (currentModule) localStorage.setItem('selfit.currentModule', currentModule);
    else localStorage.removeItem('selfit.currentModule');
  }, [currentModule]);

  useEffect(() => {
    localStorage.setItem('selfit.page', page);
  }, [page]);

  useEffect(() => {
    if (drill) localStorage.setItem('selfit.drill', JSON.stringify(drill));
    else localStorage.removeItem('selfit.drill');
  }, [drill]);

  const handleLogout = () => {
    setAuthed(false);
    setCurrentModule(null);
    setUserName('');
    setPage('dashboard');
    setDrill(null);
    localStorage.removeItem('selfit.authenticated');
    localStorage.removeItem('selfit.userName');
    localStorage.removeItem('selfit.currentModule');
    localStorage.removeItem('selfit.page');
    localStorage.removeItem('selfit.drill');
  };

  if (!authed) {
    return <LoginScreen onLogin={(name) => { setUserName(name || 'admin'); setAuthed(true); }} />;
  }

  if (!currentModule) {
    return (
      <ModuleSelectScreen
        userName={userName || 'admin'}
        onSelectModulo={(modulo) => {
          setCurrentModule(modulo);
          setPage('dashboard');
          setDrill(null);
        }}
        onLogout={handleLogout}
      />
    );
  }

  const meta = pageMeta[currentModule][page] || { title: 'Sistema', subtitle: 'Painel Selfit' };
  const title = drill?.type === 'historico'
    ? 'Historico de Alteracoes'
    : drill?.type === 'unidade'
      ? 'Detalhes da Unidade'
      : drill?.type === 'regiao-detail'
        ? 'Detalhes da Regiao'
        : meta.title;
  const subtitle = drill?.type ? 'Dados separados pelo modulo selecionado' : meta.subtitle;

  const navigate = (target: PageId) => {
    setDrill(null);
    setPage(target);
  };

  return (
    <ModuloProvider modulo={currentModule} setModulo={setCurrentModule}>
      <div className="min-h-screen bg-slate-50">
        <Sidebar
          current={page}
          onNavigate={navigate}
          onLogout={handleLogout}
          userName={userName || 'admin'}
          modulo={currentModule}
        />

        <div className="lg:pl-72">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md lg:px-8">
            <div className="ml-10 lg:ml-0">
              <div className="mb-1">
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {moduleBadge(currentModule)}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-500">{subtitle}</p>
            </div>

            <button
              onClick={() => setCurrentModule(null)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <LayoutGrid className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline">Trocar Modulo</span>
            </button>
          </header>

          <main className="p-6 lg:p-8">
            <div key={`${currentModule}-${page}-${drill?.type ?? ''}-${drill?.id ?? ''}`} className="animate-fade-in">
              {drill?.type === 'historico' && <HistoricoPage onBack={() => setDrill(null)} />}
              {drill?.type === 'unidade' && <UnidadeDetailPage unidadeId={drill.id} onBack={() => setDrill(null)} />}
              {drill?.type === 'regiao-detail' && <RegiaoDetailPage regiaoId={drill.id} onBack={() => setDrill(null)} />}

              {!drill && page === 'dashboard' && <DashboardPage onVerHistorico={() => setDrill({ type: 'historico', id: '' })} />}
              {!drill && page === 'consultar' && <ConsultarPage onOpenUnidade={(id) => setDrill({ type: 'unidade', id })} />}
              {!drill && page === 'cadastrar' && <CadastrarPage />}
              {!drill && page === 'cadastrar_unidade' && <CadastrarUnidadePage />}
              {!drill && page === 'cadastrar_equipamento' && (currentModule === 'cameras' ? <CadastrarCameraPage /> : <CadastrarEquipamentoPage />)}
              {!drill && page === 'equipamentos' && (currentModule === 'cameras' ? <CamerasPage /> : <EquipamentosPage />)}
              {!drill && page === 'garantias' && <GarantiasPage />}
              {!drill && page === 'manutencoes' && <ManutencoesPage />}
              {!drill && page === 'planta' && <PlantaPage />}
              {!drill && page === 'regiao' && <RegiaoPage onOpenRegiao={(id) => setDrill({ type: 'regiao-detail', id })} />}
            </div>
          </main>
        </div>
      </div>
    </ModuloProvider>
  );
}

export default function App() {
  return (
    <InventoryProvider>
      <AppShell />
    </InventoryProvider>
  );
}
