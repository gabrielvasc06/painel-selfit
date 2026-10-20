import { createContext, type ReactNode } from 'react';
import type { ApiClient } from '@/services/apiTypes';

export const ApiContext = createContext<ApiClient | null>(null);
// A interface recebe o contrato. Somente App.tsx escolhe o adaptador HTTP real.
export function ApiProvider({ api, children }: { api: ApiClient; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
