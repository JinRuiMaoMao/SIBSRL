import { useLogoClickNavigate } from '../hooks/useLogoClickNavigate'
import { useLocale } from '../i18n/LocaleContext'
import { routesIndexHref } from '../utils/secretAccess'
import { HeaderCollapseToggle } from './HeaderCollapseToggle'
import { HeaderToolbar } from './HeaderToolbar'
import { SiteLogo } from './SiteLogo'

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

      <header className="site-header secret-site-header">
        <div className="header-inner">
          <div className="brand">
            <button
              type="button"
              className="brand-icon-btn"
              onClick={onLogoClick}
              aria-label={t('secretPageTitle')}
            >
              <SiteLogo />
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
