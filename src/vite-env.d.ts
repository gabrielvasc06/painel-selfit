/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SELFIT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
