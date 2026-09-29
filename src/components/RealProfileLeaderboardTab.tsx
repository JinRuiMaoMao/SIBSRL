import { REAL_PROFILE_LEADERBOARD_PANELS } from '../data/realProfileLeaderboard'
import { useLocale } from '../i18n/LocaleContext'
import { RobloxHeadshotImage } from './RobloxHeadshotImage'

export function RealProfileLeaderboardTab() {
  const { t } = useLocale()

  return (
    <div className="real-profile-leaderboard-tab">
      <p className="real-profile-tab-lead">{t('realProfileLeaderboardLead')}</p>
      <div className="real-profile-leaderboard-panels">
        {REAL_PROFILE_LEADERBOARD_PANELS.map((panel) => (
          <section key={panel.id} className="real-profile-leaderboard-panel">
            <header className="real-profile-leaderboard-head">
              <h3 className="real-profile-leaderboard-title">{t(panel.titleKey)}</h3>
              <time className="real-profile-leaderboard-updated">{panel.updatedLabel}</time>
            </header>
            <ol className="real-profile-leaderboard-list sibs-scrollbar">
              {panel.rows.map((row) => (
                <li key={`${panel.id}-${row.rank}`} className="real-profile-leaderboard-row">
                  <span className="real-profile-leaderboard-rank">{row.rank}</span>
                  {row.userId ? (
                    <RobloxHeadshotImage
                      userId={row.userId}
                      displayName={row.name}
                      className="real-profile-leaderboard-avatar"
                      size={28}
                    />
                  ) : (
                    <span className="real-profile-leaderboard-avatar real-profile-leaderboard-avatar--empty" />
                  )}
                  <span className="real-profile-leaderboard-name">{row.name}</span>
                  <span className="real-profile-leaderboard-value">{row.value}</span>
                </li>
              ))}
            </ol>
            <footer className="real-profile-leaderboard-you">
              <span>{t('realProfileLeaderboardYou')}</span>
              <strong>
                {panel.playerRank ? `#${panel.playerRank}` : '—'} · {panel.playerValue}
              </strong>
              {panel.rewardHint ? (
                <span className="real-profile-leaderboard-reward">{t(panel.rewardHint)}</span>
              ) : null}
            </footer>
          </section>
        ))}
      </div>
    </div>
  )
}
