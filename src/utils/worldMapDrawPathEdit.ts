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

/** Insert a bend vertex between points[segmentIndex] and points[segmentIndex + 1]. */
export function insertPathBendPoint(
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  segmentIndex: number,
  bend: WorldMapPoint,
): { points: WorldMapPoint[]; legStarts: number[] } {
  const insertAt = segmentIndex + 1
  const nextPoints = [
    ...points.slice(0, insertAt).map((point) => [point[0], point[1]] as WorldMapPoint),
    clampPathPoint(bend),
    ...points.slice(insertAt).map((point) => [point[0], point[1]] as WorldMapPoint),
  ]
  let nextLegStarts = legStarts.length > 0 ? [...legStarts] : [0]
  if (nextLegStarts[0] !== 0) nextLegStarts.unshift(0)
  nextLegStarts = nextLegStarts
    .map((start) => (start > segmentIndex ? start + 1 : start))
    .filter((start, index, arr) => index === 0 || start > arr[index - 1]!)
  return { points: nextPoints, legStarts: nextLegStarts }
}

export function removePathVertex(
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  vertexIndex: number,
): { points: WorldMapPoint[]; legStarts: number[] } | null {
  if (vertexIndex <= 0 || vertexIndex >= points.length - 1) return null
  const nextPoints = points
    .filter((_, index) => index !== vertexIndex)
    .map((point) => [point[0], point[1]] as WorldMapPoint)
  let nextLegStarts = legStarts.length > 0 ? [...legStarts] : [0]
  if (nextLegStarts[0] !== 0) nextLegStarts.unshift(0)
  nextLegStarts = nextLegStarts
    .map((start) => (start > vertexIndex ? start - 1 : start))
    .filter((start, index, arr) => index === 0 || start > arr[index - 1]!)
  return { points: nextPoints, legStarts: nextLegStarts }
}

export function legIndexForSegment(
  legStarts: readonly number[],
  pointCount: number,
  segmentIndex: number,
): number {
  const legs = getPathLegRanges(legStarts, pointCount)
  return legs.findIndex((leg) => segmentIndex >= leg.start && segmentIndex < leg.end)
}

export function isStopAnchorIndex(
  vertexIndex: number,
  points: readonly WorldMapPoint[],
  stops: readonly { point: WorldMapPoint }[],
  epsilon = 0.00005,
): boolean {
  const point = points[vertexIndex]
  if (!point) return false
  return stops.some((stop) => Math.hypot(stop.point[0] - point[0], stop.point[1] - point[1]) <= epsilon)
}

export function resizePathUserBends(bends: readonly boolean[], pointCount: number): boolean[] {
  if (pointCount <= 0) return []
  if (bends.length === pointCount) return [...bends]
  if (bends.length < pointCount) {
    return [...bends, ...Array.from({ length: pointCount - bends.length }, () => false)]
  }
  return bends.slice(0, pointCount)
}

/** Leg boundaries at each stop anchor inside a dense road-traced path. */
export function buildLegStartsFromStopAnchors(
  points: readonly WorldMapPoint[],
  stops: readonly { point: WorldMapPoint }[],
  epsilon = 0.00005,
): number[] {
  if (stops.length === 0 || points.length === 0) return []
  const legStarts = [0]
  let searchFrom = 0
  for (let stopIndex = 1; stopIndex < stops.length; stopIndex += 1) {
    const target = stops[stopIndex]!.point
    let anchorIndex = -1
    for (let pointIndex = searchFrom; pointIndex < points.length; pointIndex += 1) {
      const point = points[pointIndex]
      if (!point) continue
      if (Math.hypot(point[0] - target[0], point[1] - target[1]) <= epsilon) {
        anchorIndex = pointIndex
        break
      }
    }
    if (anchorIndex < 0) anchorIndex = points.length - 1
    if (anchorIndex > legStarts[legStarts.length - 1]!) {
      legStarts.push(anchorIndex)
    }
    searchFrom = anchorIndex
  }
  return legStarts
}
