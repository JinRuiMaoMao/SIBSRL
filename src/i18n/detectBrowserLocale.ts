import { ALL_LOCALES, DEFAULT_LOCALE, type Locale } from './types'

const EXACT_TAG_MAP: Record<string, Locale> = {
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  'en-au': 'en',
  'en-ca': 'en',
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  'zh-hans': 'zh-Hans',
  'zh-tw': 'zh-Hant',
  'zh-hk': 'zh-Hant',
  'zh-mo': 'zh-Hant',
  'zh-hant': 'zh-Hant',
  'pt-br': 'pt-BR',
  fil: 'fil',
  tl: 'fil',
  vi: 'vi',
  da: 'da',
  de: 'de',
  es: 'es',
  fr: 'fr',
  id: 'id',
  ko: 'ko',
  ja: 'ja',
  pl: 'pl',
  sv: 'sv',
}

const PRIMARY_TAG_MAP: Record<string, Locale> = {
  en: 'en',
  zh: 'zh-Hans',
  vi: 'vi',
  da: 'da',
  de: 'de',
  es: 'es',
  fr: 'fr',
  id: 'id',
  ko: 'ko',
  ja: 'ja',
  pl: 'pl',
  sv: 'sv',
  pt: 'pt-BR',
  fil: 'fil',
  tl: 'fil',
}

function matchBrowserLanguageTag(tag: string): Locale | null {
  const normalized = tag.trim().toLowerCase().replace(/_/g, '-')
  if (!normalized) return null

  const exact = EXACT_TAG_MAP[normalized]
  if (exact) return exact

  const locale = ALL_LOCALES.find((item) => item.toLowerCase() === normalized)
  if (locale) return locale

  const primary = normalized.split('-')[0] ?? ''
  return PRIMARY_TAG_MAP[primary] ?? null
}

/** 无本地保存偏好时，按浏览器语言列表匹配站点支持的语言。 */
export function detectBrowserLocale(): Locale {
  try {
    const candidates =
      typeof navigator !== 'undefined' && navigator.languages?.length
        ? [...navigator.languages]
        : typeof navigator !== 'undefined' && navigator.language
          ? [navigator.language]
          : []

    for (const tag of candidates) {
      const matched = matchBrowserLanguageTag(tag)
      if (matched) return matched
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE
}
