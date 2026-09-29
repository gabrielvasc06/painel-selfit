import { useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { InventoryProvider } from '@/providers/InventoryProvider';
import { ModuloProvider } from '@/providers/ModuloProvider';
import { getModuleBadge, pageMeta } from '@/routes/pageRegistry';
import type { ModuloTipo } from '@/services/inventory/inventoryTypes';
import { Sidebar, type PageId } from '@/components/layout/Sidebar';
import { CadastrarCameraPage } from '@/pages/CadastrarCameraPage';
import { CadastrarEquipamentoPage } from '@/pages/CadastrarEquipamentoPage';
import { CadastrarPage } from '@/pages/CadastrarPage';
import { CadastrarUnidadePage } from '@/pages/CadastrarUnidadePage';
import { CamerasPage } from '@/pages/CamerasPage';
import { ConsultarPage } from '@/pages/ConsultarPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EquipamentosPage } from '@/pages/EquipamentosPage';
import { GarantiasPage } from '@/pages/GarantiasPage';
import { HistoricoPage } from '@/pages/HistoricoPage';
import { LoginScreen } from '@/pages/LoginScreen';
import { ManutencoesPage } from '@/pages/ManutencoesPage';
import { ModuleSelectScreen } from '@/pages/ModuleSelectScreen';
import { RegiaoDetailPage } from '@/pages/RegiaoDetailPage';
import { RegiaoPage } from '@/pages/RegiaoPage';
import { UnidadeDetailPage } from '@/pages/UnidadeDetailPage';
import { authenticate, clearAuthToken, getAuthToken, sessionExpiredEvent } from '@/services/api';

function AppShell() {
  const [authed, setAuthed] = useState(() => Boolean(getAuthToken()));
  const [userName, setUserName] = useState('');
  const [currentModule, setCurrentModule] = useState<ModuloTipo | null>(null);
  const [page, setPage] = useState<PageId>('dashboard');
  const [previousPage, setPreviousPage] = useState<PageId>('dashboard');
  const [drill, setDrill] = useState<{ type: string; id: string } | null>(null);

  useEffect(() => {
    const expireSession = () => {
      setAuthed(false);
      setUserName('');
      setCurrentModule(null);
      setPage('dashboard');
      setDrill(null);
    };
    window.addEventListener(sessionExpiredEvent, expireSession);
    return () => window.removeEventListener(sessionExpiredEvent, expireSession);
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    setAuthed(false);
    setCurrentModule(null);
    setUserName('');
    setPage('dashboard');
    setDrill(null);
  };

  if (!authed) {
    return <LoginScreen onLogin={async (username, password) => {
      await authenticate(username, password);
      setUserName(username.trim().toUpperCase());
      setAuthed(true);
    }} />;
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
    setPreviousPage(page);
    setDrill(null);
    setPage(target);
  };

  const navigateBack = () => {
    setDrill(null);
    setPage(previousPage === page ? 'dashboard' : previousPage);
  };

  return (
    <ModuloProvider modulo={currentModule} setModulo={setCurrentModule}>
      <div className="min-h-dvh bg-slate-50">
        <Sidebar
          current={page}
          onNavigate={navigate}
          onLogout={handleLogout}
          userName={userName || 'admin'}
          modulo={currentModule}
        />

        <div className="min-h-dvh lg:pl-72">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md lg:px-8">
            <div className="ml-10 lg:ml-0">
              <div className="mb-1">
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {getModuleBadge(currentModule)}
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

          <main className="min-h-[calc(100dvh-5.5rem)] overflow-visible p-4 sm:p-6 lg:p-8">
            <div key={`${currentModule}-${page}-${drill?.type ?? ''}-${drill?.id ?? ''}`} className="min-w-0">
              {drill?.type === 'historico' && <HistoricoPage onBack={() => setDrill(null)} />}
              {drill?.type === 'unidade' && <UnidadeDetailPage unidadeId={drill.id} onBack={() => setDrill(null)} />}
              {drill?.type === 'regiao-detail' && <RegiaoDetailPage regiaoId={drill.id} onBack={() => setDrill(null)} />}

              {!drill && page === 'dashboard' && <DashboardPage />}
              {!drill && page === 'consultar' && <ConsultarPage />}
              {!drill && page === 'cadastrar' && <CadastrarPage />}
              {!drill && page === 'cadastrar_unidade' && <CadastrarUnidadePage />}
              {!drill && page === 'cadastrar_equipamento' && (currentModule === 'cameras' ? <CadastrarCameraPage /> : <CadastrarEquipamentoPage />)}
              {!drill && page === 'equipamentos' && (currentModule === 'cameras' ? <CamerasPage /> : <EquipamentosPage />)}
              {!drill && page === 'garantias' && <GarantiasPage onBack={navigateBack} />}
              {!drill && page === 'manutencoes' && <ManutencoesPage onBack={navigateBack} />}
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
