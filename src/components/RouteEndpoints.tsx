import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import type { BilingualText, BusRoute } from '../types/route'
import {
  formatDirectionEndpoints,
  routeHasDirectionVariants,
} from '../utils/routeDirections'
import { formatLoopViewEndpoints, routeHasLoopDirectionLayout } from '../utils/routeLoopView'
import { formatRouteEndpoints } from '../utils/routeDisplay'

interface RouteEndpointsProps {
  route: BusRoute
  directionIndex?: number
  loopView?: boolean
  className?: string
  overrideText?: BilingualText | null
}

export function RouteEndpoints({
  route,
  directionIndex = 0,
  loopView = false,
  className = '',
  overrideText = null,
}: RouteEndpointsProps) {
  const { locale } = useLocale()

  const text = overrideText
    ? getPrimaryText(overrideText, locale)
    : loopView && routeHasLoopDirectionLayout(route)
      ? (formatLoopViewEndpoints(route, locale) ??
        formatDirectionEndpoints(route, directionIndex, locale))
      : routeHasDirectionVariants(route)
        ? formatDirectionEndpoints(route, directionIndex, locale)
        : formatRouteEndpoints(route, locale)

  return (
    <div className={`route-endpoints-wrap ${className}`.trim()}>
      <p className="route-endpoints">{text}</p>
    </div>
  )
}
