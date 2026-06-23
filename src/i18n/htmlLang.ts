import type { Locale } from './types'

/** BCP 47 tags for `<html lang>` — keep in sync with locale-bootstrap in app-page-html.mjs */
export const HTML_LANG: Record<Locale, string> = {
  vi: 'vi',
  'zh-Hans': 'zh-Hans',
  'zh-Hant': 'zh-Hant',
  da: 'da',
  en: 'en',
  fil: 'fil',
  id: 'id',
  ko: 'ko',
  'pt-BR': 'pt-BR',
  de: 'de',
  es: 'es',
  fr: 'fr',
  ja: 'ja',
  pl: 'pl',
  sv: 'sv',
}

export function getHtmlLang(locale: Locale): string {
  return HTML_LANG[locale]
}
