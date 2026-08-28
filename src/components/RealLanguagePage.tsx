import { useEffect } from 'react'
import { getStartPageExternalLinkUrl } from '../data/startPageLinks'
import { useLocale } from '../i18n/LocaleContext'
import { LOCALE_OPTIONS, type Locale } from '../i18n/types'
import { resolveSiteAssetUrl } from '../utils/appLayoutMode'
import { syncFavicon, syncHtmlLang } from '../utils/documentMetadata'

export function RealLanguagePage({ onClose }: { onClose: () => void }) {
  const { locale, setLocale, t } = useLocale()
  const mapBackgroundUrl = resolveSiteAssetUrl('maps/SIMapGerenal.png')
  const discordHref = getStartPageExternalLinkUrl('discord', locale)

  const selectLocale = (value: Locale) => {
    setLocale(value)
  }

  useEffect(() => {
    syncFavicon()
    syncHtmlLang(locale)
    document.title = t('realLanguagePageDocumentTitle')
  }, [locale, t])

  return (
    <div className="real-language-page real-start-page--ready sibs-scrollbar">
      <div className="real-start-bg" aria-hidden="true">
        <img className="real-start-bg-map" src={mapBackgroundUrl} alt="" decoding="async" />
        <div className="real-start-bg-overlay" />
      </div>

      <div className="real-language-shell">
        <header className="real-language-header">
          <button type="button" className="real-language-back" onClick={onClose}>
            <span className="real-language-back-chevron" aria-hidden="true">
              ‹
            </span>
            <span>{t('realLanguagePageTitle')}</span>
          </button>
        </header>

        <main className="real-language-main">
          <div className="real-language-grid" role="list">
            {LOCALE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="listitem"
                className={`real-language-option${locale === opt.value ? ' real-language-option--active' : ''}`}
                onClick={() => selectLocale(opt.value)}
                aria-pressed={locale === opt.value}
              >
                {opt.nativeLabel}
              </button>
            ))}
          </div>
        </main>

        <footer className="real-language-footer">
          <p className="real-language-disclaimer">
            {t('realLanguageDisclaimerLead')}{' '}
            <a href={discordHref} target="_blank" rel="noreferrer">
              {t('realLanguageDisclaimerLink')}
            </a>
            {t('realLanguageDisclaimerTail')}
          </p>
        </footer>
      </div>
    </div>
  )
}
