import { useMemo, useRef } from 'react'
import { EXTERNAL_LINKS } from '../data/routes'
import { useHeaderTabRows, useMeasureTabRefs } from '../hooks/useHeaderTabRows'
import { useSecretLogoClick } from '../hooks/useSecretLogoClick'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import type { AppTab } from '../types/appTab'
import { getTabPageHref, readTabFromLocation } from '../utils/appTabNavigation'
import { SettingsMenu } from './SettingsMenu'

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
  const secretLogoEnabled = readTabFromLocation() === 'routes'
  const onLogoClick = useSecretLogoClick(secretLogoEnabled)
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
          <SettingsMenu />
        </div>
        <button
          type="button"
          className="header-collapse-toggle"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('headerExpand') : t('headerCollapse')}
          title={collapsed ? t('headerExpand') : t('headerCollapse')}
        >
          <svg className="header-collapse-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path
              fill="currentColor"
              d="M12 7.5 18 13.5l-1.4 1.4L12 10.3 7.4 14.9 6 13.5z"
            />
          </svg>
        </button>
      </div>

      <header className="site-header" aria-hidden={collapsed}>
        <div className="header-inner">
          <div className="brand">
            <button
              type="button"
              className="brand-icon-btn"
              onClick={onLogoClick}
              aria-label={t('appTitle')}
            >
              <span className="brand-icon" aria-hidden>
                🚌
              </span>
            </button>
            <div>
              <h1>{t('appTitle')}</h1>
              <p className="tagline">{t('appTagline')}</p>
            </div>
          </div>

          <div className="header-actions" ref={actionsRef}>
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

        <div className="header-sub">
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
