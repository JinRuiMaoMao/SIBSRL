import type { WorldMapPoint } from '../data/worldMapRoutes'

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

export function rebuildDraftPathFromAnchors(
  anchors: readonly WorldMapPoint[],
  appendSegment: (from: WorldMapPoint, to: WorldMapPoint) => WorldMapPoint[],
): WorldMapPoint[] {
  if (anchors.length === 0) return []
  if (anchors.length === 1) return [anchors[0]!]

  let points: WorldMapPoint[] = [anchors[0]!]
  for (let index = 1; index < anchors.length; index += 1) {
    const segment = appendSegment(anchors[index - 1]!, anchors[index]!)
    points = mergePathPoints(points, segment)
  }
  return points
}

export function rebuildDraftPathFromStops(
  stops: readonly { point: WorldMapPoint }[],
  appendSegment: (from: WorldMapPoint, to: WorldMapPoint) => WorldMapPoint[],
): WorldMapPoint[] {
  return rebuildDraftPathFromAnchors(
    stops.map((stop) => stop.point),
    appendSegment,
  )
}
