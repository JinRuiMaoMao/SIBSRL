import { resolveAccountAvatarInitial } from '../utils/accountAvatar'

interface AccountAvatarProps {
  displayName?: string | null
  email?: string | null
  avatarDataUrl?: string | null
  size?: 'header' | 'profile'
  className?: string
}

export function AccountAvatar({
  displayName,
  email,
  avatarDataUrl,
  size = 'header',
  className = '',
}: AccountAvatarProps) {
  const initial = resolveAccountAvatarInitial(displayName, email)
  const classes = [
    size === 'profile' ? 'account-profile-avatar' : 'account-avatar-btn__glyph',
    avatarDataUrl ? 'account-avatar--image' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (avatarDataUrl) {
    return (
      <span className={classes} aria-hidden>
        <img className="account-avatar__img" src={avatarDataUrl} alt="" decoding="async" />
      </span>
    )
  }

  return (
    <span className={classes} aria-hidden>
      {initial}
    </span>
  )
}
