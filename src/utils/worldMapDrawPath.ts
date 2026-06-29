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

export function resolveTraceAnchorPoint(
  anchor: { kind: 'stop' | 'virtual-node'; id: string },
  stops: readonly { id: string; point: WorldMapPoint }[],
  virtualNodes: readonly WorldMapVirtualNode[],
): WorldMapPoint | null {
  if (anchor.kind === 'stop') {
    return stops.find((stop) => stop.id === anchor.id)?.point ?? null
  }
  return virtualNodes.find((node) => node.id === anchor.id)?.point ?? null
}

export function traceViaForAnchorTarget(
  anchor: { kind: 'stop' | 'virtual-node'; id: string },
  virtualNodes: readonly WorldMapVirtualNode[],
  toConstraint: (node: WorldMapVirtualNode) => VirtualNodePathConstraint | null,
): VirtualNodePathConstraint[] {
  if (anchor.kind !== 'virtual-node') return []
  const node = virtualNodes.find((entry) => entry.id === anchor.id)
  if (!node) return []
  const constraint = toConstraint(node)
  return constraint ? [constraint] : []
}

/** Straight polyline through stops only (one segment per consecutive stop pair). */
export function rebuildStopToStopPath(stops: readonly { point: WorldMapPoint }[]): WorldMapPoint[] {
  return stops.map((stop) => [stop.point[0], stop.point[1]] as WorldMapPoint)
}

export function buildStopLegStarts(stopCount: number): number[] {
  if (stopCount < 2) return stopCount > 0 ? [0] : []
  return Array.from({ length: stopCount - 1 }, (_, index) => index)
}

/** One leg per consecutive stop when leg boundaries are explicit; otherwise keep [0] as a single leg. */
export function resolveEffectiveLegStarts(
  legStarts: readonly number[],
  pointCount: number,
  _stopCount: number,
): number[] {
  let normalized = legStarts.length > 0 ? [...legStarts] : [0]
  if (normalized[0] !== 0) normalized.unshift(0)
  if (normalized.length > 1) return normalized
  if (pointCount >= 2) return [0]
  return normalized
}

export type TraceSegmentFn = (
  from: WorldMapPoint,
  to: WorldMapPoint,
  via: VirtualNodePathConstraint[],
) => WorldMapPoint[]

/** One straight segment between two anchors (no road densification). */
export const straightTraceSegment: TraceSegmentFn = (from, to) => [from, to]

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
 * Rebuild path: each hop is a single straight line to the next virtual node or stop.
 */
export function rebuildDraftPathFromStops(
  stops: readonly { point: WorldMapPoint }[],
  appendSegment: TraceSegmentFn = straightTraceSegment,
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
