import { useLocale } from '../i18n/LocaleContext'
import type { BusRoute } from '../types/route'
import {
  formatDirectionEndpoints,
  routeHasDirectionVariants,
} from '../utils/routeDirections'
import { formatRouteEndpoints } from '../utils/routeDisplay'

interface RouteEndpointsProps {
  route: BusRoute
  directionIndex?: number
  className?: string
}

export function RouteEndpoints({
  route,
  directionIndex = 0,
  className = '',
}: RouteEndpointsProps) {
  const { locale } = useLocale()

  const text = routeHasDirectionVariants(route)
    ? formatDirectionEndpoints(route, directionIndex, locale)
    : formatRouteEndpoints(route, locale)

  return (
    <div className={`route-endpoints-wrap ${className}`.trim()}>
      <p className="route-endpoints">{text}</p>
    </div>
  )
}
