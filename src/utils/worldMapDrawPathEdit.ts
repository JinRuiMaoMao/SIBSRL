import type { WorldMapPoint } from '../data/worldMapRoutes'

export function clampPathPoint(point: WorldMapPoint): WorldMapPoint {
  return [Math.min(1, Math.max(0, point[0])), Math.min(1, Math.max(0, point[1]))]
}

export function translatePathSegment(
  points: readonly WorldMapPoint[],
  segmentIndex: number,
  delta: WorldMapPoint,
): WorldMapPoint[] {
  if (segmentIndex < 0 || segmentIndex >= points.length - 1) return [...points]
  return points.map((point, index) => {
    if (index === segmentIndex || index === segmentIndex + 1) {
      return clampPathPoint([point[0] + delta[0], point[1] + delta[1]])
    }
    return [point[0], point[1]] as WorldMapPoint
  })
}

export function movePathVertex(
  points: readonly WorldMapPoint[],
  vertexIndex: number,
  next: WorldMapPoint,
): WorldMapPoint[] {
  if (vertexIndex < 0 || vertexIndex >= points.length) return [...points]
  return points.map((point, index) =>
    index === vertexIndex ? clampPathPoint(next) : ([point[0], point[1]] as WorldMapPoint),
  )
}

export function deletePathSegment(
  points: readonly WorldMapPoint[],
  segmentIndex: number,
): WorldMapPoint[] | null {
  if (points.length <= 2) return null
  if (segmentIndex < 0 || segmentIndex >= points.length - 1) return null
  const removeIndex = segmentIndex + 1
  return points.filter((_, index) => index !== removeIndex)
}

export function syncPathEndpointsToStops(
  points: readonly WorldMapPoint[],
  stops: readonly { point: WorldMapPoint }[],
): WorldMapPoint[] {
  if (points.length < 2 || stops.length < 2) return [...points]
  const next = points.map((point) => [point[0], point[1]] as WorldMapPoint)
  next[0] = [stops[0]!.point[0], stops[0]!.point[1]]
  next[next.length - 1] = [
    stops[stops.length - 1]!.point[0],
    stops[stops.length - 1]!.point[1],
  ]
  return next
}
