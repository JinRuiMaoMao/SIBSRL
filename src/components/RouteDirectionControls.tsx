import type { BusRoute } from '../types/route'
import { routeHasDirectionVariants } from '../utils/routeDirections'
import { routeHasLoopDirectionLayout } from '../utils/routeLoopView'
import { DirectionToggle } from './DirectionToggle'
import { LoopDirectionViewToggle } from './LoopDirectionViewToggle'

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

  if (hasLoopLayout) {
    return (
      <LoopDirectionViewToggle
        route={route}
        directionIndex={directionIndex}
        loopView={loopView}
        onDirectionChange={onDirectionChange}
        onLoopViewChange={onLoopViewChange}
        compact={compact}
        className={className}
      />
    )
  }

  return (
    <div
      className={`route-direction-controls ${compact ? 'route-direction-controls--compact' : ''} ${className}`.trim()}
    >
      <DirectionToggle
        route={route}
        value={directionIndex}
        onChange={onDirectionChange}
        compact={compact}
      />
    </div>
  )
}
