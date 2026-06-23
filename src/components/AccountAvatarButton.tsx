import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n/LocaleContext'
import { getAccountPageHref, isAccountPage } from '../utils/appPage'

function avatarLabel(email: string | null, isLoggedIn: boolean): string {
  if (isLoggedIn && email) return email[0]!.toUpperCase()
  return '?'
}

export function AccountAvatarButton() {
  const { t } = useLocale()
  const { enabled, email, isLoggedIn } = useAuth()
  const onAccountPage = isAccountPage()
  const label = useMemo(() => avatarLabel(email, isLoggedIn), [email, isLoggedIn])

  if (!enabled) return null

  return (
    <a
      href={getAccountPageHref()}
      className={`account-avatar-btn ${onAccountPage ? 'account-avatar-btn--active' : ''} ${isLoggedIn ? 'account-avatar-btn--signed-in' : ''}`}
      data-tour="account"
      aria-current={onAccountPage ? 'page' : undefined}
      title={isLoggedIn ? t('authLoggedInAs', { email: email ?? '' }) : t('authAvatarLabel')}
      aria-label={t('authAvatarLabel')}
    >
      <span className="account-avatar-btn__glyph" aria-hidden>
        {isLoggedIn ? label : (
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            />
          </svg>
        )}
      </span>
    </a>
  )
}
