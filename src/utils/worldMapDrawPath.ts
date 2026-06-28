import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { VirtualNodePathConstraint } from './generalMapRoadSnap'
import {
  orderedVirtualNodesForRoute,
  pickNextRoutePathTarget,
  type RoutePathTarget,
} from './worldMapVirtualNodes'
import type { WorldMapVirtualNode } from '../types/worldMapDraw'

export function mergePathPoints(
  current: WorldMapPoint[],
  segment: readonly WorldMapPoint[],
): WorldMapPoint[] {
  const merged = [...current]
  for (const next of segment) {
    const prev = merged[merged.length - 1]
    if (!prev || Math.hypot(prev[0] - next[0], prev[1] - next[1]) > 0.00005) {
      merged.push(next)
    }
  }
  return merged
}

export type TraceSegmentFn = (
  from: WorldMapPoint,
  to: WorldMapPoint,
  via: VirtualNodePathConstraint[],
) => WorldMapPoint[]

function appendHop(
  points: WorldMapPoint[],
  cursor: WorldMapPoint,
  target: WorldMapPoint,
  via: VirtualNodePathConstraint[],
  appendSegment: TraceSegmentFn,
): { points: WorldMapPoint[]; cursor: WorldMapPoint } {
  const segment = appendSegment(cursor, target, via)
  const nextPoints = mergePathPoints(points, segment.length > 1 ? segment.slice(1) : segment)
  const nextCursor = nextPoints[nextPoints.length - 1] ?? target
  return { points: nextPoints, cursor: nextCursor }
}

/** Flatten the combined node + stop sequence for debugging or export. */
export function buildRoutePathTargetQueue(
  stops: readonly { point: WorldMapPoint }[],
  virtualNodes: readonly WorldMapVirtualNode[],
  routeId: string,
): RoutePathTarget[] {
  const orderedVNs = orderedVirtualNodesForRoute(virtualNodes, routeId)
  const queue: RoutePathTarget[] = []
  let vnIndex = 0
  let stopIndex = 1

  while (vnIndex < orderedVNs.length || stopIndex < stops.length) {
    const target = pickNextRoutePathTarget(orderedVNs, vnIndex, stops, stopIndex)
    if (!target) break
    queue.push(target)
    if (target.kind === 'virtual-node') vnIndex += 1
    else stopIndex += 1
  }

  return queue
}

/**
 * Rebuild path: each step picks the next virtual node OR the next stop in the combined
 * travel list, road-traces directly to it (ignore road junctions), then repeats.
 */
export function rebuildDraftPathFromStops(
  stops: readonly { point: WorldMapPoint }[],
  appendSegment: TraceSegmentFn,
  virtualNodes: readonly WorldMapVirtualNode[] = [],
  routeId = '',
  toConstraint: (node: WorldMapVirtualNode) => VirtualNodePathConstraint | null = () => null,
): WorldMapPoint[] {
  if (stops.length === 0) return []
  if (stops.length === 1) return [stops[0]!.point]

  const orderedVNs = orderedVirtualNodesForRoute(virtualNodes, routeId)
  let points: WorldMapPoint[] = [stops[0]!.point]
  let cursor = stops[0]!.point
  let vnIndex = 0
  let stopIndex = 1

  while (vnIndex < orderedVNs.length || stopIndex < stops.length) {
    const target = pickNextRoutePathTarget(orderedVNs, vnIndex, stops, stopIndex)
    if (!target) break

    if (target.kind === 'virtual-node') {
      const constraint = toConstraint(target.node)
      const via = constraint ? [constraint] : []
      const traced = appendHop(points, cursor, target.node.point, via, appendSegment)
      points = traced.points
      cursor = traced.cursor
      vnIndex += 1
      continue
    }

    const traced = appendHop(points, cursor, target.point, [], appendSegment)
    points = traced.points
    cursor = traced.cursor
    stopIndex += 1
  }

  return points
}
