import { useState } from 'react'
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
import { getDirectionIntermediateStops, getDirectionVia } from '../utils/routeVia'
import { getRouteStopAudioAtRow } from '../data/routeBroadcasts'
import type { RoutePageData } from '../types/routePageData'
import { getPageStopAudioAtRow } from '../utils/routePageDataFormat'
import { DirectionToggle } from './DirectionToggle'
import { RouteTypeTags } from './RouteTypeTags'
import { RouteEndpoints } from './RouteEndpoints'
import { BroadcastAudioButton } from './BroadcastAudioButton'
import { DailyChallengeIntro } from './DailyChallengeIntro'
import { buildRouteShareUrl } from '../utils/routeNavigation'
import { RouteFavoriteButton } from './RouteFavoriteButton'

interface RouteDetailProps {
  route: BusRoute
  directionIndex: number
  onDirectionChange: (index: number) => void
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
  onClose,
  className = '',
  pageData = null,
  dailyChallengeIntro = null,
  lockDirection = false,
  directionEndpoints = null,
}: RouteDetailProps) {
  const { locale, t } = useLocale()
  const [playingStopAudioId, setPlayingStopAudioId] = useState<string | null>(null)
  const hasDirections = routeHasDirectionVariants(route)
  const stopDataIndex = getDirectionDataIndex(route, directionIndex)
  const activeStops = route.stops?.[stopDataIndex]
  const viaStops = getDirectionIntermediateStops(route, stopDataIndex, locale)
  const viaText = viaStops.length > 0 ? null : getDirectionVia(route, stopDataIndex)
  const serviceTimeText = getDirectionServiceTime(route, directionIndex, locale)
  const lengthKm = getDirectionLengthKm(route, directionIndex, locale)
  const displayTypes = getRouteDisplayTypes(route)

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
        <div className="detail-header-actions">
          <button
            type="button"
            className="detail-share-btn"
            aria-label={t('shareRoute')}
            title={t('shareRoute')}
            onClick={() => {
              const url = new URL(buildRouteShareUrl(route.id, directionIndex), window.location.href).href
              void navigator.clipboard.writeText(url).catch(() => {
                window.prompt(t('shareRoute'), url)
              })
            }}
          >
            {t('shareRoute')}
          </button>
          <RouteFavoriteButton routeId={route.id} className="route-favorite-btn--detail" />
          <button type="button" className="close-btn" onClick={onClose} aria-label={t('closeDetail')}>
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
          {hasDirections && !lockDirection && (
            <DirectionToggle
              route={route}
              value={directionIndex}
              onChange={onDirectionChange}
            />
          )}
        </div>
        <RouteEndpoints
          route={route}
          directionIndex={directionIndex}
          className="detail-route-summary-wrap"
        />
        {viaStops.length > 0 && (
          <div className="detail-via-stops">
            <h4>{t('viaStopsSection')}</h4>
            <p className="detail-via-stops-list">{viaStops.join('、')}</p>
          </div>
        )}
        {viaText && (
          <p className="detail-via">
            {t('viaPrefix')}
            {getPrimaryText(viaText, locale)}
          </p>
        )}
      </section>

      <section className="detail-section detail-grid">
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
        <section className="detail-section">
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
                const name = getPrimaryText(stop.name, locale)
                const stopAudio =
                  getPageStopAudioAtRow(pageData, stopDataIndex, i) ??
                  getRouteStopAudioAtRow(route.id, i)
                const audioId = `${route.id}-at-${i}`
                const nextName = stopAudio
                  ? getPrimaryText(stopAudio.nextStopLabel, locale)
                  : ''

                return (
                  <li key={`${stop.name.en}-${i}`} className="stop-table-row" role="row">
                    <span className="stop-index stop-table-num">{i + 1}</span>
                    <span className="stop-table-name stop-name">
                      <span className="stop-name-zh">{name}</span>
                    </span>
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
          </div>
        </section>
      )}

      {route.notes && (
        <section className="detail-section detail-notes">
          <p>{getPrimaryText(route.notes, locale)}</p>
        </section>
      )}

      <div className="detail-links">
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
    </aside>
  )
}
