import { EXTERNAL_LINKS } from '../data/routes'
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
  const { t } = useLocale()

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

        <div className="header-actions">
          <nav className="header-tabs" aria-label={t('navMain')}>
            {(Object.keys(TAB_KEYS) as AppTab[]).map((tab) => (
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
            ))}
          </nav>
          <SettingsMenu />
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
