import {
  DAILY_CHALLENGE_CARD_ID,
  findDailyChallengeDirectionIndex,
  findRouteForDailyChallenge,
  getDailyChallengeOperatorsLabel,
  isPrivateHireChallengeRoute,
  type DailyChallengeInfo,
} from '../data/dailyChallenge'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import { getDirectionLengthKm } from '../utils/routeDirections'
import { DailyChallengeIntro } from './DailyChallengeIntro'
import { DailyChallengeResetCountdown } from './DailyChallengeResetCountdown'
import { DailyChallengeCalendarButton } from './DailyChallengeCalendarButton'

interface DailyChallengeCardProps {
  selected?: boolean
  onSelect: () => void
  onOpenCalendar?: () => void
  className?: string
  showPlaceholderNote?: boolean
  showResetCountdown?: boolean
  challenge: DailyChallengeInfo
}

export function DailyChallengeCard({
  selected = false,
  onSelect,
  onOpenCalendar,
  className = '',
  showPlaceholderNote = true,
  showResetCountdown = true,
  challenge,
}: DailyChallengeCardProps) {
  const { locale, t } = useLocale()
  const eventLabel = getPrimaryText(challenge.event, locale)
  const endpointsLabel = challenge.endpoints
    ? getPrimaryText(challenge.endpoints, locale)
    : null
  const routeNumber = challenge.routeNumber ?? '—'
  const linkedRoute =
    challenge.routeNumber && !isPrivateHireChallengeRoute(challenge.routeNumber)
      ? findRouteForDailyChallenge(challenge.routeNumber)
      : null
  const directionIndex =
    linkedRoute != null
      ? (findDailyChallengeDirectionIndex(linkedRoute, challenge.directionKey) ?? 0)
      : 0
  const lengthKm = linkedRoute ? getDirectionLengthKm(linkedRoute, directionIndex, locale) : null
  const operatorsLabel = getDailyChallengeOperatorsLabel(challenge, locale)

  return (
    <div
      data-route-id={DAILY_CHALLENGE_CARD_ID}
      data-tour="daily-challenge"
      role="button"
      tabIndex={0}
      className={`route-card daily-challenge-card ${selected ? 'selected' : ''} ${className}`.trim()}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      aria-pressed={selected}
      aria-label={t('dailyChallengeAria')}
    >
      {showResetCountdown ? <DailyChallengeResetCountdown /> : null}

      {lengthKm ? (
        <span className="route-card-km route-card-km--corner" key={`${routeNumber}-km-${directionIndex}`}>
          {lengthKm}
        </span>
      ) : null}

      <div className="route-card-top">
        <div className="route-card-title">
          <span className="route-number">{routeNumber}</span>
        </div>
        {onOpenCalendar ? (
          <div className="route-card-top-actions">
            <DailyChallengeCalendarButton onClick={onOpenCalendar} />
          </div>
        ) : null}
      </div>

      <p className="route-endpoints">{endpointsLabel ?? eventLabel}</p>

      {endpointsLabel ? <p className="route-meta">{eventLabel}</p> : null}

      {challenge.intro ? (
        <DailyChallengeIntro intro={challenge.intro} compact className="route-meta" />
      ) : null}

      {showPlaceholderNote && challenge.fromSchedule ? (
        <p className="route-meta">{t('dailyChallengeScheduleNote')}</p>
      ) : null}

      {showPlaceholderNote && challenge.isPlaceholder ? (
        <p className="route-meta">{t('dailyChallengePlaceholderNote')}</p>
      ) : null}

      <div className="route-card-bottom">
        <div className="route-card-meta-left">
          <div className="route-zones">
            <span className="zone-tag">{t('routeGroupDaily')}</span>
          </div>
        </div>

        {operatorsLabel ? (
          <div className="route-card-foot">
            <span className="route-card-operators">{operatorsLabel}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
