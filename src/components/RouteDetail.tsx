import { useEffect, useState } from 'react'
import { useAppDialog } from '../contexts/AppDialogContext'
import { useLocale } from '../i18n/LocaleContext'
import { showCircularLineBesideNumber } from '../utils/routeCategory'
import { getPrimaryText } from '../i18n/displayText'
import { getRouteDisplayTypes } from '../utils/routeTypes'
import type { DailyChallengeIntro as DailyChallengeIntroContent } from '../data/dailyChallenge'
import type { BilingualText, BusRoute } from '../types/route'
import {
  getDirectionDataIndex,
  getDirectionLengthKm,
  getDirectionServiceTime,
  routeHasDirectionVariants,
} from '../utils/routeDirections'
import {
  getLoopViewLengthKm,
  resolveActiveStopGroup,
  routeHasLoopDirectionLayout,
} from '../utils/routeLoopView'
import { getOptionalText } from '../i18n/displayText'
import { getRouteStopAudioAtRow } from '../data/routeBroadcasts'
import type { RoutePageData } from '../types/routePageData'
import { getPageStopAudioAtRow } from '../utils/routePageDataFormat'
import { RouteDirectionControls } from './RouteDirectionControls'
import { RouteTypeTags } from './RouteTypeTags'
import { RouteEndpoints } from './RouteEndpoints'
import { BroadcastAudioButton } from './BroadcastAudioButton'
import { DailyChallengeIntro } from './DailyChallengeIntro'
import { buildRouteShareUrl } from '../utils/routeNavigation'
import { RouteFavoriteButton } from './RouteFavoriteButton'
import { RouteMapViewButtons } from './RouteMapViewButtons'
import { RouteDataFeedbackDialog } from './RouteDataFeedbackDialog'
import { StopDetailPanel } from './StopDetailPanel'
import { StopNameDisplay } from './StopNameDisplay'

interface RouteDetailProps {
  route: BusRoute
  directionIndex: number
  onDirectionChange: (index: number) => void
  loopView?: boolean
  onLoopViewChange?: (loopView: boolean) => void
  onClose: () => void
  className?: string
  /** 来自 routes/{id}.html 的可编辑数据（优先于 TS 内建报站） */
  pageData?: RoutePageData | null
  /** 从每日挑战进入时显示当日简介 */
  dailyChallengeIntro?: DailyChallengeIntroContent | null
  /** 每日挑战固定方向：隐藏西行/东行切换 */
  lockDirection?: boolean
  /** 每日挑战方向摘要（替代东行/西行标签） */
  directionEndpoints?: BilingualText | null
}

