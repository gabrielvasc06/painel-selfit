import { useState, useEffect } from 'react';
import { supabase, type ModuloTipo } from './lib/supabase';
import { ModuloProvider, useModulo } from './contexts/ModuloContext';
import { LoginScreen } from './screens/LoginScreen';
import { ModuleSelectScreen } from './screens/ModuleSelectScreen';
import { Sidebar, type PageId } from './components/Sidebar';
import { DashboardPage } from './screens/DashboardPage';
import { HistoricoPage } from './screens/HistoricoPage';
import { ConsultarPage } from './screens/ConsultarPage';
import { UnidadeDetailPage } from './screens/UnidadeDetailPage';
import { CadastrarPage } from './screens/CadastrarPage';
import { CadastrarUnidadePage } from './screens/CadastrarUnidadePage';
import { CadastrarEquipamentoPage } from './screens/CadastrarEquipamentoPage';
import { EquipamentosPage } from './screens/EquipamentosPage';
import { GarantiasPage } from './screens/GarantiasPage';
import { ManutencoesPage } from './screens/ManutencoesPage';
import { PlantaPage } from './screens/PlantaPage';
import { RegiaoPage } from './screens/RegiaoPage';
import { RegiaoDetailPage } from './screens/RegiaoDetailPage';
import { ImportCsvPage } from './screens/ImportCsvPage';
import { LayoutGrid } from 'lucide-react';

// Reexporta useModulo para que páginas como DashboardPage consigam importar de '@/App'
export { useModulo };

const pageMetaTVs: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Painel Principal', subtitle: 'Visão geral das TVs' },
  consultar: { title: 'Consultar Unidades', subtitle: 'Busque e filtre as unidades e TVs' },
  cadastrar: { title: 'Cadastrar TV', subtitle: 'Adicione uma TV ao inventário' },
  cadastrar_unidade: { title: 'Cadastrar Unidade', subtitle: 'Cadastre uma nova unidade' },
  cadastrar_equipamento: { title: 'Cadastrar Equipamento', subtitle: 'Registre itens' },
  equipamentos: { title: 'Gestão de TVs', subtitle: 'Lista de TVs e displays cadastrados' },
  regiao: { title: 'Por Região', subtitle: 'Distribuição regional das TVs' },
  garantias: { title: 'Garantias', subtitle: 'Alertas de garantia de TVs' },
  manutencoes: { title: 'Manutenções', subtitle: 'Histórico de trocas e chamados de TVs' },
  planta: { title: 'Planta Interativa', subtitle: 'Posicionamento de TVs na planta' },
  importar_csv: { title: 'Importar CSV', subtitle: 'Importação em lote de TVs' },
};

