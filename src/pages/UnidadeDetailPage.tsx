import { useState } from 'react';
import { Archive, ArrowLeft, BadgeCheck, Building, Camera, CheckCircle2, Cpu, FileText, MapPin, Pencil, Save, Trash2, Tv, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DonutChart } from '@/pages/DashboardPage';
import { useInventory } from '@/providers/InventoryProvider';
import { categoriaLabels, moduleLabels, statusEquipLabels, type Equipamento } from '@/services/inventory/inventoryTypes';
import { useModulo } from '@/providers/ModuloProvider';

const statusConfig = {
  ativo: { label: 'Ativo', icon: CheckCircle2, class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  manutencao: { label: 'Manutencao', icon: Wrench, class: 'bg-selfit-100 text-selfit-700 border-selfit-200' },
  inativo: { label: 'Inativo', icon: Archive, class: 'bg-slate-100 text-slate-600 border-slate-200' },
  outros: { label: 'Outros', icon: Archive, class: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-selfit-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-selfit-500/20';

export function UnidadeDetailPage({ unidadeId, onBack }: { unidadeId: string; onBack: () => void }) {
  const { modulo } = useModulo();
  const { getUnidade, getEquipamentosByModulo, cameras, updateEquipamento, deleteEquipamento } = useInventory();
  const unidade = getUnidade(unidadeId);
  const [editing, setEditing] = useState<Equipamento | null>(null);
  const [editForm, setEditForm] = useState({ nome: '', eletromidia_id: '', marca: '', modelo: '', status: 'ativo', observacoes: '' });
  const [toast, setToast] = useState('');

  if (!unidade) {
    return <Card className="p-12 text-center"><p className="text-slate-400">Unidade nao encontrada.</p></Card>;
  }

  const labels = moduleLabels[modulo];
  const MainIcon = modulo === 'tvs' ? Tv : modulo === 'cameras' ? Camera : Cpu;
  const itens = modulo === 'cameras' ? [] : getEquipamentosByModulo(modulo).filter((item) => item.unidade_id === unidadeId);
  const unidadeCameras = cameras.filter((camera) => camera.unidade_id === unidadeId);
  const total = modulo === 'cameras' ? unidadeCameras.length : itens.length;
  const ativos = modulo === 'cameras' ? unidadeCameras.filter((camera) => camera.status === 'ativa').length : itens.filter((item) => item.status === 'ativo').length;
  const manutencao = modulo === 'cameras' ? unidadeCameras.filter((camera) => camera.status === 'manutencao').length : itens.filter((item) => item.status === 'manutencao').length;
  const outros = modulo === 'cameras' ? unidadeCameras.filter((camera) => camera.status === 'inativa').length : itens.filter((item) => item.status === 'outros' || item.status === 'inativo').length;

  const openEdit = (item: Equipamento) => {
    setEditing(item);
    setEditForm({ nome: item.nome, eletromidia_id: item.eletromidia_id ?? '', marca: item.marca ?? '', modelo: item.modelo ?? '', status: item.status, observacoes: item.observacoes ?? '' });
  };

  const saveEdit = () => {
    if (!editing) return;
    updateEquipamento(editing.id, {
      nome: editForm.nome,
      eletromidia_id: editing.categoria === 'TV' ? editForm.eletromidia_id || null : null,
      marca: editForm.marca || null,
      modelo: editForm.modelo || null,
      status: editForm.status as Equipamento['status'],
      observacoes: editForm.observacoes || null,
    });
    setToast(`${labels.item} atualizado.`);
    setEditing(null);
  };

  const removeItem = (item: Equipamento) => {
    deleteEquipamento(item.id);
    setToast(`${labels.item} removido.`);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed right-5 top-20 z-50 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg animate-fade-in">
          {toast}<button className="ml-3 text-slate-400" onClick={() => setToast('')}>x</button>
        </div>
      )}

      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-selfit-600">
        <ArrowLeft className="h-4 w-4" /> Voltar a lista
      </button>

      <div className="flex flex-col gap-4 rounded-2xl border-2 border-black bg-white p-6 shadow-sm animate-fade-in sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white"><Building className="h-7 w-7" /></div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">{unidade.nome}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {unidade.uf ?? unidade.regioes?.sigla} - {unidade.regioes?.nome ?? 'Estado'}</span>
              <span>{unidade.cidade ?? '-'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-selfit-50 px-4 py-3">
          <MainIcon className="h-5 w-5 text-selfit-600" />
          <span className="font-display text-2xl font-bold text-selfit-700">{total}</span>
          <span className="text-sm text-selfit-600">{labels.itemPlural}</span>
        </div>
      </div>

      <Card className="animate-fade-in-up border-slate-200 p-5" style={{ animationDelay: '40ms' }}>
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-selfit-500" />
          <h2 className="font-display text-base font-bold text-slate-900">Dados cadastrais da filial</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <RegistrationItem icon={BadgeCheck} label="CNPJ" value={unidade.cnpj ?? 'Nao informado'} />
          <RegistrationItem icon={MapPin} label="CEP" value={unidade.cep ?? 'Nao informado'} />
          <RegistrationItem icon={MapPin} label="Rua" value={unidade.logradouro ?? 'Nao informado'} />
          <RegistrationItem icon={FileText} label="Numero" value={unidade.numero ?? 'Nao informado'} />
          <RegistrationItem icon={MapPin} label="Municipio / UF" value={`${unidade.cidade ?? 'Nao informado'}${unidade.uf ? ` / ${unidade.uf}` : ''}`} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_1fr]">
        <Card className="animate-fade-in-up p-6">
          <CardHeader className="px-0 pt-0"><CardTitle className="text-lg">Status de {labels.itemPlural}</CardTitle></CardHeader>
          <CardContent className="px-0">
            <div className="flex flex-col items-center gap-4">
              <DonutChart ativas={ativos} manutencao={manutencao} outros={outros} total={total} label={labels.itemPlural} />
              <div className="w-full space-y-2">
                <LegendRow label="Em operacao" value={ativos} total={total} color="bg-emerald-500" />
                <LegendRow label="Manutencao" value={manutencao} total={total} color="bg-selfit-500" />
                <LegendRow label="Outros" value={outros} total={total} color="bg-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {modulo === 'cameras' ? (
          <Card className="animate-fade-in-up overflow-hidden border-black" style={{ animationDelay: '80ms' }}>
            <CardHeader className="border-b-2 border-black"><CardTitle className="text-lg">Cameras Cadastradas</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 font-semibold text-slate-600">Nome</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Setor</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">IP</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Canal DVR</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unidadeCameras.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Nenhuma camera cadastrada nesta unidade.</td></tr>
                  ) : unidadeCameras.map((camera) => (
                    <tr key={camera.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-slate-900">{camera.nome}</td>
                      <td className="px-5 py-3 text-slate-600">{camera.setor ?? '-'}</td>
                      <td className="px-5 py-3 text-slate-600">{camera.ip_address ?? '-'}</td>
                      <td className="px-5 py-3 text-slate-600">{camera.canal_dvr ?? '-'}</td>
                      <td className="px-5 py-3 text-slate-600">{camera.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : (
          <Card className="animate-fade-in-up overflow-hidden border-black" style={{ animationDelay: '80ms' }}>
            <CardHeader className="border-b-2 border-black"><CardTitle className="text-lg">{labels.itemPlural} Cadastrados</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-5 py-3 font-semibold text-slate-600">Nome</th>
                      {modulo === 'tvs' && <th className="px-5 py-3 font-semibold text-slate-600">ID Eletromidia</th>}
                      <th className="px-5 py-3 font-semibold text-slate-600">Categoria</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Modelo</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itens.length === 0 ? (
                      <tr><td colSpan={modulo === 'tvs' ? 6 : 5} className="px-5 py-8 text-center text-slate-400">Nenhum item cadastrado nesta unidade.</td></tr>
                    ) : (
                      itens.map((item) => {
                        const sc = statusConfig[item.status] ?? statusConfig.outros;
                        const StatusIcon = sc.icon;
                        return (
                          <tr key={item.id} className="transition-colors hover:bg-slate-50">
                            <td className="px-5 py-3 font-semibold text-slate-900">{item.nome}</td>
                            {modulo === 'tvs' && <td className="px-5 py-3 text-slate-600">{item.eletromidia_id ?? '-'}</td>}
                            <td className="px-5 py-3 text-slate-600">{categoriaLabels[item.categoria]}</td>
                            <td className="px-5 py-3 text-slate-600">{item.modelo ?? '-'}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${sc.class}`}>
                                <StatusIcon className="h-3.5 w-3.5" /> {sc.label}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-selfit-50 hover:text-selfit-600" title="Atualizar"><Pencil className="h-4 w-4" /></button>
                                <button onClick={() => removeItem(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500" title="Remover"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setEditing(null)}>
          <Card className="w-full max-w-lg p-6 animate-scale-in" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <CardTitle className="text-lg">Atualizar {labels.item}</CardTitle>
              <button onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input value={editForm.nome} onChange={(event) => setEditForm((current) => ({ ...current, nome: event.target.value }))} className={inputClass} placeholder="Nome" />
              <select value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))} className={inputClass}>
                {Object.entries(statusEquipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {editing.categoria === 'TV' && (
                <input value={editForm.eletromidia_id} onChange={(event) => setEditForm((current) => ({ ...current, eletromidia_id: event.target.value }))} className={inputClass} placeholder="ID Eletromidia" />
              )}
              <input value={editForm.marca} onChange={(event) => setEditForm((current) => ({ ...current, marca: event.target.value }))} className={inputClass} placeholder="Marca" />
              <input value={editForm.modelo} onChange={(event) => setEditForm((current) => ({ ...current, modelo: event.target.value }))} className={inputClass} placeholder="Modelo" />
              <textarea value={editForm.observacoes} onChange={(event) => setEditForm((current) => ({ ...current, observacoes: event.target.value }))} className={`${inputClass} resize-none sm:col-span-2`} rows={3} placeholder="Observacoes" />
            </div>
            <div className="mt-5 flex gap-2">
              <Button type="button" onClick={saveEdit}><Save className="h-4 w-4" /> Salvar</Button>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function RegistrationItem({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="break-words text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function LegendRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="flex-1 text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-700">{value} ({total ? ((value / total) * 100).toFixed(0) : 0}%)</span>
    </div>
  );
}
