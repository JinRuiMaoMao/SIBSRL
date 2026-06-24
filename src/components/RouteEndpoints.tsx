import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import type { BilingualText, BusRoute } from '../types/route'
import {
  formatDirectionEndpoints,
  routeHasDirectionVariants,
} from '../utils/routeDirections'
import { formatLoopViewEndpoints, resolveActiveStopGroup, routeHasLoopDirectionLayout } from '../utils/routeLoopView'
import { formatRouteEndpoints } from '../utils/routeDisplay'
import { resolveStopDisplay } from '../utils/stopTurningPoint'
import { RouteStopSpine, type RouteStopSpineSize } from './RouteStopSpine'
import { TextWithTurningPointMarkers } from './TextWithTurningPointMarkers'

interface RouteEndpointsProps {
  route: BusRoute
  directionIndex?: number
  loopView?: boolean
  className?: string
  overrideText?: BilingualText | null
  layout?: 'spine' | 'text'
  size?: RouteStopSpineSize
}

export function RouteEndpoints({
  route,
  directionIndex = 0,
  loopView = false,
  className = '',
  overrideText = null,
  layout = 'spine',
  size = 'compact',
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

  if (overrideText || layout === 'text') {
    return (
      <div className={`route-endpoints-wrap ${className}`.trim()}>
        <p className="route-endpoints">
          <TextWithTurningPointMarkers text={text} />
        </p>
      </div>
    )
  }

  const stopGroup = resolveActiveStopGroup(route, directionIndex, loopView)
  if (stopGroup?.list.length) {
    const originStop = resolveStopDisplay(stopGroup.list[0]!)
    const destinationStop = resolveStopDisplay(stopGroup.list[stopGroup.list.length - 1]!)

    return (
      <div className={`route-endpoints-wrap ${className}`.trim()}>
        <RouteStopSpine
          originStop={originStop}
          destinationStop={destinationStop}
          stopCount={stopGroup.list.length}
          size={size}
        />
      </div>
    )
  }

  return (
    <div className={`route-endpoints-wrap ${className}`.trim()}>
      <p className="route-endpoints">
        <TextWithTurningPointMarkers text={text} />
      </p>
    </div>
  )
}
