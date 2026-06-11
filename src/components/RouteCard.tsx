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
import { getRoutePageHref } from '../utils/routeNavigation'
import { DirectionToggle } from './DirectionToggle'
import { RouteEndpoints } from './RouteEndpoints'
import { RouteTypeTags } from './RouteTypeTags'

interface RouteCardProps {
  route: BusRoute
  selected: boolean
  directionIndex: number
  onDirectionChange: (index: number) => void
  onNavigate?: (routeId: string) => void
  href?: string
}

export function RouteCard({
  route,
  selected,
  directionIndex,
  onDirectionChange,
  onNavigate,
  href,
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
    <a
      href={href ?? getRoutePageHref(route.id)}
      data-route-id={route.id}
      className={`route-card-link ${selected ? 'route-card-link--selected' : ''}`}
      aria-current={selected ? 'page' : undefined}
      onClick={(event) => {
        if (!onNavigate) return
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
        if (event.button !== 0) return
        event.preventDefault()
        onNavigate(route.id)
      }}
    >
      <article className="route-card">
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
      </article>
    </a>
  )
}
