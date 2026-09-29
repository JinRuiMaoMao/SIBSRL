import { useState } from 'react'
import {
  REAL_PROFILE_ACHIEVEMENT_PAGE_COUNT,
  REAL_PROFILE_ACHIEVEMENTS,
} from '../data/realProfileAchievements'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'

function achievementStatusLabel(
  state: (typeof REAL_PROFILE_ACHIEVEMENTS)[number]['state'],
  t: (key: 'realProfileAchievementLocked' | 'realProfileAchievementProgress' | 'realProfileAchievementClaim' | 'realProfileAchievementCompleted') => string,
): string {
  if (state === 'locked') return t('realProfileAchievementLocked')
  if (state === 'progress') return t('realProfileAchievementProgress')
  if (state === 'claimable') return t('realProfileAchievementClaim')
  return t('realProfileAchievementCompleted')
}

export function RealProfileAchievementsTab() {
  const { locale, t } = useLocale()
  const [page, setPage] = useState(1)
  const entries = REAL_PROFILE_ACHIEVEMENTS.filter((entry) => entry.page === page)

  return (
    <div className="real-profile-achievements-tab">
      <ul className="real-profile-achievements-list sibs-scrollbar real-profile-board-scroll">
        {entries.map((entry) => {
          const progressRatio =
            entry.target && entry.target > 0 && entry.progress != null
              ? Math.min(1, entry.progress / entry.target)
              : null
          const statusText =
            entry.state === 'progress' && entry.target != null
              ? `${entry.progress ?? 0} / ${entry.target}`
              : achievementStatusLabel(entry.state, t)

          return (
            <li key={entry.id} className={`real-profile-achievement real-profile-achievement--${entry.state}`}>
              <div className="real-profile-achievement-copy">
                <h3 className="real-profile-achievement-title">{getPrimaryText(entry.title, locale)}</h3>
                <p className="real-profile-achievement-desc">{getPrimaryText(entry.description, locale)}</p>
              </div>
              <div className="real-profile-achievement-rewards" aria-label={t('realProfileAchievementRewards')}>
                {entry.awards?.exp ? (
                  <span className="real-profile-achievement-reward real-profile-achievement-reward--exp">
                    +{entry.awards.exp}
                  </span>
                ) : null}
                {entry.awards?.gems ? (
                  <span className="real-profile-achievement-reward real-profile-achievement-reward--gems">
                    ☀ {entry.awards.gems}
                  </span>
                ) : null}
              </div>
              <div className="real-profile-achievement-status-wrap">
                {progressRatio != null && entry.state === 'progress' ? (
                  <div className="real-profile-achievement-progress-track">
                    <div className="real-profile-achievement-progress-fill" style={{ width: `${progressRatio * 100}%` }} />
                  </div>
                ) : null}
                <span className="real-profile-achievement-state">{statusText}</span>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="real-profile-achievement-pages" role="tablist" aria-label={t('realProfileAchievementsPages')}>
        {Array.from({ length: REAL_PROFILE_ACHIEVEMENT_PAGE_COUNT }, (_, index) => {
          const pageNumber = index + 1
          const active = pageNumber === page
          return (
            <button
              key={pageNumber}
              type="button"
              role="tab"
              aria-selected={active}
              className={`real-profile-achievement-page-dot${active ? ' real-profile-achievement-page-dot--active' : ''}`}
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          )
        })}
      </div>
    </div>
  )
}
