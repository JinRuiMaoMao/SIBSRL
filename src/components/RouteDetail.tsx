import { useLocale } from '../i18n/LocaleContext'
import { showCircularLineBesideNumber } from '../utils/routeCategory'
import { getPrimaryText } from '../i18n/displayText'
import { getRouteDisplayTypes } from '../utils/routeTypes'
import type { BusRoute } from '../types/route'
import {
  getDirectionDataIndex,
  getDirectionEndpointNames,
  getDirectionLengthKm,
  getDirectionServiceTime,
  getDirectionShortLabel,
  routeHasDirectionVariants,
} from '../utils/routeDirections'
import { DirectionToggle } from './DirectionToggle'
import { RouteTypeTags } from './RouteTypeTags'
import { getRouteArrow } from '../utils/routeDisplay'

interface RouteDetailProps {
  route: BusRoute
  directionIndex: number
  onDirectionChange: (index: number) => void
  onClose: () => void
}

export function RouteDetail({
  route,
  directionIndex,
  onDirectionChange,
  onClose,
}: RouteDetailProps) {
  const { locale, t } = useLocale()
  const hasDirections = routeHasDirectionVariants(route)
  const directionEndpoints = hasDirections
    ? getDirectionEndpointNames(route, directionIndex, locale)
    : null
  const activeStops = route.stops?.[getDirectionDataIndex(route, directionIndex)]
  const serviceTimeText = getDirectionServiceTime(route, directionIndex, locale)
  const lengthKm =
    getDirectionLengthKm(route, directionIndex, locale) ??
    (route.length ? getPrimaryText(route.length, locale) : null)
  const displayTypes = getRouteDisplayTypes(route)

  return (
    <aside className="route-detail" aria-label={t('detailAria', { number: route.number })}>
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
        <p className="detail-route-line detail-route-bilingual">
          <strong>
            {directionEndpoints?.origin ?? getPrimaryText(route.origin, locale)}
          </strong>
          <span className="detail-arrow" aria-hidden="true">
            {hasDirections ? '→' : getRouteArrow(route.pattern)}
          </span>
          <strong>
            {directionEndpoints?.destination ??
              getPrimaryText(route.destination, locale)}
          </strong>
        </p>
        {route.via && (
          <p className="detail-via">
            {t('viaPrefix')}
            {getPrimaryText(route.via, locale)}
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
        {route.levelRequired != null && (
          <div>
            <h4>{t('levelRequired')}</h4>
            <p>Lv. {route.levelRequired}</p>
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
          <ol className="stop-list">
            {activeStops.list.map((stop, i) => {
              const name = getPrimaryText(stop.name, locale)
              return (
                <li key={`${stop.name.en}-${i}`}>
                  <span className="stop-index">{i + 1}</span>
                  <span className="stop-name">
                    <span className="stop-name-zh">{name}</span>
                    {stop.zone != null && <span className="zone-tag">Z{stop.zone}</span>}
                  </span>
                </li>
              )
            })}
          </ol>
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
