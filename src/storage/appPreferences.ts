export type ListDensity = 'comfortable' | 'compact'

export const APP_PREFERENCES_STORAGE_KEY = 'sibs-app-preferences'

export interface AppPreferences {
  reduceMotion: boolean
  listDensity: ListDensity
  guidedTourAutoStart: boolean
}

const DEFAULT_APP_PREFERENCES: AppPreferences = {
  reduceMotion: false,
  listDensity: 'comfortable',
  guidedTourAutoStart: true,
}

export function readAppPreferences(): AppPreferences {
  try {
    const stored = JSON.parse(localStorage.getItem(APP_PREFERENCES_STORAGE_KEY) ?? 'null')
    if (!stored || typeof stored !== 'object') return { ...DEFAULT_APP_PREFERENCES }
    return {
      reduceMotion: Boolean(stored.reduceMotion),
      listDensity: stored.listDensity === 'compact' ? 'compact' : 'comfortable',
      guidedTourAutoStart: stored.guidedTourAutoStart !== false,
    }
  } catch {
    return { ...DEFAULT_APP_PREFERENCES }
  }
}

export function writeAppPreferences(preferences: AppPreferences): void {
  try {
    localStorage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    /* ignore */
  }
}

export function applyAppPreferences(preferences: AppPreferences): void {
  document.documentElement.setAttribute(
    'data-reduce-motion',
    preferences.reduceMotion ? 'true' : 'false',
  )
  document.documentElement.setAttribute('data-list-density', preferences.listDensity)
}

export function shouldReduceMotion(): boolean {
  if (typeof document !== 'undefined') {
    if (document.documentElement.getAttribute('data-reduce-motion') === 'true') return true
  }
  if (typeof window === 'undefined') return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}
