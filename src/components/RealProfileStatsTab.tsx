import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUserProfile } from '../contexts/UserProfileContext'
import { useLocale } from '../i18n/LocaleContext'
import { getAccountPageHref } from '../utils/appPage'
import { resolveAccountLicenseName } from '../utils/accountAvatar'
import { realProfileUiImageUrl } from '../utils/robloxImageUrl'
import { RealProfileLicensePhoto } from './RealProfileLicensePhoto'
import { RealProfileUiImage } from './RealProfileUiImage'

export interface RealProfileStats {
  routesCompleted: number
  busStopLines: number
  passengers: number
  dangerousDriving: number
  destinationError: number
  earlyDeparture: number
  otherComplaints: number
  driverLevel: number
}

function formatStatCount(value: number): string {
  return value.toLocaleString()
}

export function RealProfileStatsTab({
  stats,
  licenseName,
  issueDate,
}: {
  stats: RealProfileStats
  licenseName: string
  issueDate: string
}) {
  const { t } = useLocale()
  const { isLoggedIn, email } = useAuth()
  const { profile } = useUserProfile()
  const [detailOpen, setDetailOpen] = useState(false)
  const accountHref = getAccountPageHref()
  const profileEmail = profile?.email ?? email
  const paperBg = realProfileUiImageUrl('statsPaper')

  return (
    <div className="real-profile-stats-stage">
      <article className="real-profile-license" aria-label={t('realProfileLicenseTitle')}>
        <header className="real-profile-license-header">
          <RealProfileUiImage asset="licenseSun" className="real-profile-license-sun-img" alt="" />
          <h2 className="real-profile-license-title">{t('realProfileLicenseTitle')}</h2>
        </header>
        <div className="real-profile-license-rule" aria-hidden="true" />
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
              <dt>{t('realProfileLicenseName')}</dt>
              <dd>{licenseName}</dd>
            </div>
            <div>
              <dt>{t('realProfileLicenseIssueDate')}</dt>
              <dd>{issueDate}</dd>
            </div>
            <div>
              <dt>{t('realProfileLicenseLevel')}</dt>
              <dd>{stats.driverLevel}</dd>
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

      <article
        className="real-profile-stats-note"
        aria-label={t('realProfileTabStats')}
        style={
          paperBg
            ? {
                backgroundImage: `url(${paperBg})`,
              }
            : undefined
        }
      >
        <button
          type="button"
          className="real-profile-stats-zoom-btn"
          aria-label={t('realProfileStatsDetail')}
          onClick={() => setDetailOpen(true)}
        >
          <RealProfileUiImage asset="statsZoom" className="real-profile-stats-zoom-img" alt="" />
        </button>
        <div className="real-profile-stats-inner">
          <dl className="real-profile-stats-list">
            <div>
              <dt>{t('realProfileStatRoutes')}</dt>
              <dd>{formatStatCount(stats.routesCompleted)}</dd>
            </div>
            <div>
              <dt>{t('realProfileStatStopLines')}</dt>
              <dd>{formatStatCount(stats.busStopLines)}</dd>
            </div>
            <div>
              <dt>{t('realProfileStatPassengers')}</dt>
              <dd>{formatStatCount(stats.passengers)}</dd>
            </div>
          </dl>
          <dl className="real-profile-stats-list real-profile-stats-list--negative">
            <div>
              <dt>{t('realProfileStatDangerous')}</dt>
              <dd>{formatStatCount(stats.dangerousDriving)}</dd>
            </div>
            <div>
              <dt>{t('realProfileStatDestinationError')}</dt>
              <dd>{formatStatCount(stats.destinationError)}</dd>
            </div>
            <div>
              <dt>{t('realProfileStatEarlyDeparture')}</dt>
              <dd>{formatStatCount(stats.earlyDeparture)}</dd>
            </div>
            <div>
              <dt>{t('realProfileStatComplaints')}</dt>
              <dd>{formatStatCount(stats.otherComplaints)}</dd>
            </div>
          </dl>
        </div>
      </article>

      {detailOpen ? (
        <div className="real-profile-stats-detail" role="dialog" aria-modal="true" aria-label={t('realProfileStatsDetail')}>
          <button type="button" className="real-profile-stats-detail-backdrop" aria-label={t('realProfileStatsDetailClose')} onClick={() => setDetailOpen(false)} />
          <div className="real-profile-stats-detail-panel">
            <header className="real-profile-stats-detail-head">
              <h3>{t('realProfileStatsDetail')}</h3>
              <button type="button" className="real-profile-stats-detail-close" onClick={() => setDetailOpen(false)}>
                ×
              </button>
            </header>
            <dl className="real-profile-stats-list">
              <div>
                <dt>{t('realProfileStatRoutes')}</dt>
                <dd>{formatStatCount(stats.routesCompleted)}</dd>
              </div>
              <div>
                <dt>{t('realProfileStatStopLines')}</dt>
                <dd>{formatStatCount(stats.busStopLines)}</dd>
              </div>
              <div>
                <dt>{t('realProfileStatPassengers')}</dt>
                <dd>{formatStatCount(stats.passengers)}</dd>
              </div>
            </dl>
            <dl className="real-profile-stats-list real-profile-stats-list--negative">
              <div>
                <dt>{t('realProfileStatDangerous')}</dt>
                <dd>{formatStatCount(stats.dangerousDriving)}</dd>
              </div>
              <div>
                <dt>{t('realProfileStatDestinationError')}</dt>
                <dd>{formatStatCount(stats.destinationError)}</dd>
              </div>
              <div>
                <dt>{t('realProfileStatEarlyDeparture')}</dt>
                <dd>{formatStatCount(stats.earlyDeparture)}</dd>
              </div>
              <div>
                <dt>{t('realProfileStatComplaints')}</dt>
                <dd>{formatStatCount(stats.otherComplaints)}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  )
}
