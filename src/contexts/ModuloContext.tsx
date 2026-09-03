import { createContext, useContext, useState, ReactNode } from 'react';
import type { ModuloTipo } from '@/lib/supabase';

interface ModuloContextType {
  modulo: ModuloTipo;
  isTvOnly: boolean;
  setModulo: (mod: ModuloTipo | null) => void;
}

const ModuloContext = createContext<ModuloContextType>({
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

export const useModulo = () => useContext(ModuloContext);