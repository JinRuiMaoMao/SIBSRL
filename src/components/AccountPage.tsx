import { AccountAuthForm } from './AccountAuthForm'
import { AccountProfileView } from './AccountProfileView'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n/LocaleContext'

export function AccountPage() {
  const { t } = useLocale()
  const { enabled, isLoggedIn } = useAuth()

  return (
    <section className="account-page" aria-labelledby="account-page-title">
      <header className="account-page-header">
        <h2 id="account-page-title">{t('authProfileTitle')}</h2>
        <p className="account-page-lead">
          {isLoggedIn ? t('authProfileLeadSignedIn') : t('authProfileLeadSignedOut')}
        </p>
      </header>

      {!enabled ? (
        <p className="account-page-unavailable">{t('authErrorUnavailable')}</p>
      ) : isLoggedIn ? (
        <AccountProfileView />
      ) : (
        <AccountAuthForm initialMode="login" />
      )}
    </section>
  )
}
