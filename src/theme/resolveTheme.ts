import type { ResolvedTheme, ThemePreference } from './types'

export function resolveSystemAppearance(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'dark'
  }
}

export function applyThemePreference(preference: ThemePreference): void {
  const resolved = preference === 'system' ? resolveSystemAppearance() : preference
  document.documentElement.setAttribute('data-theme', resolved)
}

let stopSystemThemeSync: (() => void) | null = null

export function startSystemThemeSync(): void {
  stopSystemThemeSync?.()

  const sync = () => applyThemePreference('system')
  sync()

  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', sync)

  const legacyMq = mq as MediaQueryList & {
    addListener?: (listener: () => void) => void
    removeListener?: (listener: () => void) => void
  }
  legacyMq.addListener?.(sync)

  const onFocus = () => sync()
  window.addEventListener('focus', onFocus)

  const onVisibility = () => {
    if (document.visibilityState === 'visible') sync()
  }
  document.addEventListener('visibilitychange', onVisibility)

  const interval = window.setInterval(sync, 800)

  stopSystemThemeSync = () => {
    mq.removeEventListener('change', sync)
    legacyMq.removeListener?.(sync)
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onVisibility)
    window.clearInterval(interval)
    stopSystemThemeSync = null
  }
}

export function stopSystemThemeSyncHandler(): void {
  stopSystemThemeSync?.()
}

export function syncThemePreference(preference: ThemePreference): void {
  if (preference === 'system') {
    startSystemThemeSync()
    return
  }
  stopSystemThemeSyncHandler()
  applyThemePreference(preference)
}
