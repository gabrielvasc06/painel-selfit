import { useEffect, useState } from 'react';
import { Camera, Search, Plus, Trash2, Edit2, Loader2, Video, CheckCircle2, AlertTriangle, XCircle, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase, type Regiao, type Unidade, type Camera as CameraType, tipoCameraLabels, statusCameraLabels } from '@/lib/supabase';

export function CamerasPage() {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedUnidade, setSelectedUnidade] = useState('all');
  const [selectedRegiao, setSelectedRegiao] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraType | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    unidade_id: '',
    tipo: 'ip',
    setor: '',
    ip_address: '',
    canal_dvr: '',
    marca: '',
    modelo: '',
    status: 'ativa',
  });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: camData }, { data: unids }, { data: regs }] = await Promise.all([
      supabase.from('cameras').select('*, unidades(*)').order('created_at', { ascending: false }),
      supabase.from('unidades').select('*').order('nome'),
      supabase.from('regioes').select('*').order('sigla'),
    ]);

    setCameras((camData as CameraType[]) ?? []);
    setUnidades((unids as Unidade[]) ?? []);
    setRegioes((regs as Regiao[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (camera?: CameraType) => {
    if (camera) {
      setEditingCamera(camera);
      setFormData({
        nome: camera.nome ?? '',
        unidade_id: camera.unidade_id ?? '',
        tipo: camera.tipo ?? 'ip',
        setor: camera.setor ?? '',
        ip_address: camera.ip_address ?? '',
        canal_dvr: camera.canal_dvr ? String(camera.canal_dvr) : '',
        marca: camera.marca ?? '',
        modelo: camera.modelo ?? '',
        status: camera.status ?? 'ativa',
      });
    } else {
      setEditingCamera(null);
      setFormData({
        nome: '',
        unidade_id: unidades[0]?.id ?? '',
        tipo: 'ip',
        setor: '',
        ip_address: '',
        canal_dvr: '',
        marca: '',
        modelo: '',
        status: 'ativa',
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.unidade_id) {
      alert('Preencha o nome e a unidade.');
      return;
    }

    setSaving(true);
    const payload = {
      nome: formData.nome,
      unidade_id: formData.unidade_id,
      tipo: formData.tipo,
      setor: formData.setor || null,
      ip_address: formData.ip_address || null,
      canal_dvr: formData.canal_dvr ? Number(formData.canal_dvr) : null,
      marca: formData.marca || null,
      modelo: formData.modelo || null,
      status: formData.status,
    };

    try {
      if (editingCamera) {
        const { error } = await supabase.from('cameras').update(payload).eq('id', editingCamera.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cameras').insert(payload);
        if (error) throw error;
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      alert(`Erro ao salvar: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta câmera?')) return;
    try {
      const { error } = await supabase.from('cameras').delete().eq('id', id);
      if (error) throw error;
      setCameras((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(`Erro ao excluir: ${(err as Error).message}`);
    }
  };

  // Filtragem de lista
  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch = cam.nome.toLowerCase().includes(search.toLowerCase()) ||
      (cam.setor ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (cam.ip_address ?? '').includes(search);
    
    const matchesUnidade = selectedUnidade === 'all' || cam.unidade_id === selectedUnidade;
    const matchesStatus = selectedStatus === 'all' || cam.status === selectedStatus;
    
    const unidadeObj = unidades.find((u) => u.id === cam.unidade_id);
    const matchesRegiao = selectedRegiao === 'all' || unidadeObj?.regiao_id === regioes.find((r) => r.sigla === selectedRegiao)?.id;

    return matchesSearch && matchesUnidade && matchesStatus && matchesRegiao;
  });

  // Métricas
  const totalAtivas = cameras.filter((c) => c.status === 'ativa').length;
  const totalManutencao = cameras.filter((c) => c.status === 'manutencao').length;
  const totalInativas = cameras.filter((c) => c.status === 'inativa').length;

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-selfit-500" /></div>;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">CFTV / Câmeras</h1>
            <p className="text-sm text-slate-500">Gestão e monitoramento do circuito fechado de TV</p>
          </div>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-selfit-500 hover:bg-selfit-600 text-white font-semibold">
          <Plus className="mr-2 h-4 w-4" /> Cadastrar Câmera
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 animate-fade-in-up">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Câmeras</span>
            <Video className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{cameras.length}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-emerald-600">Ativas</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{totalAtivas}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-amber-600">Manutenção</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">{totalManutencao}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-red-600">Inativas / Offline</span>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-700">{totalInativas}</p>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card className="p-4 animate-fade-in-up">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, setor ou IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-selfit-500/20"
            />
          </div>

          <select value={selectedRegiao} onChange={(e) => setSelectedRegiao(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <option value="all">Todas Regiões</option>
            {regioes.map((r) => <option key={r.id} value={r.sigla}>{r.sigla}</option>)}
          </select>

          <select value={selectedUnidade} onChange={(e) => setSelectedUnidade(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <option value="all">Todas Unidades</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>

          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <option value="all">Todos os Status</option>
            <option value="ativa">Ativa</option>
            <option value="manutencao">Em Manutenção</option>
            <option value="inativa">Inativa / Offline</option>
          </select>
        </div>
      </Card>

      {/* Tabela de Câmeras */}
      <Card className="overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-6 py-3">Câmera / Identificação</th>
                <th className="px-6 py-3">Unidade / Setor</th>
                <th className="px-6 py-3">Tipo / Conexão</th>
                <th className="px-6 py-3">Marca / Modelo</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCameras.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Nenhuma câmera encontrada.</td>
                </tr>
              ) : (
                filteredCameras.map((cam) => {
                  const unid = unidades.find((u) => u.id === cam.unidade_id);
                  return (
                    <tr key={cam.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-selfit-500" />
                          {cam.nome}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{unid?.nome ?? '—'}</div>
                        <div className="text-xs text-slate-400">{cam.setor ?? 'Setor não informado'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {tipoCameraLabels[cam.tipo] ?? cam.tipo}
                        </span>
                        {cam.ip_address && <p className="mt-0.5 text-xs text-slate-400 font-mono">IP: {cam.ip_address}</p>}
                        {cam.canal_dvr && <p className="text-xs text-slate-400">Canal: {cam.canal_dvr}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <div>{cam.marca ?? '—'}</div>
                        <div className="text-xs text-slate-400">{cam.modelo ?? ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          cam.status === 'ativa' ? 'bg-emerald-50 text-emerald-700' :
                          cam.status === 'manutencao' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            cam.status === 'ativa' ? 'bg-emerald-500' :
                            cam.status === 'manutencao' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          {statusCameraLabels[cam.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenModal(cam)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(cam.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
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

      {/* Modal de Cadastro / Edição */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-display text-lg font-bold text-slate-900">
                {editingCamera ? 'Editar Câmera' : 'Cadastrar Nova Câmera'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome da Câmera / Ponto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CAM-01 - Catraca Entrada"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-selfit-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unidade *</label>
                  <select
                    value={formData.unidade_id}
                    onChange={(e) => setFormData({ ...formData, unidade_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Setor / Local</label>
                  <input
                    type="text"
                    placeholder="Ex: Recepção, Musculação"
                    value={formData.setor}
                    onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="ip">Câmera IP</option>
                    <option value="analogica">Analógica</option>
                    <option value="dvr_nvr">DVR / NVR</option>
                    <option value="ptz">PTZ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Endereço IP</label>
                  <input
                    type="text"
                    placeholder="192.168.1.100"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Canal DVR</label>
                  <input
                    type="number"
                    placeholder="Ex: 4"
                    value={formData.canal_dvr}
                    onChange={(e) => setFormData({ ...formData, canal_dvr: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Marca</label>
                  <input
                    type="text"
                    placeholder="Ex: Intelbras"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    placeholder="Ex: VIP 1130 B"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="ativa">Ativa</option>
                  <option value="manutencao">Em Manutenção</option>
                  <option value="inativa">Inativa / Offline</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving} className="bg-selfit-500 hover:bg-selfit-600 text-white">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}