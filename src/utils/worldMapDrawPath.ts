import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { VirtualNodePathConstraint } from './generalMapRoadSnap'
import { collectVirtualNodesForLeg, orderedVirtualNodesForRoute } from './worldMapVirtualNodes'
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

function buildLegViaConstraints(
  legNodes: readonly WorldMapVirtualNode[],
  toConstraint: (node: WorldMapVirtualNode) => VirtualNodePathConstraint | null,
): VirtualNodePathConstraint[] {
  const via: VirtualNodePathConstraint[] = []
  for (const node of legNodes) {
    const constraint = toConstraint(node)
    if (constraint) {
      via.push(constraint)
    }
  }
  return via
}

function appendLeg(
  points: WorldMapPoint[],
  cursor: WorldMapPoint,
  legEnd: WorldMapPoint,
  legNodes: readonly WorldMapVirtualNode[],
  appendSegment: TraceSegmentFn,
  toConstraint: (node: WorldMapVirtualNode) => VirtualNodePathConstraint | null,
): { points: WorldMapPoint[]; cursor: WorldMapPoint } {
  const via = buildLegViaConstraints(legNodes, toConstraint)
  const segment = appendSegment(cursor, legEnd, via)
  const nextPoints = mergePathPoints(points, segment.length > 1 ? segment.slice(1) : segment)
  const nextCursor = nextPoints[nextPoints.length - 1] ?? legEnd
  return { points: nextPoints, cursor: nextCursor }
}

/**
 * Rebuild path: for each leg between consecutive route-detail stops, trace along roads
 * through that leg's virtual nodes (global order) in one chained road trace, then to the stop.
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

  for (let stopIndex = 1; stopIndex < stops.length; stopIndex += 1) {
    const legEnd = stops[stopIndex]!.point
    const nextLegEnd = stops[stopIndex + 1]?.point

    const { nodes: legNodes, nextIndex } = collectVirtualNodesForLeg(
      orderedVNs,
      vnIndex,
      legEnd,
      nextLegEnd,
    )
    vnIndex = nextIndex

    const traced = appendLeg(points, cursor, legEnd, legNodes, appendSegment, toConstraint)
    points = traced.points
    cursor = traced.cursor
  }

  return points
}
