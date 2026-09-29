import { useMemo, type MouseEvent } from 'react'
import {
  getDailyChallengeListedRouteId,
  type DailyChallengeInfo,
} from '../data/dailyChallenge'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import { navigateRealShellTab, setRealShellPendingTab } from '../utils/realShellNavigation'

interface RealStartDailyChallengePanelProps {
  challenge: DailyChallengeInfo
}

function formatChallengeDateTime(date: string, locale: string): string {
  const instant = new Date(`${date}T08:00:00+08:00`)
  if (Number.isNaN(instant.getTime())) return date
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-Hans', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Hong_Kong',
  }).format(instant)
}

export function RealStartDailyChallengePanel({ challenge }: RealStartDailyChallengePanelProps) {
  const { locale, t } = useLocale()
  const routeCode = getDailyChallengeListedRouteId(challenge) ?? challenge.routeNumber ?? '—'
  const eventLabel = getPrimaryText(challenge.event, locale)
  const heading = challenge.race ? t('realStartRaceDayHeading') : t('realStartDailyChallengeHeading')
  const title = t('realStartDailyChallengePanelTitle', { heading, detail: eventLabel || routeCode })
  const dateLabel = useMemo(
    () => (challenge.date ? formatChallengeDateTime(challenge.date, locale) : '—'),
    [challenge.date, locale],
  )

  const openRoutes = (clickEvent: MouseEvent<HTMLButtonElement>) => {
    clickEvent.preventDefault()
    setRealShellPendingTab('routes')
    navigateRealShellTab('routes')
  }

  return (
    <button
      type="button"
      className="real-start-r-panel real-start-daily-challenge"
      onClick={openRoutes}
      aria-label={title}
    >
      <div className="real-start-coming-event-date">
        <span className="real-start-coming-event-date-icon" aria-hidden="true">
          📅
        </span>
        <span className="real-start-coming-event-date-text">{dateLabel}</span>
      </div>

      <div className="real-start-coming-event-thumb real-start-daily-challenge-thumb">
        <span className="real-start-daily-challenge-route" aria-hidden="true">
          {routeCode}
        </span>
        <span className="real-start-coming-event-badge real-start-coming-event-badge--live">
          {t('realStartEventLive')}
        </span>
      </div>

      <p className="real-start-coming-event-title">{title}</p>
    </button>
  )
}
