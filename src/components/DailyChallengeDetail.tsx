import {
  DAILY_CHALLENGE_GUIDE,
  getAssignedRouteDescription,
} from '../data/dailyChallengeGuide'
import {
  findRouteForDailyChallenge,
  getPrivateHireWikiUrl,
  isPrivateHireChallengeRoute,
  type DailyChallengeInfo,
} from '../data/dailyChallenge'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import { DailyChallengeIntro } from './DailyChallengeIntro'

interface DailyChallengeDetailProps {
  challenge: DailyChallengeInfo
  onClose: () => void
  className?: string
}

function GuideList({ items, locale }: { items: { zh: string; en: string }[]; locale: Parameters<typeof getPrimaryText>[1] }) {
  return (
    <ul className="daily-challenge-guide-list">
      {items.map((item, index) => (
        <li key={index}>{getPrimaryText(item, locale)}</li>
      ))}
    </ul>
  )
}

export function DailyChallengeDetail({
  challenge,
  onClose,
  className = '',
}: DailyChallengeDetailProps) {
  const { locale, t } = useLocale()
  const guide = DAILY_CHALLENGE_GUIDE
  const routeNumber = challenge.routeNumber ?? '—'
  const showPrivateHireWiki = isPrivateHireChallengeRoute(challenge.routeNumber)
  const showRouteNotFound =
    !!challenge.routeNumber &&
    !showPrivateHireWiki &&
    !findRouteForDailyChallenge(challenge.routeNumber)

  return (
    <aside
      className={`route-detail daily-challenge-detail ${className}`.trim()}
      aria-label={t('dailyChallengeDetailAria', { route: routeNumber })}
    >
      <div className="detail-header">
        <div className="detail-header-title">
          <span className="detail-number">{routeNumber}</span>
          <span className="zone-tag">{t('routeGroupDaily')}</span>
        </div>
        <button type="button" className="close-btn" onClick={onClose} aria-label={t('closeDetail')}>
          ×
        </button>
      </div>

      <article className="daily-challenge-guide">
        <h2 className="daily-challenge-guide-title">{getPrimaryText(guide.title, locale)}</h2>
        <p className="daily-challenge-guide-lead">{getPrimaryText(guide.welcome, locale)}</p>
        {challenge.intro ? <DailyChallengeIntro intro={challenge.intro} /> : null}
        <p>{getPrimaryText(guide.overview, locale)}</p>
        {showRouteNotFound ? (
          <p className="route-meta">{t('dailyChallengeRouteNotFound')}</p>
        ) : null}

        <section className="detail-section daily-challenge-guide-section">
          <h3>{getPrimaryText(guide.challengeHeading, locale)}</h3>

          <h4>{getPrimaryText(guide.assignedRouteHeading, locale)}</h4>
          <p>{getPrimaryText(getAssignedRouteDescription(routeNumber), locale)}</p>

          <h4>{getPrimaryText(guide.requirementsHeading, locale)}</h4>
          <p>{getPrimaryText(guide.requirementsIntro, locale)}</p>
          <GuideList items={guide.requirements} locale={locale} />

          <h4>{getPrimaryText(guide.scoringHeading, locale)}</h4>
          <p>{getPrimaryText(guide.scoringIntro, locale)}</p>
          <GuideList items={guide.scoring} locale={locale} />
        </section>

        <section className="detail-section daily-challenge-guide-section">
          <h3>{getPrimaryText(guide.rewardsHeading, locale)}</h3>
          <p>{getPrimaryText(guide.rewardsIntro, locale)}</p>
          <GuideList items={guide.rewards} locale={locale} />
        </section>

        <section className="detail-section daily-challenge-guide-section">
          <h3>{getPrimaryText(guide.notesHeading, locale)}</h3>
          <GuideList items={guide.notes} locale={locale} />
        </section>

        <p className="daily-challenge-guide-closing-lead">{getPrimaryText(guide.closingLead, locale)}</p>
        <p className="daily-challenge-guide-closing">{getPrimaryText(guide.closing, locale)}</p>

        {challenge.isPlaceholder ? (
          <p className="route-meta daily-challenge-guide-footnote">{t('dailyChallengePlaceholderNote')}</p>
        ) : null}
      </article>

      {showPrivateHireWiki ? (
        <div className="detail-links">
          <a href={getPrivateHireWikiUrl()} target="_blank" rel="noreferrer">
            {t('linkWiki')}
          </a>
        </div>
      ) : null}
    </aside>
  )
}
