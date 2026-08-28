import { useEffect, useMemo, useState, type AnimationEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUserProfile } from '../contexts/UserProfileContext'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import { getAccountPageHref } from '../utils/appPage'
import { syncFavicon, syncHtmlLang } from '../utils/documentMetadata'
import { RealProfileLicensePhoto } from './RealProfileLicensePhoto'

type RealProfileTabId = 'stats' | 'title' | 'icon' | 'leaderboard' | 'achievements'

const PROFILE_TABS: Array<{
  id: RealProfileTabId
  labelKey: MessageKey
  icon: string
}> = [
  { id: 'stats', labelKey: 'realProfileTabStats', icon: '▤' },
  { id: 'title', labelKey: 'realProfileTabTitle', icon: '@' },
  { id: 'icon', labelKey: 'realProfileTabIcon', icon: '☺' },
  { id: 'leaderboard', labelKey: 'realProfileTabLeaderboard', icon: '▥' },
  { id: 'achievements', labelKey: 'realProfileTabAchievements', icon: '★' },
]

const DEMO_STATS = {
  distanceKm: 9129,
  routesCompleted: 621,
  busStopLines: 13475,
  passengers: 63367,
  dangerousDriving: 21637,
  destinationError: 682,
  earlyDeparture: 2545,
  otherComplaints: 489,
  driverLevel: 122,
} as const

function formatProfileDate(locale: string): string {
  return new Intl.DateTimeFormat(locale.startsWith('zh') ? 'zh-Hant' : locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function RealProfilePage({
  onClose,
  onAnimationEnd,
}: {
  onClose: () => void
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
}) {
  const { locale, t } = useLocale()
  const { isLoggedIn, email } = useAuth()
  const { profile, displayLabel } = useUserProfile()
  const [activeTab, setActiveTab] = useState<RealProfileTabId>('stats')
  const accountHref = getAccountPageHref()

  const displayName = profile?.displayName?.trim() || displayLabel || t('realProfileGuestName')
  const issueDate = useMemo(() => formatProfileDate(locale), [locale])

  useEffect(() => {
    syncFavicon()
    syncHtmlLang(locale)
    document.title = t('realProfilePageDocumentTitle')
  }, [locale, t])

  return (
    <div className="real-profile-page sibs-scrollbar">
      <div className="real-profile-panel" onAnimationEnd={onAnimationEnd}>
        <div className="real-profile-shell">
          <header className="real-profile-header">
            <button type="button" className="real-profile-back" onClick={onClose}>
              <span className="real-profile-back-chevron" aria-hidden="true">
                ‹
              </span>
              <span>{t('realProfilePageTitle')}</span>
            </button>
          </header>

          <div className="real-profile-chalkboard-wrap">
            <div className="real-profile-chalkboard">
              <nav className="real-profile-tabs" aria-label={t('realProfilePageTitle')}>
                <ul className="real-profile-tabs-list">
                  {PROFILE_TABS.map((tab) => (
                    <li key={tab.id}>
                      <button
                        type="button"
                        className={`real-profile-tab${activeTab === tab.id ? ' real-profile-tab--active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        aria-pressed={activeTab === tab.id}
                      >
                        <span className="real-profile-tab-icon" aria-hidden="true">
                          {tab.icon}
                        </span>
                        <span className="real-profile-tab-label">{t(tab.labelKey)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="real-profile-board-content">
                {activeTab === 'stats' ? (
                  <>
                    <article className="real-profile-license" aria-label={t('realProfileLicenseTitle')}>
                      <header className="real-profile-license-header">
                        <span className="real-profile-license-sun" aria-hidden="true">
                          ☀
                        </span>
                        <h2 className="real-profile-license-title">{t('realProfileLicenseTitle')}</h2>
                      </header>
                      <div className="real-profile-license-body">
                        <div className="real-profile-license-photo-wrap">
                          <RealProfileLicensePhoto
                            displayName={profile?.displayName}
                            email={profile?.email ?? email}
                            avatarDataUrl={profile?.avatarDataUrl}
                          />
                        </div>
                        <dl className="real-profile-license-fields">
                          <div>
                            <dt>{t('realProfileLicenseName')}</dt>
                            <dd>{displayName}</dd>
                          </div>
                          <div>
                            <dt>{t('realProfileLicenseIssueDate')}</dt>
                            <dd>{issueDate}</dd>
                          </div>
                          <div>
                            <dt>{t('realProfileLicenseLevel')}</dt>
                            <dd>{DEMO_STATS.driverLevel}</dd>
                          </div>
                        </dl>
                      </div>
                      <p className="real-profile-license-signature">{displayName}</p>
                      {!isLoggedIn ? (
                        <a className="real-profile-account-link" href={accountHref}>
                          {t('realProfileSignInLink')}
                        </a>
                      ) : (
                        <a className="real-profile-account-link" href={accountHref}>
                          {t('realProfileManageAccountLink')}
                        </a>
                      )}
                    </article>

                    <article className="real-profile-stats-note" aria-label={t('realProfileTabStats')}>
                      <span className="real-profile-stats-tape real-profile-stats-tape--tl" aria-hidden="true" />
                      <span className="real-profile-stats-tape real-profile-stats-tape--br" aria-hidden="true" />
                      <span className="real-profile-stats-zoom" aria-hidden="true">
                        🔍
                      </span>
                      <dl className="real-profile-stats-list">
                        <div>
                          <dt>{t('realProfileStatDistance')}</dt>
                          <dd>{DEMO_STATS.distanceKm.toLocaleString()} km</dd>
                        </div>
                        <div>
                          <dt>{t('realProfileStatRoutes')}</dt>
                          <dd>{DEMO_STATS.routesCompleted.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>{t('realProfileStatStopLines')}</dt>
                          <dd>{DEMO_STATS.busStopLines.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>{t('realProfileStatPassengers')}</dt>
                          <dd>{DEMO_STATS.passengers.toLocaleString()}</dd>
                        </div>
                      </dl>
                      <dl className="real-profile-stats-list real-profile-stats-list--negative">
                        <div>
                          <dt>{t('realProfileStatDangerous')}</dt>
                          <dd>{DEMO_STATS.dangerousDriving.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>{t('realProfileStatDestinationError')}</dt>
                          <dd>{DEMO_STATS.destinationError.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>{t('realProfileStatEarlyDeparture')}</dt>
                          <dd>{DEMO_STATS.earlyDeparture.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>{t('realProfileStatComplaints')}</dt>
                          <dd>{DEMO_STATS.otherComplaints.toLocaleString()}</dd>
                        </div>
                      </dl>
                      <p className="real-profile-stats-demo">{t('realProfileStatsDemoNote')}</p>
                    </article>
                  </>
                ) : activeTab === 'icon' ? (
                  <div className="real-profile-icon-tab">
                    <RealProfileLicensePhoto
                      displayName={profile?.displayName}
                      email={profile?.email ?? email}
                      avatarDataUrl={profile?.avatarDataUrl}
                      size="icon"
                    />
                    <p className="real-profile-icon-hint">{t('realProfileIconHint')}</p>
                    <a className="real-profile-icon-link" href={accountHref}>
                      {isLoggedIn ? t('realProfileIconManageLink') : t('realProfileSignInLink')}
                    </a>
                  </div>
                ) : (
                  <div className="real-profile-tab-placeholder">
                    <p>{t('realProfileTabComingSoon')}</p>
                  </div>
                )}
              </div>

              <div className="real-profile-chalk-props" aria-hidden="true">
                <span className="real-profile-chalk-piece" />
                <span className="real-profile-chalk-eraser" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
