import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n/LocaleContext'
import { getTabPageHref } from '../utils/appTabNavigation'

export function AccountProfileView() {
  const { t } = useLocale()
  const { email, logout } = useAuth()

  return (
    <div className="account-profile-card">
      <div className="account-profile-avatar" aria-hidden>
        {(email?.[0] ?? '?').toUpperCase()}
      </div>
      <p className="account-profile-email">{email}</p>
      <p className="settings-hint">{t('authFavoritesSyncHint')}</p>
      <div className="settings-action-row">
        <a className="settings-action-btn" href={getTabPageHref('routes')}>
          {t('authBackToRoutes')}
        </a>
        <button type="button" className="settings-action-btn danger" onClick={logout}>
          {t('authLogout')}
        </button>
      </div>
    </div>
  )
}
