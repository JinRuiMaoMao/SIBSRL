import type { BusRoute } from '../types/route'
import { routeHasDirectionVariants } from '../utils/routeDirections'
import { routeHasLoopDirectionLayout } from '../utils/routeLoopView'
import { DirectionToggle } from './DirectionToggle'
import { LoopViewToggle } from './LoopViewToggle'

interface RouteDirectionControlsProps {
  route: BusRoute
  directionIndex: number
  onDirectionChange: (index: number) => void
  loopView: boolean
  onLoopViewChange: (loopView: boolean) => void
  compact?: boolean
  className?: string
}

export function RouteDirectionControls({
  route,
  directionIndex,
  onDirectionChange,
  loopView,
  onLoopViewChange,
  compact = false,
  className = '',
}: RouteDirectionControlsProps) {
  const hasDirections = routeHasDirectionVariants(route)
  const hasLoopLayout = routeHasLoopDirectionLayout(route)

  if (!hasDirections && !hasLoopLayout) return null

  return (
    <div
      className={`route-direction-controls ${compact ? 'route-direction-controls--compact' : ''} ${className}`.trim()}
    >
      {hasDirections && !loopView ? (
        <DirectionToggle
          route={route}
          value={directionIndex}
          onChange={onDirectionChange}
          compact={compact}
        />
      ) : null}
      {hasLoopLayout ? (
        <LoopViewToggle value={loopView} onChange={onLoopViewChange} compact={compact} />
      ) : null}
    </div>
  )
}
