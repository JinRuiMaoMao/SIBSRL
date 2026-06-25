import { useEffect } from 'react'
import { START_PAGE_EXTERNAL_LINKS, getStartPageExternalLinkUrl } from '../data/startPageLinks'
import { useLocale } from '../i18n/LocaleContext'
import { getTabPageHref } from '../utils/appTabNavigation'
import { getSettingsPageHref } from '../utils/appPage'
import { formatBuildLabel, readPublishedBuild } from '../utils/buildLabel'
import { syncFavicon, syncHtmlLang } from '../utils/documentMetadata'

export function StartPage() {
  const { locale, t } = useLocale()
  const buildLabel = formatBuildLabel(readPublishedBuild() ?? __APP_BUILD__, locale)
  const routesHref = getTabPageHref('routes')
  const updatesHref = getTabPageHref('updates')

  useEffect(() => {
    syncFavicon()
    syncHtmlLang(locale)
    document.title = t('startPageDocumentTitle')
  }, [locale, t])

  return (
    <div className="app sibs-scrollbar start-page">
      <header className="start-page-top">
        <a className="start-page-settings" href={getSettingsPageHref()} aria-label={t('settings')}>
          {t('settings')}
        </a>
      </header>

      <main className="start-page-main">
        <div className="start-page-hero scroll-reveal is-revealed">
          <img className="start-page-logo" src="./sibs-logo.png" alt="" width={72} height={72} decoding="async" />
          <h1 className="start-page-title">{t('startPageTitle')}</h1>
          <p className="start-page-lead">{t('startPageLead')}</p>
          <div className="start-page-cta-row">
            <a className="start-page-cta start-page-cta--primary" href={routesHref}>
              {t('startPageRoutesCta')}
            </a>
            <a className="start-page-cta start-page-cta--secondary" href={updatesHref}>
              {t('startPageUpdatesCta')}
            </a>
          </div>
        </div>

        <section className="start-page-section" aria-labelledby="start-page-community-title">
          <h2 id="start-page-community-title" className="start-page-section-title">
            {t('startPageCommunityLinks')}
          </h2>
          <ul className="start-page-external-links">
            {START_PAGE_EXTERNAL_LINKS.map((link) => (
              <li key={link.id}>
                <a
                  className="start-page-external-link"
                  href={getStartPageExternalLinkUrl(link.id, locale)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(link.labelKey)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="start-page-footer">
        <p>{t('footer')}</p>
        <p className="build-tag" title={t('buildTagHint')}>
          {t('buildTag', { time: buildLabel })}
        </p>
      </footer>
    </div>
  )
}
