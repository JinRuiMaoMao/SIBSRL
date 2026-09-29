import { useEffect, useMemo, useState, type AnimationEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUserProfile } from '../contexts/UserProfileContext'
import { useRealDriverProgress } from '../hooks/useRealDriverProgress'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import { REAL_PROFILE_TAB_ICON_KEYS, REAL_PROFILE_TABS_WITH_NEW_BADGE } from '../data/realProfileAssets'
import { resolveAccountLicenseName } from '../utils/accountAvatar'
import { syncFavicon, syncHtmlLang } from '../utils/documentMetadata'
import type { RealProfileHudTab } from '../utils/realHudEvents'
import { realProfileImageUrl } from '../utils/robloxImageUrl'
import { RealProfileAchievementsTab } from './RealProfileAchievementsTab'
import { RealProfileIconsTab } from './RealProfileIconsTab'
import { RealProfileLeaderboardTab } from './RealProfileLeaderboardTab'
import { RealProfileStatsTab } from './RealProfileStatsTab'
import { RealProfileTitleTab } from './RealProfileTitleTab'
import { RealProfileUiImage } from './RealProfileUiImage'

type RealProfileTabId = RealProfileHudTab

const PROFILE_TABS: Array<{
  id: RealProfileTabId
  labelKey: MessageKey
}> = [
  { id: 'stats', labelKey: 'realProfileTabStats' },
  { id: 'title', labelKey: 'realProfileTabTitle' },
  { id: 'icon', labelKey: 'realProfileTabIcon' },
  { id: 'leaderboard', labelKey: 'realProfileTabLeaderboard' },
  { id: 'achievements', labelKey: 'realProfileTabAchievements' },
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
} as const

function formatProfileDate(locale: string): string {
  return new Intl.DateTimeFormat(locale.startsWith('zh') ? 'zh-Hant' : locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function RealProfilePage({
  initialTab = 'stats',
  onClose,
  onAnimationEnd,
}: {
  initialTab?: RealProfileTabId
  onClose: () => void
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
}) {
  const { locale, t } = useLocale()
  const { isLoggedIn, email } = useAuth()
  const { profile } = useUserProfile()
  const { level } = useRealDriverProgress()
  const [activeTab, setActiveTab] = useState<RealProfileTabId>(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  const profileEmail = profile?.email ?? email
  const licenseName = isLoggedIn
    ? resolveAccountLicenseName(profile?.displayName, profileEmail)
    : t('realProfileGuestName')
  const issueDate = useMemo(() => formatProfileDate(locale), [locale])
  const stats = useMemo(
    () => ({
      ...DEFAULT_STATS,
      driverLevel: level,
    }),
    [level],
  )

  useEffect(() => {
    syncFavicon()
    syncHtmlLang(locale)
    document.title = t('realProfilePageDocumentTitle')
  }, [locale, t])

  const chalkboardBg = realProfileImageUrl('chalkboard')

  return (
    <div className="real-profile-page sibs-scrollbar">
      <div className="real-profile-panel" onAnimationEnd={onAnimationEnd}>
        <div className="real-profile-shell">
          <header className="real-profile-header">
            <button type="button" className="real-profile-back" onClick={onClose}>
              <RealProfileUiImage asset="exitChevron" className="real-profile-back-icon" alt="" />
              <span>{t('realProfilePageTitle')}</span>
            </button>
          </header>

          <div className="real-profile-chalkboard-wrap">
            <div
              className="real-profile-chalkboard"
              style={
                chalkboardBg
                  ? {
                      backgroundImage: `linear-gradient(145deg, rgb(255 255 255 / 0.04), transparent 38%), url(${chalkboardBg})`,
                    }
                  : undefined
              }
            >
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
                        <span className="real-profile-tab-icon-wrap">
                          <RealProfileUiImage
                            asset={REAL_PROFILE_TAB_ICON_KEYS[tab.id]}
                            className="real-profile-tab-icon-img"
                            alt=""
                          />
                          {REAL_PROFILE_TABS_WITH_NEW_BADGE.includes(tab.id) ? (
                            <RealProfileUiImage asset="newBadge" className="real-profile-tab-new" alt="" />
                          ) : null}
                        </span>
                        <span className="real-profile-tab-label">{t(tab.labelKey)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="real-profile-board-content">
                {activeTab === 'stats' ? (
                  <RealProfileStatsTab stats={stats} licenseName={licenseName} issueDate={issueDate} />
                ) : activeTab === 'title' ? (
                  <RealProfileTitleTab />
                ) : activeTab === 'icon' ? (
                  <RealProfileIconsTab />
                ) : activeTab === 'leaderboard' ? (
                  <RealProfileLeaderboardTab />
                ) : (
                  <RealProfileAchievementsTab />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
