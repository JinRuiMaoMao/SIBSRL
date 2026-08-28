import { useEffect, useMemo, useState, type AnimationEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUserProfile } from '../contexts/UserProfileContext'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import { getAccountPageHref } from '../utils/appPage'
import { resolveAccountLicenseName } from '../utils/accountAvatar'
import { syncFavicon, syncHtmlLang } from '../utils/documentMetadata'
import { RealProfileLicensePhoto } from './RealProfileLicensePhoto'
import { RealProfileTitleTab } from './RealProfileTitleTab'

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

const DEFAULT_STATS = {
  distanceKm: 0,
  routesCompleted: 0,
  busStopLines: 0,
  passengers: 0,
  dangerousDriving: 0,
  destinationError: 0,
  earlyDeparture: 0,
  otherComplaints: 0,
  driverLevel: 0,
} as const

function formatStatCount(value: number): string {
  return value.toLocaleString()
}

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
  const { profile } = useUserProfile()
  const [activeTab, setActiveTab] = useState<RealProfileTabId>('stats')
  const accountHref = getAccountPageHref()
  const profileEmail = profile?.email ?? email
  const licenseName = isLoggedIn
    ? resolveAccountLicenseName(profile?.displayName, profileEmail)
    : t('realProfileGuestName')
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
                  <div className="real-profile-stats-stage">
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
                            email={profileEmail}
                            avatarDataUrl={profile?.avatarDataUrl}
                          />
                        </div>
                        <dl className="real-profile-license-fields">
                          <div>
                            <dt>{t('authDisplayNameLabel')}</dt>
                            <dd>{licenseName}</dd>
                          </div>
                          <div>
                            <dt>{t('realProfileLicenseIssueDate')}</dt>
                            <dd>{issueDate}</dd>
                          </div>
                          <div>
                            <dt>{t('realProfileLicenseLevel')}</dt>
                            <dd>{DEFAULT_STATS.driverLevel}</dd>
                          </div>
                        </dl>
                      </div>
                      <p className="real-profile-license-signature">{licenseName}</p>
                      {!isLoggedIn ? (
                        <a className="real-profile-account-link" href={accountHref}>
                          {t('realProfileSignInLink')}
                        </a>
                      ) : null}
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
                          <dd>{formatStatCount(DEFAULT_STATS.distanceKm)} km</dd>
                        </div>
                        <div>
                          <dt>{t('realProfileStatRoutes')}</dt>
                          <dd>{formatStatCount(DEFAULT_STATS.routesCompleted)}</dd>
                        </div>
                        <div>
                          <dt>{t('realProfileStatStopLines')}</dt>
                          <dd>{formatStatCount(DEFAULT_STATS.busStopLines)}</dd>
                        </div>
                        <div>
                          <dt>{t('realProfileStatPassengers')}</dt>
                          <dd>{formatStatCount(DEFAULT_STATS.passengers)}</dd>
                        </div>
                      </dl>
                      <dl className="real-profile-stats-list real-profile-stats-list--negative">
                        <div>
                          <dt>{t('realProfileStatDangerous')}</dt>
                          <dd>{formatStatCount(DEFAULT_STATS.dangerousDriving)}</dd>
                        </div>
                        <div>
                          <dt>{t('realProfileStatDestinationError')}</dt>
                          <dd>{formatStatCount(DEFAULT_STATS.destinationError)}</dd>
                        </div>
                        <div>
                          <dt>{t('realProfileStatEarlyDeparture')}</dt>
                          <dd>{formatStatCount(DEFAULT_STATS.earlyDeparture)}</dd>
                        </div>
                        <div>
                          <dt>{t('realProfileStatComplaints')}</dt>
                          <dd>{formatStatCount(DEFAULT_STATS.otherComplaints)}</dd>
                        </div>
                      </dl>
                    </article>
                  </div>
                ) : activeTab === 'title' ? (
                  <RealProfileTitleTab />
                ) : activeTab === 'icon' ? (
                  <div className="real-profile-icon-tab">
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
