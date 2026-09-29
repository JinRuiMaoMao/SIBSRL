import { REAL_PROFILE_LEADERBOARD_PANELS } from '../data/realProfileLeaderboard'
import { useLocale } from '../i18n/LocaleContext'
import { RobloxHeadshotImage } from './RobloxHeadshotImage'

export function RealProfileLeaderboardTab() {
  const { t } = useLocale()

  return (
    <div className="real-profile-leaderboard-tab">
      <div className="real-profile-leaderboard-panels">
        {REAL_PROFILE_LEADERBOARD_PANELS.map((panel) => (
          <section key={panel.id} className="real-profile-leaderboard-panel">
            <header className="real-profile-leaderboard-head">
              <h3 className="real-profile-leaderboard-title">{t(panel.titleKey)}</h3>
            </header>
            <ol className="real-profile-leaderboard-list sibs-scrollbar real-profile-board-scroll">
              {panel.rows.map((row) => (
                <li key={`${panel.id}-${row.rank}`} className="real-profile-leaderboard-row">
                  {row.userId ? (
                    <RobloxHeadshotImage
                      userId={row.userId}
                      displayName={row.name}
                      className="real-profile-leaderboard-avatar"
                      size={34}
                    />
                  ) : (
                    <span className="real-profile-leaderboard-avatar real-profile-leaderboard-avatar--empty" />
                  )}
                  <div className="real-profile-leaderboard-copy">
                    <span className="real-profile-leaderboard-name">
                      {row.rank}. {row.name}
                    </span>
                    <span className="real-profile-leaderboard-value">{row.score.toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ol>
            <footer className="real-profile-leaderboard-you">
              <RobloxHeadshotImage
                userId={23651717}
                displayName="You"
                className="real-profile-leaderboard-avatar"
                size={34}
              />
              <div className="real-profile-leaderboard-copy">
                <span className="real-profile-leaderboard-name">{panel.playerLabel}</span>
                <span className="real-profile-leaderboard-value">{panel.playerScoreLabel}</span>
              </div>
            </footer>
            {panel.endingLabel ? (
              <p className="real-profile-leaderboard-ending">
                {t('realProfileLeaderboardEnding', { time: panel.endingLabel })}
              </p>
            ) : null}
          </section>
        ))}
      </div>
      <p className="real-profile-leaderboard-footnote">{t('realProfileLeaderboardUpdating')}</p>
    </div>
  )
}
