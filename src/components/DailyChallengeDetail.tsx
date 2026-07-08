import { useMemo, useState } from 'react'
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
import type { RouteStop } from '../types/route'
import {
  enrichPrivateHireRouteStop,
  getPrivateHireStopAudioAtRow,
} from '../utils/privateHireStopDetails'
import { BroadcastAudioButton } from './BroadcastAudioButton'
import { DailyChallengeIntro } from './DailyChallengeIntro'
import { StopDetailPanel } from './StopDetailPanel'
import { StopNameDisplay } from './StopNameDisplay'

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

function PrivateHireStopTable({
  stops,
  routeId,
}: {
  stops: readonly { zh: string; en: string }[]
  routeId: string
}) {
  const { locale, t } = useLocale()
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null)
  const [playingStopAudioId, setPlayingStopAudioId] = useState<string | null>(null)
  const routeStops = useMemo(
    () => stops.map((stop) => enrichPrivateHireRouteStop(stop)),
    [stops],
  )

  return (
    <section className="detail-section" data-tour="route-detail-stops">
      <h3>{t('stopsSection')}</h3>
      <div className="stop-table" role="table">
        <div className="stop-table-row stop-table-head" role="row">
          <span className="stop-table-num" role="columnheader" aria-label="#">
            #
          </span>
          <span className="stop-table-col-name" role="columnheader">
            {t('stopColName')}
          </span>
          <span className="stop-table-col-zone" role="columnheader">
            {t('stopColZone')}
          </span>
          <span className="stop-table-col-audio" role="columnheader">
            {t('stopColAudio')}
          </span>
        </div>
        <ol className="stop-table-body">
          {routeStops.map((stop, index) => {
            const stopAudio = getPrivateHireStopAudioAtRow(routeStops, index)
            const audioId = `${routeId}-ph-at-${index}`
            const nextName = stopAudio ? getPrimaryText(stopAudio.nextStopLabel, locale) : ''

            return (
            <li
              key={`${stop.name.en}-${index}`}
              className={`stop-table-row${selectedStopIndex === index ? ' stop-table-row--selected' : ''}`.trim()}
              role="row"
            >
              <span className="stop-index stop-table-num">{index + 1}</span>
              <button
                type="button"
                className="stop-table-name-btn"
                aria-expanded={selectedStopIndex === index}
                aria-label={t('stopDetailOpenAria', { stop: getPrimaryText(stop.name, locale) })}
                onClick={() => setSelectedStopIndex((current) => (current === index ? null : index))}
              >
                <StopNameDisplay stop={stop} className="stop-table-name" />
              </button>
              <span className="stop-table-zone">
                {stop.zone != null ? (
                  <span className="zone-tag zone-tag--table">Z{stop.zone}</span>
                ) : (
                  <span className="stop-table-empty" aria-hidden="true">
                    —
                  </span>
                )}
              </span>
              <span className="stop-table-audio">
                {stopAudio ? (
                  <BroadcastAudioButton
                    id={audioId}
                    src={stopAudio.audioUrl}
                    activeId={playingStopAudioId}
                    onActiveChange={setPlayingStopAudioId}
                    playLabel={t('routePaPlayNext', { stop: nextName })}
                    pauseLabel={t('broadcastPause')}
                    compact
                  />
                ) : (
                  <span className="stop-table-empty" aria-hidden="true">
                    —
                  </span>
                )}
              </span>
            </li>
            )
          })}
        </ol>
        {selectedStopIndex != null && routeStops[selectedStopIndex] ? (
          <StopDetailPanel
            stop={routeStops[selectedStopIndex]!}
            seq={selectedStopIndex + 1}
            currentRouteId={routeId}
            className="stop-detail-panel--inline"
            onClose={() => setSelectedStopIndex(null)}
          />
        ) : null}
      </div>
    </section>
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

      {challenge.privateHireStops?.length ? (
        <PrivateHireStopTable stops={challenge.privateHireStops} routeId={routeNumber} />
      ) : null}

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

        {challenge.fromSchedule ? (
          <p className="route-meta daily-challenge-guide-footnote">{t('dailyChallengeScheduleNote')}</p>
        ) : challenge.isPlaceholder ? (
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
