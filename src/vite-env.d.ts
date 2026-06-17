/// <reference types="vite/client" />

declare const __APP_BUILD__: string

interface ImportMetaEnv {
  readonly VITE_DAILY_CHALLENGE_API_URL?: string
  readonly VITE_DAILY_CHALLENGE_POLL_MS?: string
}
