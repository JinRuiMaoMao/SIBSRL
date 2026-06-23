import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import type { SeasonalAvailabilityWindow } from '../data/seasonalRouteAvailability'
import type { BusRoute } from '../types/route'
import {
  getDirectionDataIndex,
  getDirectionEndpointNames,
  getDirectionLengthKm,
} from '../utils/routeDirections'
import { formatRouteOperators } from '../utils/routeDisplay'
import { getRoutePageHref } from '../utils/routeNavigation'
import { getRouteDisplayTypes } from '../utils/routeTypes'
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
}

export function SeasonalPromotedRouteCard({
  route,
  displayNumber,
  directionIndex,
  window,
  selected,
  href,
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
  const endpoints = getDirectionEndpointNames(route, directionIndex, locale)
  const eventTitle = route.eventTitle ? getPrimaryText(route.eventTitle, locale) : null

  return (
    <a
      href={href ?? getRoutePageHref(route.id)}
      data-route-id={route.id}
      className={`route-card-link route-card-link--seasonal-promoted ${selected ? 'route-card-link--selected' : ''}`.trim()}
      aria-current={selected ? 'page' : undefined}
    >
      <article className="route-card seasonal-promoted-card">
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
          <div className="seasonal-promoted-card-route-end">
            {lengthKm ? (
              <span className="route-card-km" key={`${route.id}-km-${directionIndex}`}>
                {lengthKm}
              </span>
            ) : null}
            <RouteFavoriteButton routeId={route.id} />
          </div>
        </div>

        {endpoints && stopCount > 0 ? (
          <RouteStopSpine
            origin={endpoints.origin}
            destination={endpoints.destination}
            stopCount={stopCount}
            size="promoted"
            className="seasonal-promoted-card-stops"
          />
        ) : null}

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
