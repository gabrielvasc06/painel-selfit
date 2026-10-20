// Arquivo: vite.config.mjs
// Serve para: configura Vite, React e alias @ para o front.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Principal: 5174 -> 3000. Homologacao: 4173 -> 3001.
// Dev e preview compartilham o proxy para o build nao apontar para outro ambiente.
export default defineConfig(({ mode }) => {
  const homologacao = mode === 'homolog';
  const port = homologacao ? 4173 : 5174;
  const proxy = {
    '/api': { target: `http://127.0.0.1:${homologacao ? 3001 : 3000}`, changeOrigin: true },
  };
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    proxy,
  },
  preview: { host: '0.0.0.0', port, strictPort: true, proxy },
  };
});
