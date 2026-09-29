import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { REAL_PROFILE_GAME_ICONS } from '../data/realProfileIcons'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import { getAccountPageHref } from '../utils/appPage'
import { RealProfileLicensePhoto } from './RealProfileLicensePhoto'
import { useUserProfile } from '../contexts/UserProfileContext'

export function RealProfileIconsTab() {
  const { locale, t } = useLocale()
  const { isLoggedIn, email } = useAuth()
  const { profile } = useUserProfile()
  const [equippedId, setEquippedId] = useState('default')
  const accountHref = getAccountPageHref()
  const profileEmail = profile?.email ?? email

  return (
    <div className="real-profile-icons-tab">
      <div className="real-profile-icons-preview">
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
      <div className="real-profile-icons-inventory">
        <h3 className="real-profile-icons-inventory-title">{t('realProfileIconsInventory')}</h3>
        <ul className="real-profile-icons-grid">
          {REAL_PROFILE_GAME_ICONS.map((icon) => {
            const active = equippedId === icon.id
            return (
              <li key={icon.id}>
                <button
                  type="button"
                  className={`real-profile-icon-slot${active ? ' real-profile-icon-slot--active' : ''}${!icon.unlocked ? ' real-profile-icon-slot--locked' : ''}`}
                  disabled={!icon.unlocked}
                  aria-pressed={active}
                  onClick={() => setEquippedId(icon.id)}
                >
                  <span className="real-profile-icon-slot-emoji" aria-hidden="true">
                    {icon.emoji}
                  </span>
                  <span className="real-profile-icon-slot-label">{getPrimaryText(icon.label, locale)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="real-profile-icons-note">{t('realProfileIconsDemoNote')}</p>
      </div>
    </div>
  )
}
