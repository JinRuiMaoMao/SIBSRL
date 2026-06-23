export const AUTH_TOKEN_STORAGE_KEY = 'sibs-auth-token'
export const AUTH_EMAIL_STORAGE_KEY = 'sibs-auth-email'
export const AUTH_LAST_EMAIL_STORAGE_KEY = 'sibs-auth-last-email'

export function readAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function readAuthEmail(): string | null {
  try {
    return localStorage.getItem(AUTH_EMAIL_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeAuthSession(token: string, email: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
    localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, email)
    localStorage.setItem(AUTH_LAST_EMAIL_STORAGE_KEY, email)
  } catch {
    /* ignore */
  }
}

export function readLastAuthEmail(): string | null {
  try {
    return localStorage.getItem(AUTH_LAST_EMAIL_STORAGE_KEY)
  } catch {
    return null
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    localStorage.removeItem(AUTH_EMAIL_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
