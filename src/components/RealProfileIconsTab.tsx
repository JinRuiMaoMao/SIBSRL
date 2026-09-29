import { useState } from 'react'
import { REAL_PROFILE_GAME_ICONS } from '../data/realProfileIcons'
import { useLocale } from '../i18n/LocaleContext'
import { RealProfileUiImage } from './RealProfileUiImage'

export function RealProfileIconsTab() {
  const { t } = useLocale()
  const [equippedId, setEquippedId] = useState('wave')

  return (
    <div className="real-profile-icons-tab">
      <div className="real-profile-icons-grid-wrap sibs-scrollbar real-profile-board-scroll">
        <ul className="real-profile-icons-grid" aria-label={t('realProfileIconsInventory')}>
          {REAL_PROFILE_GAME_ICONS.map((icon) => {
            const active = equippedId === icon.id
            const locked = !icon.unlocked
            return (
              <li key={icon.id}>
                <button
                  type="button"
                  className={`real-profile-icon-slot${active ? ' real-profile-icon-slot--active' : ''}${locked ? ' real-profile-icon-slot--locked' : ''}`}
                  disabled={locked}
                  aria-pressed={active}
                  aria-label={icon.id}
                  onClick={() => setEquippedId(icon.id)}
                >
                  <span className="real-profile-icon-slot-glyph" aria-hidden="true">
                    {icon.glyph}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="real-profile-icons-unlock-bar">
        <RealProfileUiImage asset="titleUnlockIcon" className="real-profile-icons-unlock-icon" alt="" />
        <p>{t('realProfileIconUnlockBanner')}</p>
      </div>
    </div>
  )
}
