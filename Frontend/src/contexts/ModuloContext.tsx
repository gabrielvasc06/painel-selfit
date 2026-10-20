// Arquivo: Frontend/src/contexts/ModuloContext.tsx
// Serve para: guarda qual modulo esta ativo: TVs, equipamentos ou cameras.

import { createContext, ReactNode } from 'react';
import type { ModuloTipo } from '@/utils/inventoryTypes';

interface ModuloContextType {
  modulo: ModuloTipo;
  isTvOnly: boolean;
  setModulo: (mod: ModuloTipo | null) => void;
}

export const ModuloContext = createContext<ModuloContextType>({
  modulo: 'tvs',
  isTvOnly: true,
  setModulo: () => {},
});

export function ModuloProvider({ 
  children, 
  modulo, 
  setModulo 
}: { 
  children: ReactNode; 
  modulo: ModuloTipo; 
  setModulo: (mod: ModuloTipo | null) => void;
}) {
  return (
    <ModuloContext.Provider
      value={{
        modulo,
        isTvOnly: modulo === 'tvs',
        setModulo,
      }}
    >
      {children}
    </ModuloContext.Provider>
  );
}

