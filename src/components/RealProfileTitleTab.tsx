import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { REAL_PROFILE_GAME_TITLES } from '../data/realProfileTitles'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import { getStartPageExternalLinkUrl } from '../data/startPageLinks'
import { RealProfileUiImage } from './RealProfileUiImage'

export function RealProfileTitleTab() {
  const { locale, t } = useLocale()
  const { isLoggedIn } = useAuth()
  const [equippedTitleId, setEquippedTitleId] = useState('driver')
  const robloxHref = getStartPageExternalLinkUrl('roblox', locale)

  return (
    <div className="real-profile-title-tab">
      <div className="real-profile-title-grid-wrap sibs-scrollbar">
        <ul className="real-profile-title-grid" aria-label={t('realProfileTitlesCatalog')}>
          {REAL_PROFILE_GAME_TITLES.map((title) => {
            const active = equippedTitleId === title.id
            const locked = !title.unlocked
            return (
              <li key={title.id}>
                <button
                  type="button"
                  className={`real-profile-title-slot${active ? ' real-profile-title-slot--active' : ''}${locked ? ' real-profile-title-slot--locked' : ''}${title.vip ? ' real-profile-title-slot--vip' : ''}`}
                  disabled={locked}
                  aria-pressed={active}
                  onClick={() => setEquippedTitleId(title.id)}
                >
                  <span className="real-profile-title-slot-label">{getPrimaryText(title.label, locale)}</span>
                  {title.vip ? <span className="real-profile-title-slot-vip">VIP</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="real-profile-title-unlock-bar">
        <RealProfileUiImage asset="titleUnlockIcon" className="real-profile-title-unlock-icon" alt="" />
        <p>{t('realProfileTitleUnlockBanner')}</p>
      </div>

      <div className="real-profile-title-promo">
        <p className="real-profile-title-promo-copy">{t('realProfileTitleVipPromo')}</p>
        <button type="button" className="real-profile-title-promo-buy" onClick={() => window.open(robloxHref, '_blank', 'noopener,noreferrer')}>
          {t('realProfileTitleVipBuy')}
        </button>
      </div>

      {!isLoggedIn ? (
        <p className="real-profile-title-signin-hint">{t('realProfileSignInLink')}</p>
      ) : null}
    </div>
  )
}
