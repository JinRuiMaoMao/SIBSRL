declare global {
  interface Window {
    USER_API_URL?: string
  }
}

function readMetaContent(name: string): string | null {
  if (typeof document === 'undefined') return null
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() || null
}

const DEFAULT_PRODUCTION_USER_API_URL = 'https://sibs-user-api.onrender.com'

/** Base URL without trailing slash; empty string means same-origin (dev proxy). */
export function getUserApiBaseUrl(): string | null {
  const configured =
    window.USER_API_URL?.trim() ||
    readMetaContent('user-api-url') ||
    import.meta.env.VITE_USER_API_URL?.trim() ||
    (import.meta.env.PROD ? DEFAULT_PRODUCTION_USER_API_URL : null)

  if (configured) return configured.replace(/\/$/, '')
  if (import.meta.env.DEV) return ''
  return null
}

export function isUserApiConfigured(): boolean {
  return getUserApiBaseUrl() !== null
}
