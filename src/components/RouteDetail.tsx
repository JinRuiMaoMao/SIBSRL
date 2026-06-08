import { useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import { showCircularLineBesideNumber } from '../utils/routeCategory'
import { getPrimaryText } from '../i18n/displayText'
import { getRouteDisplayTypes } from '../utils/routeTypes'
import type { BusRoute } from '../types/route'
import {
  getDirectionDataIndex,
  getDirectionLengthKm,
  getDirectionServiceTime,
  getDirectionShortLabel,
  routeHasDirectionVariants,
} from '../utils/routeDirections'
import { getDirectionIntermediateStops, getDirectionVia } from '../utils/routeVia'
import { getRouteStopAudioAtRow } from '../data/routeBroadcasts'
import { DirectionToggle } from './DirectionToggle'
import { RouteTypeTags } from './RouteTypeTags'
import { RouteEndpoints } from './RouteEndpoints'
import { BroadcastAudioButton } from './BroadcastAudioButton'

interface RouteDetailProps {
  route: BusRoute
  directionIndex: number
  onDirectionChange: (index: number) => void
  onClose: () => void
  className?: string
}

export function RouteDetail({
  route,
  directionIndex,
  onDirectionChange,
  onClose,
  className = '',
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
        <button type="button" className="close-btn" onClick={onClose} aria-label={t('closeDetail')}>
          ×
        </button>
      </div>

      <section className="detail-section">
        <div className="detail-section-head">
          <h3>{t('routeSection')}</h3>
          {hasDirections && (
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
            <p>{route.fare}</p>
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
          <h3>
            {t('stopsSection')} ·{' '}
            {getDirectionShortLabel(route, directionIndex, t, locale)}
          </h3>
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
                const stopAudio = getRouteStopAudioAtRow(route.id, i)
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
