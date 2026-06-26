/** localStorage key — keep in sync with inline guard in start-boot-splash.mjs / pages/start.html */
export const START_BOOT_SEEN_STORAGE_KEY = 'sibs-start-boot-seen'

export function hasStartBootBeenSeen(): boolean {
  try {
    return localStorage.getItem(START_BOOT_SEEN_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markStartBootBeenSeen(): void {
  try {
    localStorage.setItem(START_BOOT_SEEN_STORAGE_KEY, '1')
  } catch {
    // storage unavailable (private mode, etc.)
  }
}

export function clearStartBootSeen(): void {
  try {
    localStorage.removeItem(START_BOOT_SEEN_STORAGE_KEY)
  } catch {
    // ignore
  }
}
