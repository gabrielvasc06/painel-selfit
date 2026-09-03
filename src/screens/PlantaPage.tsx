import { useEffect, useState, useRef, useCallback } from 'react';
import { MapPin, Building2, Upload, Loader2, Cpu, Layers, Trash2, X, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase, type Regiao, type Unidade, type Equipamento, type EquipamentoPosicao, categoriaLabels } from '@/lib/supabase';

type Planta = {
  id: string;
  unidade_id: string;
  arquivo_url: string;
  arquivo_tipo: string | null;
  created_at?: string;
};

const rackCategorias = ['rack','switch','patch_panel','firewall','roteador','nobreak'];

export function PlantaPage() {
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [selectedUnidade, setSelectedUnidade] = useState<Unidade | null>(null);
  const [planta, setPlanta] = useState<Planta | null>(null);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [posicoes, setPosicoes] = useState<EquipamentoPosicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [regiaoFilter, setRegiaoFilter] = useState('all');
  const [hoveredEq, setHoveredEq] = useState<string | null>(null);
  const [rackModal, setRackModal] = useState<Equipamento[] | null>(null);
  const [draggingEq, setDraggingEq] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: regs }, { data: unids }] = await Promise.all([
        supabase.from('regioes').select('*').order('sigla'),
        supabase.from('unidades').select('*').order('nome'),
      ]);
      setRegioes((regs as Regiao[]) ?? []);
      setUnidades((unids as Unidade[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const loadUnidadeData = useCallback(async (unidade: Unidade) => {
    setSelectedUnidade(unidade);
    const [{ data: eqs }, { data: pl }] = await Promise.all([
      supabase.from('equipamentos').select('*').eq('unidade_id', unidade.id).order('nome'),
      supabase.from('plantas').select('*').eq('unidade_id', unidade.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const equipamentosCarregados = (eqs as Equipamento[]) ?? [];
    const { data: pos } = equipamentosCarregados.length > 0
      ? await supabase
        .from('equipamento_posicoes')
        .select('*, equipamentos(*)')
        .in('equipamento_id', equipamentosCarregados.map((equipamento) => equipamento.id))
      : { data: [] as EquipamentoPosicao[] };

    setEquipamentos(equipamentosCarregados);
    setPlanta((pl as Planta) ?? null);
    setPosicoes((pos as EquipamentoPosicao[]) ?? []);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUnidade) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${selectedUnidade.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('plantas-unidades').upload(path, file, { cacheControl: '3600', upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('plantas-unidades').getPublicUrl(path);
      const { data: newPlanta, error: insErr } = await supabase.from('plantas').insert({
        unidade_id: selectedUnidade.id,
        arquivo_url: urlData.publicUrl,
        arquivo_tipo: file.type,
      }).select('*').single();
      if (insErr) throw insErr;
      setPlanta(newPlanta as Planta);
    } catch (err) {
      alert(`Erro: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
      
    }
  };

  const handleImageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !planta || !selectedUnidade) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // If dragging an equipment, place it
    if (draggingEq) {
      const existing = posicoes.find((p) => p.equipamento_id === draggingEq);
      if (existing) {
        await supabase.from('equipamento_posicoes').update({ coord_x: x, coord_y: y }).eq('id', existing.id);
        setPosicoes((prev) => prev.map((p) => p.equipamento_id === draggingEq ? { ...p, coord_x: x, coord_y: y } : p));
      } else {
        const { data } = await supabase.from('equipamento_posicoes').insert({ equipamento_id: draggingEq, planta_id: planta.id, coord_x: x, coord_y: y }).select('*, equipamentos(*)').single();
        if (data) setPosicoes((prev) => [...prev, data as EquipamentoPosicao]);
      }
      setDraggingEq(null);
      return;
    }

    // Click on rack -> show rack diagram
    const rackEq = equipamentos.filter((eq) => eq.categoria === 'rack' || rackCategorias.includes(eq.categoria));
    if (rackEq.length > 0) setRackModal(rackEq.sort((a, b) => (a.posicao_rack_u ?? 0) - (b.posicao_rack_u ?? 0)));
  };

  const removePosicao = async (posId: string) => {
    await supabase.from('equipamento_posicoes').delete().eq('id', posId);
    setPosicoes((prev) => prev.filter((p) => p.id !== posId));
  };

  const filteredUnidades = regiaoFilter === 'all' ? unidades : unidades.filter((u) => (u.uf ?? '') === regiaoFilter || u.regiao_id === regioes.find((r) => r.sigla === regiaoFilter)?.id);
  const unplacedEquipamentos = equipamentos.filter((e) => !posicoes.some((p) => p.equipamento_id === e.id));

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-selfit-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-black bg-white px-6 py-5 shadow-sm animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><MapPin className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Planta Interativa</h1>
          <p className="text-sm text-slate-500">Upload de planta baixa e posicionamento de equipamentos</p>
        </div>
      </div>

      {/* Unit selector */}
      <Card className="animate-fade-in-up p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <select value={regiaoFilter} onChange={(e) => setRegiaoFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700">
            <option value="all">Todas regiões</option>
            {regioes.map((r) => <option key={r.id} value={r.sigla}>{r.sigla}</option>)}
          </select>
          <select value={selectedUnidade?.id ?? ''} onChange={(e) => { const u = filteredUnidades.find((u) => u.id === e.target.value); if (u) loadUnidadeData(u); }} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700">
            <option value="">Selecione uma unidade...</option>
            {filteredUnidades.map((u) => <option key={u.id} value={u.id}>{u.nome} — {u.cidade ?? '—'}</option>)}
          </select>
          {selectedUnidade && (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-selfit-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-selfit-600">
              <Upload className="h-4 w-4" /> Upload Planta
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.svg,image/*,application/pdf" onChange={handleUpload} className="hidden" />
            </label>
          )}
        </div>
      </Card>

      {!selectedUnidade ? (
        <Card className="p-12 text-center"><p className="text-slate-400">Selecione uma unidade para visualizar a planta.</p></Card>
      ) : !planta ? (
        <Card className="animate-fade-in-up border-2 border-dashed border-slate-300 p-12">
          <div className="flex flex-col items-center gap-3 text-center">
            {uploading ? <Loader2 className="h-10 w-10 animate-spin text-selfit-500" /> : <Upload className="h-10 w-10 text-slate-400" />}
            <p className="text-sm font-medium text-slate-600">{uploading ? 'Enviando...' : 'Nenhuma planta cadastrada'}</p>
            <p className="text-xs text-slate-400">Faça upload de um arquivo PDF, PNG ou SVG da planta baixa</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
          {/* Floor plan */}
          <Card className="animate-fade-in-up overflow-hidden" style={{ animationDelay: '80ms' }}>
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-selfit-500" /> {selectedUnidade.nome}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div ref={imageRef} className="relative w-full cursor-crosshair bg-slate-900" style={{ minHeight: '400px' }} onClick={handleImageClick}>
                {planta.arquivo_tipo?.includes('pdf') ? (
                  <iframe src={planta.arquivo_url} className="h-[500px] w-full" title="Planta" />
                ) : (
                  <img src={planta.arquivo_url} alt="Planta baixa" className="h-[500px] w-full object-contain" />
                )}
                {/* Hotspots overlay (only for non-PDF) */}
                {!planta.arquivo_tipo?.includes('pdf') && posicoes.map((p) => {
                  const eq = p.equipamentos;
                  if (!eq) return null;
                  return (
                    <div key={p.id} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.coord_x}%`, top: `${p.coord_y}%` }}
                      onMouseEnter={() => setHoveredEq(p.id)} onMouseLeave={() => setHoveredEq(null)}>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform hover:scale-125 ${eq.categoria === 'rack' ? 'bg-selfit-500' : 'bg-emerald-500'} text-white`}>
                        <Cpu className="h-4 w-4" />
                      </div>
                      {hoveredEq === p.id && (
                        <div className="absolute bottom-full left-1/2 z-20 mb-2 w-48 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl animate-fade-in">
                          <p className="text-sm font-bold text-slate-900">{eq.nome}</p>
                          <p className="text-xs text-slate-500">{categoriaLabels[eq.categoria]}</p>
                          {eq.asset_tag && <p className="text-xs text-slate-400">ID: {eq.asset_tag}</p>}
                          <p className="text-xs text-slate-400">Status: {eq.status}</p>
                          <button onClick={(e) => { e.stopPropagation(); removePosicao(p.id); }} className="mt-1 text-xs text-red-500 hover:underline">Remover</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {draggingEq && (
                  <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-selfit-500 px-4 py-2 text-sm font-semibold text-white shadow-lg animate-pulse">Clique na planta para posicionar</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Equipment list for placement */}
          <Card className="animate-fade-in-up" style={{ animationDelay: '160ms' }}>
            <CardHeader className="border-b border-slate-100"><CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4 text-selfit-500" /> Equipamentos ({equipamentos.length})</CardTitle></CardHeader>
            <CardContent className="pt-4">
              <div className="max-h-[30rem] space-y-2 overflow-y-auto scrollbar-thin">
                {unplacedEquipamentos.length === 0 && posicoes.length > 0 && <p className="py-4 text-center text-xs text-slate-400">Todos os equipamentos estão posicionados.</p>}
                {equipamentos.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Nenhum equipamento cadastrado nesta unidade.</p>}
                {unplacedEquipamentos.map((eq) => (
                  <div key={eq.id} className={`flex items-center gap-2 rounded-xl border p-3 transition-all cursor-pointer ${draggingEq === eq.id ? 'border-selfit-500 bg-selfit-50 ring-2 ring-selfit-500/20' : 'border-slate-100 hover:bg-slate-50'}`} onClick={() => setDraggingEq(eq.id)}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${eq.categoria === 'rack' ? 'bg-selfit-100 text-selfit-600' : 'bg-emerald-100 text-emerald-600'}`}><Cpu className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{eq.nome}</p>
                      <p className="truncate text-xs text-slate-500">{categoriaLabels[eq.categoria]}</p>
                    </div>
                  </div>
                ))}
                {/* Placed equipment */}
                {posicoes.length > 0 && <p className="px-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Posicionados</p>}
                {posicoes.map((p) => {
                  const eq = p.equipamentos;
                  if (!eq) return null;
                  return (
                    <div key={p.id} className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><Cpu className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{eq.nome}</p><p className="truncate text-xs text-slate-500">{categoriaLabels[eq.categoria]}</p></div>
                      <button onClick={() => removePosicao(p.id)} className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  );
                })}
              </div>
              {/* Rack diagram button */}
              {equipamentos.some((e) => rackCategorias.includes(e.categoria)) && (
                <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setRackModal(equipamentos.filter((e) => rackCategorias.includes(e.categoria)).sort((a, b) => (a.posicao_rack_u ?? 0) - (b.posicao_rack_u ?? 0)))}>
                  <Layers className="h-4 w-4" /> Ver Diagrama do Rack
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rack diagram modal */}
      {rackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setRackModal(null)}>
          <Card className="w-full max-w-md p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900">Diagrama do Rack 19"</h2>
              <button onClick={() => setRackModal(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 flex justify-center">
              <div className="w-64 rounded-lg border-4 border-slate-700 bg-slate-800 p-2">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-400"><span>Frente</span><span>19" Rack</span></div>
                {rackModal.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">Nenhum equipamento de rack cadastrado.</p>
                ) : (
                  rackModal.map((eq, i) => (
                    <div key={eq.id} className="group relative mb-1 flex h-10 items-center rounded border border-slate-600 bg-gradient-to-r from-slate-700 to-slate-600 px-3 text-xs font-semibold text-white transition-all hover:from-selfit-600 hover:to-selfit-700" style={{ height: `${Math.max(40, (eq.categoria === 'nobreak' ? 3 : eq.categoria === 'rack' ? 2 : 1) * 20)}px` }}>
                      <span className="absolute left-1 text-[10px] text-slate-400">{eq.posicao_rack_u ? `${eq.posicao_rack_u}U` : `${i + 1}U`}</span>
                      <span className="ml-6">{categoriaLabels[eq.categoria]}</span>
                      <span className="ml-auto text-slate-300">{eq.marca ?? ''}</span>
                      <div className="absolute bottom-full left-1/2 z-20 mb-2 hidden w-44 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-xl group-hover:block">
                        <p className="font-bold">{eq.nome}</p>
                        <p>{eq.marca} {eq.modelo}</p>
                        {eq.asset_tag && <p>ID: {eq.asset_tag}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><Info className="h-3.5 w-3.5" /> Passe o mouse sobre cada item para detalhes.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
