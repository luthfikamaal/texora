/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL backend API, tanpa trailing slash. Contoh: https://api-texora.emelka.my.id */
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
