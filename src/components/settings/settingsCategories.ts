import type { MessageKey } from '../../i18n/messages'

export const SETTINGS_CATEGORIES = [
  'appearance',
  'language',
  'display',
  'guidedTour',
  'feedback',
  'reset',
] as const

export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number]

export const SETTINGS_CATEGORY_MESSAGE_KEYS: Record<SettingsCategory, MessageKey> = {
  appearance: 'settingsCategoryAppearance',
  language: 'settingsCategoryLanguage',
  display: 'settingsCategoryDisplay',
  guidedTour: 'settingsCategoryGuidedTour',
  feedback: 'settingsCategoryFeedback',
  reset: 'settingsCategoryReset',
}

export function isSettingsCategory(value: string): value is SettingsCategory {
  return (SETTINGS_CATEGORIES as readonly string[]).includes(value)
}

export function readSettingsCategoryFromLocation(): SettingsCategory {
  const hash = window.location.hash.replace(/^#/, '').trim()
  if (isSettingsCategory(hash)) return hash

  const param = new URLSearchParams(window.location.search).get('cat')?.trim() ?? ''
  if (isSettingsCategory(param)) return param

  return 'appearance'
}
