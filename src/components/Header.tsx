import { useMemo, useRef } from 'react'
import { EXTERNAL_LINKS } from '../data/routes'
import { useHeaderTabRows, useMeasureTabRefs } from '../hooks/useHeaderTabRows'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import type { AppTab } from '../types/appTab'
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
  onTabChange: (tab: AppTab) => void
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const { t, locale } = useLocale()
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

  const renderTabButton = (tab: AppTab) => (
    <button
      key={tab}
      type="button"
      role="tab"
      aria-selected={activeTab === tab}
      className={`header-tab ${activeTab === tab ? 'active' : ''}`}
      onClick={() => onTabChange(tab)}
    >
      {t(TAB_KEYS[tab])}
    </button>
  )

  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand">
          <span className="brand-icon" aria-hidden>
            🚌
          </span>
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

          <nav className="header-tabs-cluster" role="tablist" aria-label={t('navMain')}>
            {rows[0] && (
              <div className="header-tabs-primary-row">
                <div className="header-tabs" role="presentation">
                  {rows[0].map((tab) => renderTabButton(tab as AppTab))}
                </div>
                <div className="header-settings-wrap" ref={settingsRef}>
                  <SettingsMenu />
                </div>
              </div>
            )}
            {rows.slice(1).map((row, rowIndex) => (
              <div key={rowIndex} className="header-tabs" role="presentation">
                {row.map((tab) => renderTabButton(tab as AppTab))}
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
  )
}
