import type { AuthMode } from '../components/AccountAuthForm'
import { normalizeAuthEmail } from './authEmail'

export interface AuthDeepLink {
  mode: Exclude<AuthMode, 'login'>
  email: string
  code: string
}

export function readAuthDeepLink(): AuthDeepLink | null {
  const params = new URLSearchParams(window.location.search)
  const modeRaw = params.get('mode')?.trim()
  if (modeRaw !== 'register' && modeRaw !== 'reset') return null

  const email = params.get('email')?.trim()
  const code = params.get('code')?.trim()
  if (!email || !code || !/^\d{6}$/.test(code)) return null

  return {
    mode: modeRaw,
    email: normalizeAuthEmail(email),
    code,
  }
}

export function clearAuthDeepLinkFromUrl(): void {
  const url = new URL(window.location.href)
  let changed = false
  for (const key of ['mode', 'email', 'code']) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (!changed) return

  const qs = url.searchParams.toString()
  const next = qs ? `${url.pathname}?${qs}${url.hash}` : `${url.pathname}${url.hash}`
  window.history.replaceState(null, '', next)
}
