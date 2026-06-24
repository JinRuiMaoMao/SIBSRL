import type { MouseEvent } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import type { SeasonalAvailabilityWindow } from '../data/seasonalRouteAvailability'
import type { BusRoute } from '../types/route'
import {
  getDirectionDataIndex,
  getDirectionLengthKm,
} from '../utils/routeDirections'
import { formatRouteOperators } from '../utils/routeDisplay'
import { getRoutePageHref } from '../utils/routeNavigation'
import { getRouteDisplayTypes } from '../utils/routeTypes'
import { resolveStopDisplay } from '../utils/stopTurningPoint'
import { useSeasonalAvailabilityCountdown } from '../hooks/useSeasonalAvailabilityCountdown'
import { RouteFavoriteButton } from './RouteFavoriteButton'
import { RouteStopSpine } from './RouteStopSpine'
import { RouteTypeTags } from './RouteTypeTags'

interface SeasonalPromotedRouteCardProps {
  route: BusRoute
  displayNumber?: string
  directionIndex: number
  window: SeasonalAvailabilityWindow
  selected: boolean
  href?: string
  onNavigate?: (routeId: string) => void
}

export function SeasonalPromotedRouteCard({
  route,
  displayNumber,
  directionIndex,
  window,
  selected,
  href,
  onNavigate,
}: SeasonalPromotedRouteCardProps) {
  const { locale, t } = useLocale()
  const cardNumber = displayNumber ?? route.number
  const lengthKm = getDirectionLengthKm(route, directionIndex, locale)
  const displayTypes = getRouteDisplayTypes(route)
  const operatorsLabel = formatRouteOperators(route)
  const countdown = useSeasonalAvailabilityCountdown(window)
  const stopDataIndex = getDirectionDataIndex(route, directionIndex)
  const stopGroup = route.stops?.[stopDataIndex]
  const stopCount = stopGroup?.list.length ?? 0
  const originStop = stopGroup?.list[0] ? resolveStopDisplay(stopGroup.list[0]) : null
  const destinationStop = stopGroup?.list.length
    ? resolveStopDisplay(stopGroup.list[stopGroup.list.length - 1]!)
    : null
  const eventTitle = route.eventTitle ? getPrimaryText(route.eventTitle, locale) : null
  const cardHref = href ?? getRoutePageHref(route.id)

  const handleCardClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return
    if (event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onNavigate(route.id)
  }

  return (
    <a
      href={cardHref}
      data-route-id={route.id}
      className={`route-card-link route-card-link--seasonal-promoted ${selected ? 'route-card-link--selected' : ''}`.trim()}
      aria-current={selected ? 'page' : undefined}
      onClick={handleCardClick}
    >
      <article className="route-card seasonal-promoted-card">
        {lengthKm ? (
          <span className="route-card-km route-card-km--corner" key={`${route.id}-km-${directionIndex}`}>
            {lengthKm}
          </span>
        ) : null}
        <p className="seasonal-promoted-card-category">{t('routeGroupSeasonal')}</p>

        <div className="seasonal-promoted-card-event-row">
          {eventTitle ? (
            <span className="seasonal-promoted-card-event">{eventTitle}</span>
          ) : (
            <span className="seasonal-promoted-card-event">{cardNumber}</span>
          )}
          <span
            className="seasonal-promoted-card-countdown"
            aria-label={t('seasonalPromotedCountdownAria', { time: countdown })}
          >
            <span className="seasonal-promoted-card-countdown-icon" aria-hidden="true">
              ⏳
            </span>
            {countdown}
          </span>
        </div>

        <div className="seasonal-promoted-card-route-row">
          <div className="seasonal-promoted-card-route-id">
            <span className="seasonal-promoted-card-bus" aria-hidden="true">
              🚌
            </span>
            <span className="route-number seasonal-promoted-card-number">{cardNumber}</span>
          </div>
        </div>

        {originStop && destinationStop && stopCount > 0 ? (
          <div className="route-card-endpoints-row">
            <RouteStopSpine
              originStop={originStop}
              destinationStop={destinationStop}
              stopCount={stopCount}
              size="promoted"
              className="seasonal-promoted-card-stops"
            />
            <div className="route-card-favorite-slot">
              <RouteFavoriteButton routeId={route.id} />
            </div>
          </div>
        ) : (
          <div className="route-card-endpoints-row route-card-endpoints-row--favorite-only">
            <div className="route-card-favorite-slot">
              <RouteFavoriteButton routeId={route.id} />
            </div>
          </div>
        )}

        <div className="route-card-bottom seasonal-promoted-card-bottom">
          <div className="route-card-meta-left">
            {displayTypes.length > 0 ? <RouteTypeTags types={displayTypes} compact /> : null}
          </div>
          {operatorsLabel ? (
            <div className="route-card-foot">
              <span className="route-card-operators">{operatorsLabel}</span>
            </div>
          ) : null}
        </div>
      </article>
    </a>
  )
}
