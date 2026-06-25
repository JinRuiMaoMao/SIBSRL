export type ListDensity = 'comfortable' | 'compact'

export const PANEL_FILL_MIN = 25
export const PANEL_FILL_MAX = 75
export const PANEL_FILL_DEFAULT = PANEL_FILL_MIN

export const APP_PREFERENCES_STORAGE_KEY = 'sibs-app-preferences'

export interface AppPreferences {
  reduceMotion: boolean
  listDensity: ListDensity
  guidedTourAutoStart: boolean
  panelFill: number
  panelNoFill: boolean
  desktopTabBarPinned: boolean
}

const DEFAULT_APP_PREFERENCES: AppPreferences = {
  reduceMotion: false,
  listDensity: 'comfortable',
  guidedTourAutoStart: true,
  panelFill: PANEL_FILL_DEFAULT,
  panelNoFill: false,
  desktopTabBarPinned: false,
}

function clampPanelFill(value: number): number {
  if (!Number.isFinite(value)) return PANEL_FILL_DEFAULT
  return Math.min(PANEL_FILL_MAX, Math.max(PANEL_FILL_MIN, Math.round(value)))
}

function readPanelFill(stored: Record<string, unknown>): number {
  if (typeof stored.panelFill === 'number') {
    return clampPanelFill(stored.panelFill)
  }
  if (stored.panelStyle === 'classic') return PANEL_FILL_MAX
  return PANEL_FILL_DEFAULT
}

export function readAppPreferences(): AppPreferences {
  try {
    const stored = JSON.parse(localStorage.getItem(APP_PREFERENCES_STORAGE_KEY) ?? 'null')
    if (!stored || typeof stored !== 'object') return { ...DEFAULT_APP_PREFERENCES }
    return {
      reduceMotion: Boolean(stored.reduceMotion),
      listDensity: stored.listDensity === 'compact' ? 'compact' : 'comfortable',
      guidedTourAutoStart: stored.guidedTourAutoStart !== false,
      panelFill: readPanelFill(stored as Record<string, unknown>),
      panelNoFill: Boolean((stored as Record<string, unknown>).panelNoFill),
      desktopTabBarPinned: Boolean((stored as Record<string, unknown>).desktopTabBarPinned),
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
  document.documentElement.style.setProperty(
    '--panel-fill',
    preferences.panelNoFill ? '0%' : `${clampPanelFill(preferences.panelFill)}%`,
  )
  if (preferences.panelNoFill) {
    document.documentElement.setAttribute('data-panel-no-fill', 'true')
  } else {
    document.documentElement.removeAttribute('data-panel-no-fill')
  }
  if (preferences.desktopTabBarPinned) {
    document.documentElement.setAttribute('data-desktop-tab-bar-pinned', 'true')
  } else {
    document.documentElement.removeAttribute('data-desktop-tab-bar-pinned')
  }
  document.documentElement.removeAttribute('data-panel-style')
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
