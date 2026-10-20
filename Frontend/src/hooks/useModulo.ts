import { useContext } from 'react';
import { ModuloContext } from '@/contexts/ModuloContext';

export const useModulo = () => useContext(ModuloContext);