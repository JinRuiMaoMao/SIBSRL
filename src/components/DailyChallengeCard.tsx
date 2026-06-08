import { DAILY_CHALLENGE_CARD_ID, getTodaysDailyChallenge } from '../data/dailyChallenge'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'

interface DailyChallengeCardProps {
  selected?: boolean
  onSelect: () => void
  className?: string
  showPlaceholderNote?: boolean
}

export function DailyChallengeCard({
  selected = false,
  onSelect,
  className = '',
  showPlaceholderNote = true,
}: DailyChallengeCardProps) {
  const { locale, t } = useLocale()
  const challenge = getTodaysDailyChallenge()
  const eventLabel = getPrimaryText(challenge.event, locale)
  const routeNumber = challenge.routeNumber ?? '—'

  return (
    <div
      data-route-id={DAILY_CHALLENGE_CARD_ID}
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
      <div className="route-card-top">
        <div className="route-card-title">
          <span className="route-number">{routeNumber}</span>
        </div>
        <span className="route-card-km">{t('dailyChallengeToday')}</span>
      </div>

      <p className="route-endpoints">{eventLabel}</p>

      {showPlaceholderNote && challenge.isPlaceholder ? (
        <p className="route-meta">{t('dailyChallengePlaceholderNote')}</p>
      ) : null}

      <div className="route-card-bottom">
        <div className="route-card-meta-left">
          <div className="route-zones">
            <span className="zone-tag">{t('routeGroupDaily')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
