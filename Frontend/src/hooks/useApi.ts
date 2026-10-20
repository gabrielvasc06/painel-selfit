import { useContext } from 'react';
import { ApiContext } from '@/contexts/ApiContext';

export function useApi() {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi deve ser usado dentro de ApiProvider');
  return api;
}
