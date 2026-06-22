import { useMemo, useRef } from 'react'
import { EXTERNAL_LINKS } from '../data/routes'
import { useHeaderTabRows, useMeasureTabRefs } from '../hooks/useHeaderTabRows'
import { useSecretLogoClick } from '../hooks/useSecretLogoClick'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import type { AppTab } from '../types/appTab'
import { getTabPageHref } from '../utils/appTabNavigation'
import { HeaderCollapseToggle } from './HeaderCollapseToggle'
import { HeaderToolbar } from './HeaderToolbar'
import { SiteLogo } from './SiteLogo'

const LINK_LABEL_KEYS: Record<string, MessageKey> = {
  'https://www.roblox.com/games/1588965415': 'linkOfficialGame',
  'https://sites.google.com/view/sunshine-islands/home': 'linkCommunitySite',
  'https://sunshine-islands-roblox.fandom.com/wiki/Roblox_Sunshine_Islands': 'linkWiki',
}

const TAB_KEYS: Record<AppTab, MessageKey> = {
  routes: 'tabRoutes',
  broadcast: 'tabBroadcast',
  music: 'tabMusic',
  complaints: 'tabComplaints',
  updates: 'tabUpdates',
}

interface HeaderProps {
  activeTab: AppTab
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Header({ activeTab, collapsed, onToggleCollapse }: HeaderProps) {
  const { t, locale } = useLocale()
  const onLogoClick = useSecretLogoClick(activeTab)
  const tabOrder = useMemo(() => Object.keys(TAB_KEYS) as AppTab[], [])

  const actionsRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const measureBoxRef = useRef<HTMLDivElement>(null)
  const measureTabRefs = useMeasureTabRefs()

  const rows = useHeaderTabRows(
    tabOrder,
    actionsRef,
    settingsRef,
    measureBoxRef,
    measureTabRefs,
    [locale, t],
  )

  const singleTabRow = rows.length === 1

  const renderTabLink = (tab: AppTab) => (
    <a
      key={tab}
      href={getTabPageHref(tab)}
      role="tab"
      aria-selected={activeTab === tab}
      className={`header-tab-link ${activeTab === tab ? 'header-tab-link--active' : ''}`}
    >
      <span className="header-tab">{t(TAB_KEYS[tab])}</span>
    </a>
  )

  return (
    <div className={`site-header-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="header-shell-controls">
        <div className="header-settings-wrap" ref={settingsRef}>
          <HeaderToolbar />
        </div>
        <HeaderCollapseToggle collapsed={collapsed} onToggle={onToggleCollapse} />
      </div>

      <header className="site-header">
        <div className="header-inner">
          <div className="brand">
            <button
              type="button"
              className="brand-icon-btn"
              onClick={onLogoClick}
              aria-label={t('appTitle')}
            >
              <SiteLogo />
            </button>
            <div>
              <h1>{t('appTitle')}</h1>
              <p className="tagline">{t('appTagline')}</p>
            </div>
          </div>

          <div className="header-actions" ref={actionsRef} aria-hidden={collapsed}>
            <div className="header-tabs-measure" aria-hidden>
              <div className="header-tabs" ref={measureBoxRef}>
                {tabOrder.map((tab) => (
                  <button
                    key={`measure-${tab}`}
                    type="button"
                    tabIndex={-1}
                    className="header-tab"
                    ref={(el) => {
                      if (el) measureTabRefs.current.set(tab, el)
                      else measureTabRefs.current.delete(tab)
                    }}
                  >
                    {t(TAB_KEYS[tab])}
                  </button>
                ))}
              </div>
            </div>

            <nav
              className={`header-tabs-cluster ${singleTabRow ? 'header-tabs-cluster--single-row' : ''}`}
              role="tablist"
              aria-label={t('navMain')}
            >
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="header-tabs" role="presentation">
                  {row.map((tab) => renderTabLink(tab as AppTab))}
                </div>
              ))}
            </nav>
          </div>
        </div>

        <div className="header-sub" aria-hidden={collapsed}>
          <nav className="header-links" aria-label={t('externalLinks')}>
            {EXTERNAL_LINKS.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                {t(LINK_LABEL_KEYS[link.url] ?? 'linkWiki')}
              </a>
            ))}
          </nav>
        </div>
      </header>
    </div>
  )
}
