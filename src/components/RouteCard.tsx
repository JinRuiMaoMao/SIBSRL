import { useLocale } from '../i18n/LocaleContext'
import { getOptionalText } from '../i18n/displayText'
import type { BusRoute } from '../types/route'
import { showCardLoopMark } from '../utils/routeCategory'
import {
  getDirectionServiceTime,
  routeHasDirectionVariants,
} from '../utils/routeDirections'
import { getDirectionLengthKm } from '../utils/routeDirections'
import { formatRouteOperators } from '../utils/routeDisplay'
import { getRouteDisplayTypes } from '../utils/routeTypes'
import { DirectionToggle } from './DirectionToggle'
import { RouteEndpoints } from './RouteEndpoints'
import { RouteTypeTags } from './RouteTypeTags'

interface RouteCardProps {
  route: BusRoute
  selected: boolean
  directionIndex: number
  onDirectionChange: (index: number) => void
  onSelect: () => void
}

export function RouteCard({
  route,
  selected,
  directionIndex,
  onDirectionChange,
  onSelect,
}: RouteCardProps) {
  const { locale, t } = useLocale()
  const displayTypes = getRouteDisplayTypes(route)
  const lengthKm = getDirectionLengthKm(route, directionIndex, locale)
  const operatorsLabel = formatRouteOperators(route)
  const serviceTime =
    getDirectionServiceTime(route, directionIndex, locale) ??
    getOptionalText(route.serviceTime, locale)
  const hasDirections = routeHasDirectionVariants(route)

  return (
    <div
      role="button"
      tabIndex={0}
      className={`route-card ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      aria-pressed={selected}
    >
      <div className="route-card-top">
        <div className="route-card-title">
          <span className="route-number">{route.number}</span>
          {hasDirections && (
            <DirectionToggle
              route={route}
              value={directionIndex}
              onChange={onDirectionChange}
              compact
            />
          )}
        </div>
        {lengthKm && (
          <span className="route-card-km" key={`${route.id}-km-${directionIndex}`}>
            {lengthKm}
          </span>
        )}
      </div>

      <RouteEndpoints route={route} directionIndex={directionIndex} />

      {serviceTime && <p className="route-meta">{serviceTime}</p>}

      <div className="route-card-bottom">
        <div className="route-card-meta-left">
          {displayTypes.length > 0 && (
            <RouteTypeTags types={displayTypes} compact />
          )}
          <div className="route-zones">
            {route.zones.map((z) => (
              <span key={z} className="zone-tag">
                Z{z}
              </span>
            ))}
            {showCardLoopMark(route) && (
              <span className="zone-tag">{t('cardLoopMark')}</span>
            )}
          </div>
        </div>

        {operatorsLabel && (
          <div className="route-card-foot">
            <span className="route-card-operators">{operatorsLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}
