/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL backend API, tanpa trailing slash. Contoh: https://api-texora.emelka.my.id */
  readonly VITE_API_BASE_URL: string
  /** OAuth 2.0 Client ID untuk Google Identity Services. */
  readonly VITE_GOOGLE_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
