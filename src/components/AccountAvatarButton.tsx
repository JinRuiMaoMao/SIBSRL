import { useAuth } from '../contexts/AuthContext'
import { useUserProfile } from '../contexts/UserProfileContext'
import { useLocale } from '../i18n/LocaleContext'
import { getAccountPageHref, isAccountPage } from '../utils/appPage'
import { AccountAvatar } from './AccountAvatar'

export function AccountAvatarButton() {
  const { t } = useLocale()
  const { enabled, email, isLoggedIn } = useAuth()
  const { profile, displayLabel } = useUserProfile()
  const onAccountPage = isAccountPage()

  if (!enabled) return null

  const signedInTitle = displayLabel
    ? t('authLoggedInAsName', { name: displayLabel })
    : t('authLoggedInAs', { email: email ?? '' })

  return (
    <a
      href={getAccountPageHref()}
      className={`account-avatar-btn ${onAccountPage ? 'account-avatar-btn--active' : ''} ${isLoggedIn ? 'account-avatar-btn--signed-in' : ''} ${profile?.avatarDataUrl ? 'account-avatar-btn--image' : ''}`}
      data-tour="account"
      aria-current={onAccountPage ? 'page' : undefined}
      title={isLoggedIn ? signedInTitle : t('authAvatarLabel')}
      aria-label={t('authAvatarLabel')}
    >
      {isLoggedIn ? (
        <AccountAvatar
          displayName={profile?.displayName}
          email={profile?.email ?? email}
          avatarDataUrl={profile?.avatarDataUrl}
          size="header"
        />
      ) : (
        <span className="account-avatar-btn__glyph" aria-hidden>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            />
          </svg>
        </span>
      )}
    </a>
  )
}
