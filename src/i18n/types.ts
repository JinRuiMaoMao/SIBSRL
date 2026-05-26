export type Locale =
  | 'vi'
  | 'zh-Hans'
  | 'zh-Hant'
  | 'da'
  | 'en'
  | 'fil'
  | 'id'
  | 'ko'
  | 'pt-BR'
  | 'de'
  | 'es'
  | 'fr'
  | 'ja'
  | 'pl'
  | 'sv'

export const LOCALE_STORAGE_KEY = 'sibs-locale'

/**
 * 语言选择器顺序（双列横排，自上而下）：
 * dansk · deutsche | English · espanol | Filipino · francais
 * Bahasa Indonesia · 日本语 | 韩语 · polski | Brasil · Svenska
 * tieng · 简体中文 | 繁体中文
 */
export const LOCALE_OPTIONS: { value: Locale; nativeLabel: string }[] = [
  { value: 'da', nativeLabel: 'dansk' },
  { value: 'de', nativeLabel: 'deutsche' },
  { value: 'en', nativeLabel: 'English' },
  { value: 'es', nativeLabel: 'español' },
  { value: 'fil', nativeLabel: 'Filipino' },
  { value: 'fr', nativeLabel: 'français' },
  { value: 'id', nativeLabel: 'Bahasa Indonesia' },
  { value: 'ja', nativeLabel: '日本語' },
  { value: 'ko', nativeLabel: '한국어' },
  { value: 'pl', nativeLabel: 'polski' },
  { value: 'pt-BR', nativeLabel: 'português do Brasil' },
  { value: 'sv', nativeLabel: 'Svenska' },
  { value: 'vi', nativeLabel: 'tiếng Việt' },
  { value: 'zh-Hans', nativeLabel: '简体中文' },
  { value: 'zh-Hant', nativeLabel: '繁體中文' },
]

export const ALL_LOCALES: Locale[] = LOCALE_OPTIONS.map((o) => o.value)

export function isChineseLocale(locale: Locale): boolean {
  return locale === 'zh-Hans' || locale === 'zh-Hant'
}
