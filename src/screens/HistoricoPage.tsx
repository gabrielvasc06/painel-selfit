import { ArrowLeft, Building, Calendar, Clock, History, MapPin, Tv, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { useInventory } from '@/contexts/InventoryContext';
import { useModulo } from '@/App';

export function HistoricoPage({ onBack }: { onBack: () => void }) {
  const { modulo } = useModulo();
  const { historicos } = useInventory();
  const items = historicos.filter((item) => item.modulo === modulo);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-selfit-600">
        <ArrowLeft className="h-4 w-4" /> Voltar ao Painel
      </button>

      <div className="flex items-center gap-3 rounded-2xl bg-black px-6 py-5 shadow-lg animate-fade-in">
        <History className="h-6 w-6 text-white" />
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Historico de Alteracoes</h1>
          <p className="text-sm text-white/60">Registro do modulo selecionado</p>
        </div>
        <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">{items.length} registros</span>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-slate-400">Nenhum registro encontrado neste modulo.</p></Card>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <Card key={item.id} className="animate-fade-in-up p-5" style={{ animationDelay: `${index * 50}ms` }}>
              <CardContent className="px-0 pt-0">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-selfit-50 px-2.5 py-1 text-xs font-bold text-selfit-700">{item.acao}</span>
                      {item.tv_codigo && (
                        <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          <Tv className="h-3 w-3" /> {item.tv_codigo}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700">{item.detalhe}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      {item.unidade_nome && (
                        <span className="flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-slate-400" /> Unidade: <strong className="text-slate-700">{item.unidade_nome}</strong></span>
                      )}
                      {item.regiao_sigla && (
                        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" /> Estado: <strong className="text-slate-700">{item.regiao_sigla}</strong></span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 space-y-2 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 sm:text-right">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 sm:justify-end">
                      <User className="h-4 w-4 text-selfit-500" /> {item.usuario}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-400 sm:justify-end">
                      <Calendar className="h-3.5 w-3.5" /> {new Date(item.data_alteracao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-400 sm:justify-end">
                      <Clock className="h-3.5 w-3.5" /> {new Date(item.data_alteracao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
