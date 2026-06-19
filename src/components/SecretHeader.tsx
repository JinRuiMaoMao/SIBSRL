import { useLogoClickNavigate } from '../hooks/useLogoClickNavigate'
import { useLocale } from '../i18n/LocaleContext'
import { routesIndexHref } from '../utils/secretAccess'
import { HeaderCollapsedBar } from './HeaderCollapsedBar'
import { HeaderCollapseToggle } from './HeaderCollapseToggle'
import { HeaderToolbar } from './HeaderToolbar'

interface SecretHeaderProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function SecretHeader({ collapsed, onToggleCollapse }: SecretHeaderProps) {
  const { t } = useLocale()
  const onLogoClick = useLogoClickNavigate('secret', routesIndexHref())

  return (
    <div className={`site-header-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="header-shell-controls">
        <div className="header-settings-wrap">
          <HeaderToolbar />
        </div>
        <HeaderCollapseToggle collapsed={collapsed} onToggle={onToggleCollapse} />
      </div>

      <HeaderCollapsedBar
        collapsed={collapsed}
        title={t('secretPageTitle')}
        logoAriaLabel={t('secretPageTitle')}
        onLogoClick={onLogoClick}
      />

      <header className="site-header secret-site-header" aria-hidden={collapsed}>
        <div className="header-inner">
          <div className="brand">
            <button
              type="button"
              className="brand-icon-btn"
              onClick={onLogoClick}
              aria-label={t('secretPageTitle')}
            >
              <span className="brand-icon" aria-hidden>
                🚌
              </span>
            </button>
            <div>
              <h1>{t('secretPageTitle')}</h1>
              <p className="tagline">{t('secretPageTagline')}</p>
            </div>
          </div>
        </div>
      </header>
    </div>
  )
}
