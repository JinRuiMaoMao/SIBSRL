import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { formatMessage, getMessages, type MessageKey } from './messages'
import { ALL_LOCALES, LOCALE_STORAGE_KEY, type Locale } from './types'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && ALL_LOCALES.includes(stored as Locale)) return stored as Locale
  } catch {
    /* ignore */
  }
  return 'zh-Hans'
}

const HTML_LANG: Record<Locale, string> = {
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

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  const messages = useMemo(() => getMessages(locale), [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale]
  }, [locale])

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      const text = messages[key]
      return vars ? formatMessage(text, vars) : text
    },
    [messages],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
