// Arquivo: src/main.tsx
// Serve para: ponto de entrada do React; monta o App no elemento root do HTML.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/app/App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
