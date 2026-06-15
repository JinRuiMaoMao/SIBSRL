/** Stored on `<html data-theme>` — `system` follows OS via CSS media queries */
export type ThemePreference = 'system' | 'dark' | 'light'

/** @deprecated Use ThemePreference */
export type Theme = ThemePreference

export const THEME_STORAGE_KEY = 'sibs-theme'

export const ALL_THEME_PREFERENCES: ThemePreference[] = ['system', 'dark', 'light']

/** @deprecated Use ALL_THEME_PREFERENCES */
export const ALL_THEMES = ALL_THEME_PREFERENCES
