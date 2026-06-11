/** sessionStorage key — keep in sync with inline guard in pages/secret.html */
export const SECRET_ACCESS_STORAGE_KEY = 'sibs-secret-unlock'

export function grantSecretAccess(): void {
  try {
    sessionStorage.setItem(SECRET_ACCESS_STORAGE_KEY, '1')
  } catch {
    // storage unavailable (private mode, etc.)
  }
}

export function hasSecretAccess(): boolean {
  try {
    return sessionStorage.getItem(SECRET_ACCESS_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function routesIndexHref(): string {
  return import.meta.env.DEV ? './dev.html' : './index.html'
}

export function redirectToRoutesIndex(): void {
  window.location.replace(routesIndexHref())
}
