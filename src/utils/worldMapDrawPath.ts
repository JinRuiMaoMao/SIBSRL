import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { VirtualNodePathConstraint } from './generalMapRoadSnap'
import { orderedVirtualNodesForRoute, shouldVisitVirtualNodeBeforeStop } from './worldMapVirtualNodes'
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

function appendWithVirtualConstraints(
  points: WorldMapPoint[],
  cursor: WorldMapPoint,
  target: WorldMapPoint,
  constraints: VirtualNodePathConstraint[],
  appendSegment: TraceSegmentFn,
): { points: WorldMapPoint[]; cursor: WorldMapPoint } {
  const segment = appendSegment(cursor, target, constraints)
  const nextPoints = mergePathPoints(points, segment.length > 1 ? segment.slice(1) : segment)
  const nextCursor = nextPoints[nextPoints.length - 1] ?? target
  return { points: nextPoints, cursor: nextCursor }
}

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

  for (let stopIndex = 1; stopIndex < stops.length; stopIndex += 1) {
    const nextStop = stops[stopIndex]!.point

    while (vnIndex < orderedVNs.length) {
      const node = orderedVNs[vnIndex]!
      if (!shouldVisitVirtualNodeBeforeStop(node, cursor, nextStop)) break

      const constraint = toConstraint(node)
      const constraints = constraint ? [constraint] : []
      const traced = appendWithVirtualConstraints(points, cursor, node.point, constraints, appendSegment)
      points = traced.points
      cursor = traced.cursor
      vnIndex += 1
    }

    const traced = appendWithVirtualConstraints(points, cursor, nextStop, [], appendSegment)
    points = traced.points
    cursor = traced.cursor
  }

  while (vnIndex < orderedVNs.length) {
    const node = orderedVNs[vnIndex]!
    const constraint = toConstraint(node)
    const constraints = constraint ? [constraint] : []
    const traced = appendWithVirtualConstraints(points, cursor, node.point, constraints, appendSegment)
    points = traced.points
    cursor = traced.cursor
    vnIndex += 1
  }

  return points
}