const pageMetaTI: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Painel de TI', subtitle: 'Visão geral de infraestrutura e ativos de rede' },
  consultar: { title: 'Consultar Unidades', subtitle: 'Equipamentos de TI por unidade' },
  cadastrar: { title: 'Cadastrar Equipamento', subtitle: 'Adicione ao inventário' },
  cadastrar_unidade: { title: 'Cadastrar Unidade', subtitle: 'Cadastre uma nova unidade' },
  cadastrar_equipamento: { title: 'Cadastrar Equipamento de TI', subtitle: 'Registre periféricos, computadores e racks' },
  equipamentos: { title: 'Equipamentos de TI', subtitle: 'Periféricos, computadores e redes' },
  regiao: { title: 'Por Região', subtitle: 'Distribuição de ativos de TI por região' },
  garantias: { title: 'Garantias de TI', subtitle: 'Alertas de garantia de infraestrutura' },
  manutencoes: { title: 'Manutenções de TI', subtitle: 'Histórico de manutenções de TI' },
  planta: { title: 'Planta Interativa', subtitle: 'Posicionamento de switches, catracas e APs' },
  importar_csv: { title: 'Importar CSV', subtitle: 'Importação em lote de equipamentos de TI' },
};

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [userName, setUserName] = useState('');
  const [currentModule, setCurrentModule] = useState<ModuloTipo | null>(null);
  const [page, setPage] = useState<PageId | 'importar_csv'>('dashboard');
  const [drill, setDrill] = useState<{ type: string; id: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAuthed(true);
        const meta = data.session.user.user_metadata;
        setUserName(meta?.name ?? data.session.user.email?.replace('@selfit.com.br', '') ?? 'admin');
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthed(true);
        const meta = session.user.user_metadata;
        setUserName(meta?.name ?? session.user.email?.replace('@selfit.com.br', '') ?? 'admin');
      } else {
        setAuthed(false);
        setCurrentModule(null);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthed(false);
    setCurrentModule(null);
  };

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  if (!currentModule) {
    return (
      <ModuleSelectScreen
        userName={userName}
        onSelectModulo={(mod) => {
          setCurrentModule(mod);
          setPage('dashboard');
          setDrill(null);
        }}
        onLogout={handleLogout}
      />
    );
  }

  const metaMap = currentModule === 'tvs' ? pageMetaTVs : pageMetaTI;
  const meta = metaMap[page] || { title: 'Sistema', subtitle: 'Painel Selfit' };

  let title = meta.title;
  let subtitle = meta.subtitle;

  if (drill?.type === 'historico') {
    title = 'Histórico de Alterações';
    subtitle = 'Registro de auditoria';
  } else if (drill?.type === 'unidade') {
    title = 'Detalhes da Unidade';
    subtitle = currentModule === 'tvs' ? 'Dados e TVs da unidade' : 'Equipamentos de TI da unidade';
  } else if (drill?.type === 'regiao-detail') {
    title = 'Detalhes da Região';
    subtitle = 'Distribuição regional de ativos';
  }

  const navigate = (p: PageId | 'importar_csv') => {
    setDrill(null);
    setPage(p as any);
  };

  return (
    <ModuloProvider modulo={currentModule} setModulo={setCurrentModule}>
      <div className="min-h-screen bg-slate-50">
        <Sidebar
          current={page as PageId}
          onNavigate={(p) => navigate(p)}
          onLogout={handleLogout}
          userName={userName}
          modulo={currentModule}
        />

        <div className="lg:pl-72">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md lg:px-8">
            <div className="ml-10 lg:ml-0">
              <div className="mb-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    currentModule === 'tvs'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {currentModule === 'tvs' ? 'Módulo: Gestão de TVs' : 'Módulo: Equipamentos de TI'}
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
              <span className="hidden sm:inline">Trocar Módulo</span>
            </button>
          </header>

          <main className="p-6 lg:p-8">
            <div key={`${currentModule}-${page}-${drill?.type ?? ''}-${drill?.id ?? ''}`} className="animate-fade-in">
              {drill?.type === 'historico' && <HistoricoPage onBack={() => setDrill(null)} />}
              {drill?.type === 'unidade' && (
                <UnidadeDetailPage unidadeId={drill.id} onBack={() => setDrill(null)} />
              )}
              {drill?.type === 'regiao-detail' && (
                <RegiaoDetailPage regiaoId={drill.id} onBack={() => setDrill(null)} />
              )}

              {!drill && page === 'dashboard' && (
                <DashboardPage onVerHistorico={() => setDrill({ type: 'historico', id: '' })} />
              )}
              {!drill && page === 'consultar' && (
                <ConsultarPage onOpenUnidade={(id) => setDrill({ type: 'unidade', id })} />
              )}
              {!drill && page === 'cadastrar' && <CadastrarPage />}
              {!drill && page === 'cadastrar_unidade' && <CadastrarUnidadePage />}
              {!drill && page === 'cadastrar_equipamento' && <CadastrarEquipamentoPage />}
              {!drill && page === 'equipamentos' && <EquipamentosPage />}
              {!drill && page === 'garantias' && <GarantiasPage />}
              {!drill && page === 'manutencoes' && <ManutencoesPage />}
              {!drill && page === 'planta' && <PlantaPage />}
              {!drill && page === 'regiao' && (
                <RegiaoPage onOpenRegiao={(id) => setDrill({ type: 'regiao-detail', id })} />
              )}
              {!drill && page === 'importar_csv' && <ImportCsvPage />}
            </div>
          </main>
        </div>
      </div>
    </ModuloProvider>
  );
}