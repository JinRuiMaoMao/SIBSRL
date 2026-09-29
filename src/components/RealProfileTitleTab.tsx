import { useState } from 'react'
import { REAL_PROFILE_GAME_TITLES } from '../data/realProfileTitles'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import { RealProfileUiImage } from './RealProfileUiImage'

export function RealProfileTitleTab() {
  const { locale, t } = useLocale()
  const [equippedTitleId, setEquippedTitleId] = useState('rookie')
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)

  return (
    <div className="real-profile-title-tab">
      <div className="real-profile-title-grid-wrap sibs-scrollbar real-profile-board-scroll">
        <ul className="real-profile-title-grid" aria-label={t('realProfileTitlesCatalog')}>
          {REAL_PROFILE_GAME_TITLES.map((title) => {
            const active = equippedTitleId === title.id
            const locked = !title.unlocked
            return (
              <li key={title.id}>
                <button
                  type="button"
                  className={`real-profile-title-slot real-profile-title-slot--${title.color}${active ? ' real-profile-title-slot--active' : ''}${locked ? ' real-profile-title-slot--locked' : ''}`}
                  disabled={locked}
                  aria-pressed={active}
                  onClick={() => setEquippedTitleId(title.id)}
                >
                  <span className="real-profile-title-slot-label">{getPrimaryText(title.label, locale)}</span>
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

      <div className="real-profile-title-style-bar">
        <span className="real-profile-title-style-label">{t('realProfileUsernameColor')}</span>
        <div className="real-profile-title-color-track" aria-hidden="true">
          <span className="real-profile-title-color-gradient" />
          <span className="real-profile-title-color-thumb real-profile-title-color-thumb--a" />
          <span className="real-profile-title-color-thumb real-profile-title-color-thumb--b" />
        </div>
        <div className="real-profile-title-style-toggles">
          <button
            type="button"
            className={`real-profile-title-style-toggle${bold ? ' real-profile-title-style-toggle--active' : ''}`}
            aria-pressed={bold}
            onClick={() => setBold((value) => !value)}
          >
            B
          </button>
          <button
            type="button"
            className={`real-profile-title-style-toggle${italic ? ' real-profile-title-style-toggle--active' : ''}`}
            aria-pressed={italic}
            onClick={() => setItalic((value) => !value)}
          >
            I
          </button>
        </div>
      </div>
    </div>
  )
}
