import type { BilingualText } from '../types/route'
import { convertToTraditional, fixLaneStopChinese } from './convert'
import { isChineseLocale, type Locale } from './types'

export function localizeChinese(text: string, locale: Locale): string {
  if (!text) return text
  if (locale === 'zh-Hant') return convertToTraditional(text)
  return text
}

/**
 * 全语言模式：仅中文界面显示中文；其余语言显示英文线路数据。
 */
export function getPrimaryText(text: BilingualText, locale: Locale): string {
  if (isChineseLocale(locale)) {
    let zh = localizeChinese(text.zh, locale)
    if (locale === 'zh-Hant') {
      zh = fixLaneStopChinese(zh, text.en)
    }
    return zh || text.en
  }
  return text.en || text.zh
}

export function getSecondaryText(_text: BilingualText, _locale: Locale): string | null {
  return null
}

export function getOptionalText(
  text: BilingualText | undefined,
  locale: Locale,
): string | undefined {
  if (!text) return undefined
  const value = getPrimaryText(text, locale)
  return value || undefined
}
