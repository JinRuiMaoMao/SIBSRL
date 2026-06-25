import { useLocale } from '../../i18n/LocaleContext'
import { LOCALE_OPTIONS, type Locale } from '../../i18n/types'

export function SettingsLanguageSection() {
  const { locale, setLocale } = useLocale()

  const selectLocale = (value: Locale) => {
    setLocale(value)
  }

  return (
    <div className="settings-page-fields">
      <div className="settings-locale-grid">
        {LOCALE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`settings-locale-option ${locale === opt.value ? 'active' : ''}`}
            onClick={() => selectLocale(opt.value)}
            aria-pressed={locale === opt.value}
          >
            {opt.nativeLabel}
          </button>
        ))}
      </div>
    </div>
  )
}