export function RouteDetail({
  route,
  directionIndex,
  onDirectionChange,
  loopView = false,
  onLoopViewChange,
  onClose,
  className = '',
  pageData = null,
  dailyChallengeIntro = null,
  lockDirection = false,
  directionEndpoints = null,
}: RouteDetailProps) {
  const { locale, t } = useLocale()
  const { alert } = useAppDialog()
  const [playingStopAudioId, setPlayingStopAudioId] = useState<string | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null)
  const hasDirectionControls =
    routeHasDirectionVariants(route) || routeHasLoopDirectionLayout(route)
  const stopDataIndex = getDirectionDataIndex(route, directionIndex)
  const activeStops = resolveActiveStopGroup(route, directionIndex, loopView)
  const serviceTimeText =
    loopView && routeHasLoopDirectionLayout(route)
      ? (getOptionalText(route.serviceTime, locale) ??
        getDirectionServiceTime(route, directionIndex, locale))
      : getDirectionServiceTime(route, directionIndex, locale)
  const lengthKm =
    loopView && routeHasLoopDirectionLayout(route)
      ? getLoopViewLengthKm(route, locale)
      : getDirectionLengthKm(route, directionIndex, locale)
  const displayTypes = getRouteDisplayTypes(route, { directionIndex, loopView })

  useEffect(() => {
    setSelectedStopIndex(null)
  }, [directionIndex, loopView, route.id])

  return (
    <aside
      className={`route-detail ${className}`.trim()}
      aria-label={t('detailAria', { number: route.number })}
    >
      <div className="detail-header">
        <div className="detail-header-title">
          <span className="detail-number">{route.number}</span>
          {lengthKm && (
            <span className="route-card-km detail-header-km" key={`${route.id}-km-${directionIndex}`}>
              {lengthKm}
            </span>
          )}
          {showCircularLineBesideNumber(route) && (
            <span className="zone-tag detail-circular-mark">{t('circularLineBadge')}</span>
          )}
          {displayTypes.length > 0 && <RouteTypeTags types={displayTypes} />}
        </div>
        <div className="detail-header-actions" data-tour="route-detail-actions">
          <button
            type="button"
            className="detail-share-btn"
            aria-label={t('shareRoute')}
            title={t('shareRoute')}
            onClick={() => {
              const url = new URL(buildRouteShareUrl(route.id, directionIndex), window.location.href).href
              void navigator.clipboard.writeText(url).then(
                () => alert({ message: t('shareRouteCopied') }),
                () => alert({ message: t('shareRouteCopyManual'), detail: url }),
              )
            }}
          >
            {t('shareRoute')}
          </button>
          <RouteFavoriteButton routeId={route.id} className="route-favorite-btn--detail" />
          <button type="button" className="close-btn" data-tour="route-detail-close" onClick={onClose} aria-label={t('closeDetail')}>
            ×
          </button>
        </div>
      </div>

      {dailyChallengeIntro ? (
        <DailyChallengeIntro intro={dailyChallengeIntro} className="detail-section" />
      ) : null}

      <section className="detail-section">
        <div className="detail-section-head">
          <h3>{t('routeSection')}</h3>
          {hasDirectionControls && !lockDirection ? (
            <div data-tour="route-detail-direction">
              <RouteDirectionControls
                route={route}
                directionIndex={directionIndex}
                onDirectionChange={onDirectionChange}
                loopView={loopView}
                onLoopViewChange={onLoopViewChange ?? (() => {})}
              />
            </div>
          ) : null}
        </div>
        <div data-tour="route-detail-endpoints">
          <RouteEndpoints
          route={route}
          directionIndex={directionIndex}
          loopView={loopView}
          className="detail-route-summary-wrap"
          overrideText={directionEndpoints}
          layout={directionEndpoints ? 'text' : 'spine'}
          size="detail"
        />
        </div>
        <RouteMapViewButtons
          routeId={route.id}
          routeNumber={route.number}
          directionIndex={directionIndex}
        />
      </section>

      <section className="detail-section detail-grid" data-tour="route-detail-info">
        {route.operators.length > 0 && (
          <div>
            <h4>{t('operator')}</h4>
            <ul>
              {route.operators.map((op) => (
                <li key={op}>{op}</li>
              ))}
            </ul>
          </div>
        )}
        {serviceTimeText && (
          <div>
            <h4>{t('serviceTime')}</h4>
            <p>{serviceTimeText}</p>
          </div>
        )}
        {route.interval && (
          <div>
            <h4>{t('interval')}</h4>
            <p>{getPrimaryText(route.interval, locale)}</p>
          </div>
        )}
        {route.journeyTime && (
          <div>
            <h4>{t('journeyTime')}</h4>
            <p>{getPrimaryText(route.journeyTime, locale)}</p>
          </div>
        )}
        {route.fare && (
          <div>
            <h4>{t('fare')}</h4>
            <p className="route-detail-fare">
              {typeof route.fare === 'string'
                ? route.fare
                : getPrimaryText(route.fare, locale)}
            </p>
          </div>
        )}
        {(route.levelRequired != null || route.sunshardsRequired != null) && (
          <div>
            <h4>{t('unlockRequirements')}</h4>
            {route.levelRequired != null && (
              <p>{t('unlockLevelLine', { n: route.levelRequired })}</p>
            )}
            {route.sunshardsRequired != null && (
              <p>{t('unlockSunshardsLine', { n: route.sunshardsRequired })}</p>
            )}
          </div>
        )}
        {lengthKm && (
          <div>
            <h4>{t('routeLength')}</h4>
            <p>{lengthKm}</p>
          </div>
        )}
      </section>

      {activeStops && (
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
              {activeStops.list.map((stop, i) => {
                const stopAudio =
                  loopView && routeHasLoopDirectionLayout(route)
                    ? null
                    : (getPageStopAudioAtRow(pageData, stopDataIndex, i) ??
                      getRouteStopAudioAtRow(route.id, i, stopDataIndex, activeStops.list.length))
                const audioId = `${route.id}-at-${i}`
                const nextName = stopAudio
                  ? getPrimaryText(stopAudio.nextStopLabel, locale)
                  : ''

                return (
                  <li
                    key={`${stop.name.en}-${i}`}
                    className={`stop-table-row${selectedStopIndex === i ? ' stop-table-row--selected' : ''}`.trim()}
                    role="row"
                  >
                    <span className="stop-index stop-table-num">{i + 1}</span>
                    <button
                      type="button"
                      className="stop-table-name-btn"
                      aria-expanded={selectedStopIndex === i}
                      aria-label={t('stopDetailOpenAria', { stop: getPrimaryText(stop.name, locale) })}
                      onClick={() => setSelectedStopIndex((current) => (current === i ? null : i))}
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
            {selectedStopIndex != null && activeStops.list[selectedStopIndex] ? (
              <StopDetailPanel
                stop={activeStops.list[selectedStopIndex]!}
                seq={selectedStopIndex + 1}
                currentRouteId={route.id}
                className="stop-detail-panel--inline"
                onClose={() => setSelectedStopIndex(null)}
              />
            ) : null}
          </div>
        </section>
      )}

      {route.eventTitle ? (
        <section className="detail-section detail-event">
          <h3>{getPrimaryText(route.eventTitle, locale)}</h3>
          {route.eventAbout ? (
            <>
              <h4>{t('routeEventAbout')}</h4>
              <p>{getPrimaryText(route.eventAbout, locale)}</p>
            </>
          ) : null}
        </section>
      ) : null}

      {route.notes && (
        <section className="detail-section detail-notes">
          <p>{getPrimaryText(route.notes, locale)}</p>
        </section>
      )}

      <div className="detail-links">
        <button type="button" className="detail-feedback-btn" onClick={() => setFeedbackOpen(true)}>
          {t('feedbackOpen')}
        </button>
        {route.externalUrl && (
          <a href={route.externalUrl} target="_blank" rel="noreferrer">
            {t('linkCommunity')}
          </a>
        )}
        {route.wikiUrl && (
          <a href={route.wikiUrl} target="_blank" rel="noreferrer">
            {t('linkWiki')}
          </a>
        )}
      </div>

      <RouteDataFeedbackDialog
        open={feedbackOpen}
        routeId={route.id}
        onClose={() => setFeedbackOpen(false)}
      />
    </aside>
  )
}
