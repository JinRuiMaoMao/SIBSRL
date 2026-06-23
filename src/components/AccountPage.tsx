import { useEffect } from 'react'
import { AccountAuthForm } from './AccountAuthForm'
import { AccountProfileView } from './AccountProfileView'
import { useAuth } from '../contexts/AuthContext'
import { useAppDialog } from '../contexts/AppDialogContext'
import { useLocale } from '../i18n/LocaleContext'

function readOAuthHash(): { token?: string; email?: string; error?: string } {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return {}
  const params = new URLSearchParams(hash)
  return {
    token: params.get('token')?.trim() || undefined,
    email: params.get('email')?.trim() || undefined,
    error: params.get('oauth_error')?.trim() || undefined,
  }
}

export function AccountPage() {
  const { t } = useLocale()
  const { alert } = useAppDialog()
  const { enabled, isLoggedIn, completeOAuthSession } = useAuth()

  useEffect(() => {
    const { token, email, error } = readOAuthHash()
    if (!token && !email && !error) return

    const cleanUrl = () => {
      const url = new URL(window.location.href)
      url.hash = ''
      window.history.replaceState(null, '', url.toString())
    }

    if (error) {
      cleanUrl()
      void alert({ message: t('authOAuthFailed') })
      return
    }

    if (token && email) {
      completeOAuthSession(token, email)
      cleanUrl()
      void alert({ message: t('authLoginSuccess') })
    }
  }, [alert, completeOAuthSession, t])

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
