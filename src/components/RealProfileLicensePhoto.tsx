import { resolveAccountAvatarInitial } from '../utils/accountAvatar'

function RealProfileDefaultAvatarGlyph() {
  return (
    <svg
      className="real-profile-license-photo-default"
      viewBox="0 0 64 80"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="18" y="6" width="28" height="28" rx="5" fill="#cbd5e1" />
      <rect x="14" y="38" width="36" height="34" rx="5" fill="#94a3b8" />
    </svg>
  )
}

export function RealProfileLicensePhoto({
  displayName,
  email,
  avatarDataUrl,
  size = 'license',
}: {
  displayName?: string | null
  email?: string | null
  avatarDataUrl?: string | null
  size?: 'license' | 'icon'
}) {
  const initial = resolveAccountAvatarInitial(displayName, email)
  const showInitial = !avatarDataUrl && initial !== '?'
  const classes = [
    'real-profile-license-photo',
    size === 'icon' ? 'real-profile-license-photo--icon-tab' : '',
    avatarDataUrl ? 'real-profile-license-photo--image' : '',
    showInitial ? 'real-profile-license-photo--initial' : 'real-profile-license-photo--placeholder',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      {avatarDataUrl ? (
        <img className="real-profile-license-photo-img" src={avatarDataUrl} alt="" decoding="async" />
      ) : showInitial ? (
        <span className="real-profile-license-photo-initial" aria-hidden="true">
          {initial}
        </span>
      ) : (
        <RealProfileDefaultAvatarGlyph />
      )}
    </div>
  )
}
