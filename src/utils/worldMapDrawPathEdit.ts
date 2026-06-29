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

export interface PathLegRange {
  start: number
  end: number
}

/** Each manual click-to-connect hop is one leg; defaults to a single leg for the whole path. */
export function getPathLegRanges(
  legStarts: readonly number[],
  pointCount: number,
): PathLegRange[] {
  if (pointCount < 2) return []
  const starts = legStarts.length > 0 ? [...legStarts].sort((a, b) => a - b) : [0]
  if (starts[0] !== 0) starts.unshift(0)
  const unique = starts.filter((value, index) => index === 0 || value > starts[index - 1]!)
  return unique
    .map((start, index) => ({
      start,
      end: Math.min((unique[index + 1] ?? pointCount) - 1, pointCount - 1),
    }))
    .filter((leg) => leg.end > leg.start || (leg.end === leg.start && leg.start === pointCount - 1))
}

export function translatePathLeg(
  points: readonly WorldMapPoint[],
  legStart: number,
  legEnd: number,
  delta: WorldMapPoint,
): WorldMapPoint[] {
  return points.map((point, index) => {
    if (index >= legStart && index <= legEnd) {
      return clampPathPoint([point[0] + delta[0], point[1] + delta[1]])
    }
    return [point[0], point[1]] as WorldMapPoint
  })
}

/** Collapse a leg's interior road points into a straight line between its endpoints. */
export function straightenPathLeg(
  points: readonly WorldMapPoint[],
  legStart: number,
  legEnd: number,
): WorldMapPoint[] | null {
  if (legEnd <= legStart) return null
  const next: WorldMapPoint[] = []
  for (let index = 0; index < legStart; index += 1) {
    next.push([points[index]![0], points[index]![1]])
  }
  next.push([points[legStart]![0], points[legStart]![1]])
  next.push([points[legEnd]![0], points[legEnd]![1]])
  for (let index = legEnd + 1; index < points.length; index += 1) {
    next.push([points[index]![0], points[index]![1]])
  }
  return next
}

export function resizeLegHidden(hidden: readonly boolean[], legCount: number): boolean[] {
  if (legCount <= 0) return []
  if (hidden.length === legCount) return [...hidden]
  if (hidden.length < legCount) {
    return [...hidden, ...Array.from({ length: legCount - hidden.length }, () => false)]
  }
  return hidden.slice(0, legCount)
}

/** Hide a leg connection without removing its endpoint anchors. */
export function hidePathLeg(hidden: readonly boolean[], legIndex: number): boolean[] {
  const next = resizeLegHidden(hidden, legIndex + 1)
  next[legIndex] = true
  return next
}
