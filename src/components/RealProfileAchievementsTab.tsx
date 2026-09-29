import { REAL_PROFILE_ACHIEVEMENTS } from '../data/realProfileAchievements'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'

function achievementStateLabel(
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

  return (
    <div className="real-profile-achievements-tab sibs-scrollbar">
      <p className="real-profile-tab-lead">{t('realProfileAchievementsLead')}</p>
      <ul className="real-profile-achievements-list">
        {REAL_PROFILE_ACHIEVEMENTS.map((entry) => {
          const progressRatio =
            entry.target && entry.target > 0 && entry.progress != null
              ? Math.min(1, entry.progress / entry.target)
              : null
          return (
            <li key={entry.id} className={`real-profile-achievement real-profile-achievement--${entry.state}`}>
              <div className="real-profile-achievement-copy">
                <h3 className="real-profile-achievement-title">{getPrimaryText(entry.title, locale)}</h3>
                <p className="real-profile-achievement-desc">{getPrimaryText(entry.description, locale)}</p>
                {progressRatio != null ? (
                  <div className="real-profile-achievement-progress">
                    <div className="real-profile-achievement-progress-track">
                      <div
                        className="real-profile-achievement-progress-fill"
                        style={{ width: `${progressRatio * 100}%` }}
                      />
                    </div>
                    <span className="real-profile-achievement-progress-label">
                      {entry.progress}/{entry.target}
                    </span>
                  </div>
                ) : null}
                {entry.awards ? (
                  <p className="real-profile-achievement-awards">
                    {entry.awards.gems ? `${entry.awards.gems} ☀` : null}
                    {entry.awards.gems && entry.awards.exp ? ' · ' : null}
                    {entry.awards.exp ? `${entry.awards.exp} EXP` : null}
                  </p>
                ) : null}
              </div>
              <span className="real-profile-achievement-state">{achievementStateLabel(entry.state, t)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
