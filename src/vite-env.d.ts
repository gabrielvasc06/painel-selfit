// Arquivo: src/vite-env.d.ts
// Serve para: declara tipos globais do Vite e variaveis de ambiente usadas pelo front.

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SELFIT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
