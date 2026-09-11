import { useMemo, useState } from 'react';
import { AlertTriangle, Calendar, Camera, CheckCircle2, Edit2, Search, Trash2, Video, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useInventory } from '@/providers/InventoryProvider';
import { cameraMatchesSearch } from '@/services/inventory/inventoryLogic';
import { statusCameraLabels, tipoCameraLabels, type Camera as CameraType } from '@/services/inventory/inventoryTypes';

export function CamerasPage() {
  const { regioes, getUnidade, getCamerasComUnidade, updateCamera, deleteCamera } = useInventory();
  const [search, setSearch] = useState('');
  const [selectedRegiao, setSelectedRegiao] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [editingCamera, setEditingCamera] = useState<CameraType | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    setor: '',
    marca: '',
    modelo: '',
    status: 'ativa',
  });

  const cameras = getCamerasComUnidade();
  const filteredCameras = useMemo(() => (
    cameras.filter((camera) => {
      const unidade = getUnidade(camera.unidade_id);
      const matchesSearch = cameraMatchesSearch(camera, search, unidade?.nome ?? '');
      const matchesStatus = selectedStatus === 'all' || camera.status === selectedStatus;
      const matchesRegiao = selectedRegiao === 'all' || unidade?.regioes?.sigla === selectedRegiao || unidade?.uf === selectedRegiao;
      return matchesSearch && matchesStatus && matchesRegiao;
    })
  ), [cameras, getUnidade, search, selectedRegiao, selectedStatus]);

  const totalAtivas = cameras.filter((camera) => camera.status === 'ativa').length;
  const totalManutencao = cameras.filter((camera) => camera.status === 'manutencao').length;
  const totalInativas = cameras.filter((camera) => camera.status === 'inativa').length;

  const openEdit = (camera: CameraType) => {
    setEditingCamera(camera);
    setFormData({
      nome: camera.nome,
      setor: camera.setor ?? '',
      marca: camera.marca ?? '',
      modelo: camera.modelo ?? '',
      status: camera.status,
    });
  };

  const saveEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingCamera) return;
    updateCamera(editingCamera.id, {
      nome: formData.nome,
      setor: formData.setor || null,
      marca: formData.marca || null,
      modelo: formData.modelo || null,
      status: formData.status as CameraType['status'],
    });
    setEditingCamera(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Cameras</h1>
            <p className="text-sm text-slate-500">Consulta e acompanhamento do CFTV</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 animate-fade-in-up">
        <MetricCard label="Total Cameras" value={cameras.length} icon={Video} />
        <MetricCard label="Ativas" value={totalAtivas} icon={CheckCircle2} className="border-l-4 border-l-emerald-500" valueClass="text-emerald-700" />
        <MetricCard label="Manutencao" value={totalManutencao} icon={AlertTriangle} className="border-l-4 border-l-amber-500" valueClass="text-amber-700" />
        <MetricCard label="Inativas / Offline" value={totalInativas} icon={XCircle} className="border-l-4 border-l-red-500" valueClass="text-red-700" />
      </div>

      <Card className="p-4 animate-fade-in-up">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, setor ou unidade..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-selfit-500/20"
            />
          </div>
          <select value={selectedRegiao} onChange={(event) => setSelectedRegiao(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <option value="all">Todas Regioes</option>
            {regioes.map((regiao) => <option key={regiao.id} value={regiao.sigla}>{regiao.sigla}</option>)}
          </select>
          <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <option value="all">Todos os Status</option>
            <option value="ativa">Ativa</option>
            <option value="manutencao">Em Manutencao</option>
            <option value="inativa">Inativa / Offline</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Camera / Identificacao</th>
                <th className="px-6 py-3">Unidade / Setor</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Marca / Modelo</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Atualizado</th>
                <th className="px-6 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCameras.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Nenhuma camera encontrada.</td>
                </tr>
              ) : (
                filteredCameras.map((camera) => {
                  const unidade = getUnidade(camera.unidade_id);
                  return (
                    <tr key={camera.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-selfit-500" />
                          {camera.nome}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{unidade?.nome ?? '-'}</div>
                        <div className="text-xs text-slate-400">{camera.setor ?? 'Setor nao informado'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {tipoCameraLabels[camera.tipo] ?? camera.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>{camera.marca ?? '-'}</div>
                        <div className="text-xs text-slate-400">{camera.modelo ?? ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          camera.status === 'ativa' ? 'bg-emerald-50 text-emerald-700' :
                          camera.status === 'manutencao' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            camera.status === 'ativa' ? 'bg-emerald-500' :
                            camera.status === 'manutencao' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          {statusCameraLabels[camera.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDateTime(camera.updated_at ?? camera.created_at)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(camera)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteCamera(camera.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editingCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-display text-lg font-bold text-slate-900">Editar Camera</h2>
              <button onClick={() => setEditingCamera(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={saveEdit} className="mt-4 space-y-4">
              <input required value={formData.nome} onChange={(event) => setFormData({ ...formData, nome: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Nome da camera" />
              <div className="grid grid-cols-2 gap-3">
                <input value={formData.setor} onChange={(event) => setFormData({ ...formData, setor: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Setor" />
                <select value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="ativa">Ativa</option>
                  <option value="manutencao">Em Manutencao</option>
                  <option value="inativa">Inativa / Offline</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={formData.marca} onChange={(event) => setFormData({ ...formData, marca: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Marca" />
                <input value={formData.modelo} onChange={(event) => setFormData({ ...formData, modelo: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Modelo" />
              </div>
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={() => setEditingCamera(null)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, className = '', valueClass = 'text-slate-900' }: { label: string; value: number; icon: typeof Camera; className?: string; valueClass?: string }) {
  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</p>
    </Card>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
