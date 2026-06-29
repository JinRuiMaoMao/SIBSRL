import type { WorldMapPoint } from '../data/worldMapRoutes'
import { mergePathPoints } from './worldMapDrawPath'

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

export type TraceTwoPointFn = (from: WorldMapPoint, to: WorldMapPoint) => WorldMapPoint[]

function shiftLegStartsAfterMiddleReplace(
  legStarts: readonly number[],
  keepThrough: number,
  replaceFrom: number,
  replaceThrough: number,
  insertedCount: number,
): number[] {
  const removedCount = replaceThrough - replaceFrom + 1
  const delta = insertedCount - removedCount
  let next = legStarts.length > 0 ? [...legStarts] : [0]
  if (next[0] !== 0) next.unshift(0)
  next = next
    .map((start) => {
      if (start <= keepThrough) return start
      if (start > replaceThrough) return start + delta
      return keepThrough + 1
    })
    .filter((start, index, arr) => index === 0 || start > arr[index - 1]!)
  return next
}

function shiftLegStartsAfterMiddleRemove(
  legStarts: readonly number[],
  keepThrough: number,
  removeFrom: number,
  removeThrough: number,
): number[] {
  const removedCount = removeThrough - removeFrom + 1
  let next = legStarts.length > 0 ? [...legStarts] : [0]
  if (next[0] !== 0) next.unshift(0)
  next = next
    .map((start) => {
      if (start <= keepThrough) return start
      if (start > removeThrough) return start - removedCount
      return keepThrough + 1
    })
    .filter((start, index, arr) => index === 0 || start > arr[index - 1]!)
  return next
}

/** Rebuild A→bend→B along roads when the user drags a bend handle. */
export function retacePathThroughUserBend(
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  userBends: readonly boolean[],
  vertexIndex: number,
  bendTarget: WorldMapPoint,
  traceSegment: TraceTwoPointFn,
): {
  points: WorldMapPoint[]
  legStarts: number[]
  userBends: boolean[]
  bendIndex: number
} | null {
  if (!userBends[vertexIndex]) return null
  const before = vertexIndex - 1
  const after = vertexIndex + 1
  if (before < 0 || after >= points.length) return null

  const start = points[before]!
  const end = points[after]!
  const bend = clampPathPoint(bendTarget)
  const legToBend = traceSegment(start, bend)
  const legFromBend = traceSegment(bend, end)
  const middle = mergePathPoints(
    legToBend.length > 1 ? legToBend.slice(1) : [bend],
    legFromBend.length > 1 ? legFromBend.slice(1) : [],
  )
  const replaceFrom = before + 1
  const replaceThrough = after - 1
  const newPoints = [
    ...points.slice(0, replaceFrom).map((point) => [point[0], point[1]] as WorldMapPoint),
    ...middle.map((point) => [point[0], point[1]] as WorldMapPoint),
    ...points.slice(after).map((point) => [point[0], point[1]] as WorldMapPoint),
  ]
  const bendIndex = before + Math.max(1, legToBend.length - 1)
  const nextLegStarts = shiftLegStartsAfterMiddleReplace(
    legStarts,
    before,
    replaceFrom,
    replaceThrough,
    middle.length,
  )
  const nextUserBends = Array.from({ length: newPoints.length }, () => false)
  if (bendIndex >= 0 && bendIndex < nextUserBends.length) {
    nextUserBends[bendIndex] = true
  }
  return {
    points: newPoints,
    legStarts: nextLegStarts,
    userBends: nextUserBends,
    bendIndex,
  }
}

function anchorIndexBefore(
  points: readonly WorldMapPoint[],
  stops: readonly { point: WorldMapPoint }[],
  index: number,
): number {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (isStopAnchorIndex(cursor, points, stops)) return cursor
  }
  return Math.max(0, index - 1)
}

function anchorIndexAfter(
  points: readonly WorldMapPoint[],
  stops: readonly { point: WorldMapPoint }[],
  index: number,
): number {
  for (let cursor = index + 1; cursor < points.length; cursor += 1) {
    if (isStopAnchorIndex(cursor, points, stops)) return cursor
  }
  return Math.min(points.length - 1, index + 1)
}

/** Remove a user bend and straighten back to a chord between neighboring stop anchors. */
export function collapseUserBendToChord(
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  userBends: readonly boolean[],
  vertexIndex: number,
  stops: readonly { point: WorldMapPoint }[],
): { points: WorldMapPoint[]; legStarts: number[]; userBends: boolean[] } | null {
  if (!userBends[vertexIndex]) return null
  const left = anchorIndexBefore(points, stops, vertexIndex)
  const right = anchorIndexAfter(points, stops, vertexIndex)
  if (right <= left + 1) return removePathVertex(points, legStarts, vertexIndex)

  const removeFrom = left + 1
  const removeThrough = right - 1
  const newPoints = [
    ...points.slice(0, removeFrom).map((point) => [point[0], point[1]] as WorldMapPoint),
    ...points.slice(right).map((point) => [point[0], point[1]] as WorldMapPoint),
  ]
  return {
    points: newPoints,
    legStarts: shiftLegStartsAfterMiddleRemove(legStarts, left, removeFrom, removeThrough),
    userBends: Array.from({ length: newPoints.length }, () => false),
  }
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
