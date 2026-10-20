import { useApi } from '@/hooks/useApi';
import { useInventario } from '@/hooks/useInventario';


export function AvisoInventario() {
  const { notifyInventoryUpdated } = useApi();
  const { loadError } = useInventario();
  if (!loadError) return null;
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <span>{loadError}</span>
      <button type="button" onClick={notifyInventoryUpdated} className="font-semibold underline">Tentar novamente</button>
    </div>
  );
}
