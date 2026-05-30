/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production'
  readonly VITE_ACCESS_TOKEN_TTL_MS: string
  readonly VITE_USER_HTTP_URL?: string
  readonly VITE_BANK_HTTP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Runtime configuration injected by /config.js (see public/config.js + docker-entrypoint.sh).
// Lets us change API_BASE_URL / protocol without rebuilding the frontend bundle.
interface AppRuntimeConfig {
  API_BASE_URL?: string
  APP_ENV?: string
  ACCESS_TOKEN_TTL_MS?: number
  MOCK_MODE?: boolean
}

interface Window {
  __APP_CONFIG__?: AppRuntimeConfig
}
