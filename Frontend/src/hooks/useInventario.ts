import { useContext } from 'react';
import { InventarioContext } from '@/contexts/InventarioContext';

export function useInventario() {
  const context = useContext(InventarioContext);
  if (!context) throw new Error('useInventario deve ser usado dentro de InventarioProvider');
  return context;
}
