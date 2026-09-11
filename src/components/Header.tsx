import { useRef } from 'react'
import { useHeaderControlsReserve } from '../hooks/useHeaderControlsReserve'
import { useSecretLogoClick } from '../hooks/useSecretLogoClick'
import { useLocale } from '../i18n/LocaleContext'
import type { AppTab } from '../types/appTab'
import { isRealLayoutMode } from '../utils/appLayoutMode'
import { HeaderCollapseToggle } from './HeaderCollapseToggle'
import { HeaderToolbar } from './HeaderToolbar'
import { RealSunshardsIndicator } from './RealSunshardsIndicator'
import { SiteLogo } from './SiteLogo'
import { LogoSecretFloatingHint } from './LogoSecretFloatingHint'

interface HeaderProps {
  activeTab: AppTab
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Header({ activeTab, collapsed, onToggleCollapse }: HeaderProps) {
  const { t } = useLocale()
  const realLayout = isRealLayoutMode()
  const onLogoClick = useSecretLogoClick(activeTab)
  const shellRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)

  useHeaderControlsReserve(shellRef, controlsRef)

  return (
    <div ref={shellRef} className={`site-header-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <div ref={controlsRef} className="header-shell-controls">
        {realLayout ? <RealSunshardsIndicator className="real-sunshards-indicator--header" /> : null}
        <div className="header-settings-wrap">
          <HeaderToolbar />
        </div>
        <HeaderCollapseToggle collapsed={collapsed} onToggle={onToggleCollapse} />
      </div>

      <header className="site-header">
        <div className="header-inner header-inner--brand-only">
          <div className="brand">
            <div className="brand-logo-cluster">
              <button
                type="button"
                className="brand-icon-btn"
                onClick={onLogoClick}
                aria-label={t('appTitle')}
              >
                <SiteLogo />
              </button>
              <LogoSecretFloatingHint />
            </div>
            <div>
              <h1>{t('appTitle')}</h1>
              <p className="tagline">{t('appTagline')}</p>
            </div>
          </div>
        </div>
      </header>
    </div>
  )
}
