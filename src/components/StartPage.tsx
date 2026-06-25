import { useEffect } from 'react'
import { AppTabIcon } from './AppTabIcons'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import type { AppTab } from '../types/appTab'
import { APP_TABS, getTabPageHref } from '../utils/appTabNavigation'
import { getSettingsPageHref } from '../utils/appPage'
import { formatBuildLabel, readPublishedBuild } from '../utils/buildLabel'
import { formatDocumentTitle, syncFavicon, syncHtmlLang } from '../utils/documentMetadata'

const TAB_KEYS: Record<AppTab, MessageKey> = {
  routes: 'tabRoutes',
  broadcast: 'tabBroadcast',
  music: 'tabMusic',
  complaints: 'tabComplaints',
  trivia: 'tabTrivia',
  updates: 'tabUpdates',
}

export function StartPage() {
  const { locale, t } = useLocale()
  const buildLabel = formatBuildLabel(readPublishedBuild() ?? __APP_BUILD__, locale)
  const routesHref = getTabPageHref('routes')

  useEffect(() => {
    syncFavicon()
    syncHtmlLang(locale)
    document.title = formatDocumentTitle(t('startPageTitle'), t('documentTitleSuffix'))
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
          <a className="start-page-cta" href={routesHref}>
            <span className="start-page-cta-label">{t('startPageCta')}</span>
            <span className="start-page-cta-hint">{t('startPageCtaHint')}</span>
          </a>
        </div>

        <section className="start-page-section" aria-labelledby="start-page-explore-title">
          <h2 id="start-page-explore-title" className="start-page-section-title">
            {t('startPageExplore')}
          </h2>
          <ul className="start-page-links">
            {APP_TABS.map((tab) => (
              <li key={tab}>
                <a className="start-page-link" href={getTabPageHref(tab)}>
                  <span className="start-page-link-icon" aria-hidden>
                    <AppTabIcon tab={tab} active={tab === 'routes'} />
                  </span>
                  <span className="start-page-link-text">{t(TAB_KEYS[tab])}</span>
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
