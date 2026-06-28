import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { VirtualNodePathConstraint } from './generalMapRoadSnap'
import { virtualNodesOnLeg } from './worldMapVirtualNodes'
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

export function rebuildDraftPathFromStops(
  stops: readonly { point: WorldMapPoint }[],
  appendSegment: TraceSegmentFn,
  virtualNodes: readonly WorldMapVirtualNode[] = [],
  routeId = '',
  toConstraint: (node: WorldMapVirtualNode) => VirtualNodePathConstraint | null = () => null,
): WorldMapPoint[] {
  if (stops.length === 0) return []
  if (stops.length === 1) return [stops[0]!.point]

  let points: WorldMapPoint[] = [stops[0]!.point]
  for (let index = 1; index < stops.length; index += 1) {
    const from = stops[index - 1]!.point
    const to = stops[index]!.point
    const legNodes = virtualNodesOnLeg(from, to, virtualNodes, routeId)
    const anchors: WorldMapPoint[] = [from, ...legNodes.map((node) => node.point), to]

    let legPoints: WorldMapPoint[] = [anchors[0]!]
    for (let leg = 1; leg < anchors.length; leg += 1) {
      const viaNode = legNodes[leg - 1]
      const via =
        viaNode && leg < anchors.length - 1
          ? (() => {
              const constraint = toConstraint(viaNode)
              return constraint ? [constraint] : []
            })()
          : []
      const segment = appendSegment(anchors[leg - 1]!, anchors[leg]!, via)
      legPoints = mergePathPoints(legPoints, segment)
    }

    if (legPoints.length > 1) {
      points = mergePathPoints(points, legPoints.slice(1))
    }
  }
  return points
}
