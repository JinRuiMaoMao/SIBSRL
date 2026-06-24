import { useRef } from 'react'
import { EXTERNAL_LINKS } from '../data/routes'
import { useHeaderControlsReserve } from '../hooks/useHeaderControlsReserve'
import { useSecretLogoClick } from '../hooks/useSecretLogoClick'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import type { AppTab } from '../types/appTab'
import { HeaderCollapseToggle } from './HeaderCollapseToggle'
import { HeaderToolbar } from './HeaderToolbar'
import { SiteLogo } from './SiteLogo'

const LINK_LABEL_KEYS: Record<string, MessageKey> = {
  'https://www.roblox.com/games/1588965415': 'linkOfficialGame',
  'https://sites.google.com/view/sunshine-islands/home': 'linkCommunitySite',
  'https://sunshine-islands-roblox.fandom.com/wiki/Roblox_Sunshine_Islands': 'linkWiki',
}

interface HeaderProps {
  activeTab: AppTab
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Header({ activeTab, collapsed, onToggleCollapse }: HeaderProps) {
  const { t } = useLocale()
  const onLogoClick = useSecretLogoClick(activeTab)
  const shellRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)

  useHeaderControlsReserve(shellRef, controlsRef)

  return (
    <div ref={shellRef} className={`site-header-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <div ref={controlsRef} className="header-shell-controls">
        <div className="header-settings-wrap">
          <HeaderToolbar />
        </div>
        <HeaderCollapseToggle collapsed={collapsed} onToggle={onToggleCollapse} />
      </div>

      <header className="site-header">
        <div className="header-inner header-inner--brand-only">
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
