import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUserProfile } from '../contexts/UserProfileContext'
import { REAL_PROFILE_GAME_ICONS } from '../data/realProfileIcons'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import { getAccountPageHref } from '../utils/appPage'
import { RobloxHeadshotImage } from './RobloxHeadshotImage'
import { RealProfileLicensePhoto } from './RealProfileLicensePhoto'

export function RealProfileIconsTab() {
  const { locale, t } = useLocale()
  const { isLoggedIn, email } = useAuth()
  const { profile } = useUserProfile()
  const [equippedId, setEquippedId] = useState('default')
  const accountHref = getAccountPageHref()
  const profileEmail = profile?.email ?? email

  return (
    <div className="real-profile-icons-tab">
      <div className="real-profile-icons-equipped">
        <RealProfileLicensePhoto
          displayName={profile?.displayName}
          email={profileEmail}
          avatarDataUrl={profile?.avatarDataUrl}
          size="icon"
        />
        <p className="real-profile-icon-hint">{t('realProfileIconHint')}</p>
        <a className="real-profile-icon-link" href={accountHref}>
          {isLoggedIn ? t('realProfileIconManageLink') : t('realProfileSignInLink')}
        </a>
      </div>

      <div className="real-profile-icons-grid-wrap sibs-scrollbar">
        <ul className="real-profile-icons-grid" aria-label={t('realProfileIconsInventory')}>
          {REAL_PROFILE_GAME_ICONS.map((icon) => {
            const active = equippedId === icon.id
            const locked = !icon.unlocked
            return (
              <li key={icon.id}>
                <button
                  type="button"
                  className={`real-profile-icon-slot${active ? ' real-profile-icon-slot--active' : ''}${locked ? ' real-profile-icon-slot--locked' : ''}${icon.vip ? ' real-profile-icon-slot--vip' : ''}`}
                  disabled={locked}
                  aria-pressed={active}
                  onClick={() => setEquippedId(icon.id)}
                >
                  <span className="real-profile-icon-slot-preview">
                    {icon.previewUserId ? (
                      <RobloxHeadshotImage
                        userId={icon.previewUserId}
                        displayName={getPrimaryText(icon.label, locale)}
                        className="real-profile-icon-slot-avatar"
                        size={36}
                      />
                    ) : (
                      <span className="real-profile-icon-slot-default" aria-hidden="true">
                        ☺
                      </span>
                    )}
                  </span>
                  <span className="real-profile-icon-slot-label">{getPrimaryText(icon.label, locale)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
