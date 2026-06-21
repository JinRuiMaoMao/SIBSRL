import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import type { BilingualText, BusRoute } from '../types/route'
import {
  formatDirectionEndpoints,
  routeHasDirectionVariants,
} from '../utils/routeDirections'
import { formatRouteEndpoints } from '../utils/routeDisplay'

interface RouteEndpointsProps {
  route: BusRoute
  directionIndex?: number
  className?: string
  overrideText?: BilingualText | null
}

export function RouteEndpoints({
  route,
  directionIndex = 0,
  className = '',
  overrideText = null,
}: RouteEndpointsProps) {
  const { locale } = useLocale()

  const text = overrideText
    ? getPrimaryText(overrideText, locale)
    : routeHasDirectionVariants(route)
      ? formatDirectionEndpoints(route, directionIndex, locale)
      : formatRouteEndpoints(route, locale)

  return (
    <div className={`route-endpoints-wrap ${className}`.trim()}>
      <p className="route-endpoints">{text}</p>
    </div>
  )
}
