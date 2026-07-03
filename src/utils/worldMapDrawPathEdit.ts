import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawStop } from '../types/worldMapDraw'
import { buildStopLegStarts, mergePathPoints } from './worldMapDrawPath'

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

export function findPointIndexNear(
  points: readonly WorldMapPoint[],
  target: WorldMapPoint,
  epsilon = 0.00005,
): number {
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]!
    if (Math.hypot(point[0] - target[0], point[1] - target[1]) <= epsilon) return index
  }
  return -1
}

/** Drop road samples inside a leg but keep its endpoint anchors for later re-connect. */
export function removeLegInteriorPoints(
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  userBends: readonly boolean[],
  legIndex: number,
): { points: WorldMapPoint[]; legStarts: number[]; userBends: boolean[] } | null {
  const legs = getPathLegRanges(legStarts, points.length)
  const leg = legs[legIndex]
  if (!leg) return null

  const removeFrom = leg.start + 1
  const removeThrough = leg.end - 1
  if (removeThrough < removeFrom) {
    return {
      points: points.map((point) => [point[0], point[1]] as WorldMapPoint),
      legStarts: legStarts.length > 0 ? [...legStarts] : [0],
      userBends: resizePathUserBends(userBends, points.length),
    }
  }

  const removedCount = removeThrough - removeFrom + 1
  const newPoints = [
    ...points.slice(0, removeFrom).map((point) => [point[0], point[1]] as WorldMapPoint),
    ...points.slice(leg.end).map((point) => [point[0], point[1]] as WorldMapPoint),
  ]

  let nextLegStarts = legStarts.length > 0 ? [...legStarts] : [0]
  if (nextLegStarts[0] !== 0) nextLegStarts.unshift(0)
  nextLegStarts = nextLegStarts
    .map((start) => (start > removeThrough ? start - removedCount : start))
    .filter((start, index, arr) => index === 0 || start > arr[index - 1]!)

  const nextUserBends = resizePathUserBends(userBends, points.length).filter(
    (_, index) => index < removeFrom || index > removeThrough,
  )

  return { points: newPoints, legStarts: nextLegStarts, userBends: nextUserBends }
}

/** Retrace only the visible legs touching a moved anchor, not the whole anchor span. */
export function retraceAdjacentLegsAtAnchor(
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  legHidden: readonly boolean[],
  anchorPoint: WorldMapPoint,
  anchors: readonly { point: WorldMapPoint }[],
  traceSegment: TraceTwoPointFn,
): { points: WorldMapPoint[]; legStarts: number[] } {
  let nextPoints = points.map((point) => [point[0], point[1]] as WorldMapPoint)
  let nextLegStarts = legStarts.length > 0 ? [...legStarts] : [0]

  let anchorIndex = findPointIndexNear(nextPoints, anchorPoint)
  if (anchorIndex < 0) return { points: nextPoints, legStarts: nextLegStarts }

  const left = findPathAnchorIndexBefore(nextPoints, anchors, anchorIndex)
  const right = findPathAnchorIndexAfter(nextPoints, anchors, anchorIndex)

  const incomingLegs = getPathLegRanges(nextLegStarts, nextPoints.length)
  for (let legIndex = 0; legIndex < incomingLegs.length; legIndex += 1) {
    if (legHidden[legIndex]) continue
    const leg = incomingLegs[legIndex]!
    if (leg.end === anchorIndex && left < anchorIndex) {
      const retraced = retacePathSpanBetweenAnchors(
        nextPoints,
        nextLegStarts,
        left,
        anchorIndex,
        traceSegment,
      )
      if (retraced) {
        nextPoints = retraced.points
        nextLegStarts = retraced.legStarts
      }
      break
    }
  }

  anchorIndex = findPointIndexNear(nextPoints, anchorPoint)
  if (anchorIndex < 0) return { points: nextPoints, legStarts: nextLegStarts }

  const outgoingLegs = getPathLegRanges(nextLegStarts, nextPoints.length)
  for (let legIndex = 0; legIndex < outgoingLegs.length; legIndex += 1) {
    if (legHidden[legIndex]) continue
    const leg = outgoingLegs[legIndex]!
    if (leg.start === anchorIndex && anchorIndex < right) {
      const retraced = retacePathSpanBetweenAnchors(
        nextPoints,
        nextLegStarts,
        anchorIndex,
        right,
        traceSegment,
      )
      if (retraced) {
        nextPoints = retraced.points
        nextLegStarts = retraced.legStarts
      }
      break
    }
  }

  return { points: nextPoints, legStarts: nextLegStarts }
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

export function updatePathPointsForStopMove(
  points: readonly WorldMapPoint[],
  stops: readonly { id: string; point: WorldMapPoint }[],
  stopId: string,
  nextPoint: WorldMapPoint,
  epsilon = 0.00005,
): WorldMapPoint[] {
  const stop = stops.find((entry) => entry.id === stopId)
  if (!stop) return [...points]
  const oldPoint = stop.point
  return points.map((point) =>
    Math.hypot(point[0] - oldPoint[0], point[1] - oldPoint[1]) <= epsilon
      ? ([nextPoint[0], nextPoint[1]] as WorldMapPoint)
      : ([point[0], point[1]] as WorldMapPoint),
  )
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

/** Remap user-bend flags after replacing points[vertexIndex] with middle.length road samples. */
export function remapUserBendsAfterVertexReplace(
  userBends: readonly boolean[],
  vertexIndex: number,
  middleLength: number,
  movedBendIndex: number,
): boolean[] {
  const nextLength = userBends.length - 1 + middleLength
  const next = Array.from({ length: nextLength }, () => false)
  for (let index = 0; index < userBends.length; index += 1) {
    if (!userBends[index] || index === vertexIndex) continue
    const remapped = index < vertexIndex ? index : index - 1 + middleLength
    if (remapped >= 0 && remapped < nextLength) next[remapped] = true
  }
  if (movedBendIndex >= 0 && movedBendIndex < nextLength) {
    next[movedBendIndex] = true
  }
  return next
}

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

/** Collapse road points between stop anchors to a straight chord with one bend (live drag preview). */
export function isolateUserBendForDrag(
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  userBends: readonly boolean[],
  vertexIndex: number,
  stops: readonly { point: WorldMapPoint }[],
): { points: WorldMapPoint[]; legStarts: number[]; userBends: boolean[]; bendIndex: number } | null {
  if (!userBends[vertexIndex]) return null
  const left = anchorIndexBefore(points, stops, vertexIndex)
  const right = anchorIndexAfter(points, stops, vertexIndex)
  const bend = points[vertexIndex]
  if (!bend) return null
  const removeFrom = left + 1
  const removeThrough = right - 1
  const newPoints = [
    ...points.slice(0, removeFrom).map((point) => [point[0], point[1]] as WorldMapPoint),
    [bend[0], bend[1]] as WorldMapPoint,
    ...points.slice(right).map((point) => [point[0], point[1]] as WorldMapPoint),
  ]
  const bendIndex = left + 1
  const nextUserBends = Array.from({ length: newPoints.length }, () => false)
  nextUserBends[bendIndex] = true
  return {
    points: newPoints,
    legStarts:
      removeThrough >= removeFrom
        ? shiftLegStartsAfterMiddleRemove(legStarts, left, removeFrom, removeThrough)
        : [...(legStarts.length > 0 ? legStarts : [0])],
    userBends: nextUserBends,
    bendIndex,
  }
}

/** Replace path samples between two anchors with a fresh road trace. */
export function retacePathSpanBetweenAnchors(
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  leftAnchorIndex: number,
  rightAnchorIndex: number,
  traceSegment: TraceTwoPointFn,
): { points: WorldMapPoint[]; legStarts: number[] } | null {
  if (rightAnchorIndex <= leftAnchorIndex) return null
  const start = points[leftAnchorIndex]!
  const end = points[rightAnchorIndex]!
  const traced = traceSegment(start, end)
  const middle = traced.length > 2 ? traced.slice(1, -1) : []
  const replaceFrom = leftAnchorIndex + 1
  const replaceThrough = rightAnchorIndex - 1
  const newPoints = [
    ...points.slice(0, replaceFrom).map((point) => [point[0], point[1]] as WorldMapPoint),
    ...middle.map((point) => [point[0], point[1]] as WorldMapPoint),
    ...points.slice(rightAnchorIndex).map((point) => [point[0], point[1]] as WorldMapPoint),
  ]
  return {
    points: newPoints,
    legStarts: shiftLegStartsAfterMiddleReplace(
      legStarts,
      leftAnchorIndex,
      replaceFrom,
      replaceThrough,
      middle.length,
    ),
  }
}

export function findPathAnchorIndexBefore(
  points: readonly WorldMapPoint[],
  anchors: readonly { point: WorldMapPoint }[],
  index: number,
): number {
  return anchorIndexBefore(points, anchors, index)
}

export function findPathAnchorIndexAfter(
  points: readonly WorldMapPoint[],
  anchors: readonly { point: WorldMapPoint }[],
  index: number,
): number {
  return anchorIndexAfter(points, anchors, index)
}

/** Rebuild both segments beside a bend (prev → bend → next) along nearby roads. */
export function retacePathSpanAroundUserBend(
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
  const left = vertexIndex - 1
  const right = vertexIndex + 1
  if (left < 0 || right >= points.length) return null

  const start = points[left]!
  const end = points[right]!
  const bend = clampPathPoint(bendTarget)

  const legToBend = traceSegment(start, bend)
  const bendOnRoad = legToBend[legToBend.length - 1] ?? bend
  const legFromBend = traceSegment(bendOnRoad, end)
  let middle = mergePathPoints(
    legToBend.length > 1 ? legToBend.slice(1) : [bendOnRoad],
    legFromBend.length > 1 ? legFromBend.slice(1) : [],
  )
  if (middle.length === 0) middle = [bendOnRoad]

  let bendIndexInMiddle = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < middle.length; index += 1) {
    const point = middle[index]!
    const distance = Math.hypot(point[0] - bend[0], point[1] - bend[1])
    if (distance < bestDistance) {
      bestDistance = distance
      bendIndexInMiddle = index
    }
  }
  middle[bendIndexInMiddle] = [bend[0], bend[1]]

  const replaceFrom = left + 1
  const replaceThrough = right - 1
  const newPoints = [
    ...points.slice(0, replaceFrom).map((point) => [point[0], point[1]] as WorldMapPoint),
    ...middle.map((point) => [point[0], point[1]] as WorldMapPoint),
    ...points.slice(right).map((point) => [point[0], point[1]] as WorldMapPoint),
  ]
  const bendIndex = left + 1 + bendIndexInMiddle
  const nextLegStarts = shiftLegStartsAfterMiddleReplace(
    legStarts,
    left,
    replaceFrom,
    replaceThrough,
    middle.length,
  )
  const nextUserBends = remapUserBendsAfterVertexReplace(
    userBends,
    vertexIndex,
    middle.length,
    bendIndex,
  )
  return {
    points: newPoints,
    legStarts: nextLegStarts,
    userBends: nextUserBends,
    bendIndex,
  }
}

/** @deprecated Prefer retacePathSpanAroundUserBend. */
export function retacePathLegThroughUserBends(
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  userBends: readonly boolean[],
  movedBendIndex: number,
  bendTarget: WorldMapPoint,
  traceSegment: TraceTwoPointFn,
): ReturnType<typeof retacePathSpanAroundUserBend> {
  return retacePathSpanAroundUserBend(
    points,
    legStarts,
    userBends,
    movedBendIndex,
    bendTarget,
    traceSegment,
  )
}

/** @deprecated Use retacePathSpanAroundUserBend. */
export function retacePathThroughUserBend(
  points: readonly WorldMapPoint[],
  legStarts: readonly number[],
  userBends: readonly boolean[],
  vertexIndex: number,
  bendTarget: WorldMapPoint,
  traceSegment: TraceTwoPointFn,
): ReturnType<typeof retacePathSpanAroundUserBend> {
  return retacePathSpanAroundUserBend(
    points,
    legStarts,
    userBends,
    vertexIndex,
    bendTarget,
    traceSegment,
  )
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
  const otherBendsInSpan = userBends.reduce((count, isBend, index) => {
    if (!isBend || index === vertexIndex || index <= left || index >= right) return count
    return count + 1
  }, 0)

  if (otherBendsInSpan > 0) {
    const result = removePathVertex(points, legStarts, vertexIndex)
    if (!result) return null
    const nextUserBends = resizePathUserBends(userBends, points.length)
      .filter((_, index) => index !== vertexIndex)
    return { ...result, userBends: nextUserBends }
  }

  if (right <= left + 1) return removePathVertex(points, legStarts, vertexIndex)

  const removeFrom = left + 1
  const removeThrough = right - 1
  const newPoints = [
    ...points.slice(0, removeFrom).map((point) => [point[0], point[1]] as WorldMapPoint),
    ...points.slice(right).map((point) => [point[0], point[1]] as WorldMapPoint),
  ]
  const removedCount = removeThrough - removeFrom + 1
  const nextUserBends = Array.from({ length: newPoints.length }, () => false)
  for (let index = 0; index < userBends.length; index += 1) {
    if (!userBends[index] || index <= left || index >= right) continue
    const remapped = index < removeFrom ? index : index - removedCount
    if (remapped >= 0 && remapped < nextUserBends.length) nextUserBends[remapped] = true
  }
  return {
    points: newPoints,
    legStarts: shiftLegStartsAfterMiddleRemove(legStarts, left, removeFrom, removeThrough),
    userBends: nextUserBends,
  }
}

export function findClosestPointIndex(
  points: readonly WorldMapPoint[],
  target: WorldMapPoint,
): number {
  let bestIndex = -1
  let bestDistance = Infinity
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]!
    const distance = Math.hypot(point[0] - target[0], point[1] - target[1])
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }
  return bestIndex
}

/** Leg boundaries at stop and path-node anchors inside a dense road-traced path. */
export function buildLegStartsFromPathAnchors(
  points: readonly WorldMapPoint[],
  stops: readonly { point: WorldMapPoint }[],
  pathNodes: readonly { point: WorldMapPoint }[] = [],
  epsilon = 0.00005,
): number[] {
  if (points.length === 0) return []
  const anchors = [
    ...stops.map((stop) => stop.point),
    ...pathNodes.map((node) => node.point),
  ]
  if (anchors.length === 0) return points.length >= 2 ? [0] : []

  const orderedIndices = anchors
    .map((point) => {
      const exact = findPointIndexNear(points, point, epsilon)
      return exact >= 0 ? exact : findClosestPointIndex(points, point)
    })
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)

  const legStarts = [0]
  for (const pathIndex of orderedIndices) {
    if (pathIndex > legStarts[legStarts.length - 1]!) {
      legStarts.push(pathIndex)
    }
  }
  return legStarts
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

export function normalizeImportedLegStarts(
  legStarts: readonly number[],
  pointCount: number,
): number[] {
  let normalized = legStarts.length > 0 ? [...legStarts] : [0]
  if (normalized[0] !== 0) normalized.unshift(0)
  normalized = normalized.filter(
    (start, index) => start >= 0 && start < pointCount && (index === 0 || start > normalized[index - 1]!),
  )
  if (normalized.length === 0) return pointCount >= 2 ? [0] : []
  if (normalized[0] !== 0) normalized.unshift(0)
  return normalized
}

export function snapPathNodesOntoPath(
  points: readonly WorldMapPoint[],
  pathNodes: readonly { id: string; point: WorldMapPoint; label?: string }[],
  epsilon = 0.00005,
): { id: string; point: WorldMapPoint; label?: string }[] {
  if (points.length < 2 || pathNodes.length === 0) {
    return pathNodes.map((node) => ({
      ...node,
      point: [node.point[0], node.point[1]] as WorldMapPoint,
    }))
  }

  return pathNodes.map((node) => {
    const exact = findPointIndexNear(points, node.point, epsilon)
    const pathIndex = exact >= 0 ? exact : findClosestPointIndex(points, node.point)
    if (pathIndex < 0) {
      return { ...node, point: [node.point[0], node.point[1]] as WorldMapPoint }
    }
    const snapped = points[pathIndex]!
    return { ...node, point: [snapped[0], snapped[1]] as WorldMapPoint }
  })
}

export function resolveImportedRouteDraft(options: {
  points: readonly WorldMapPoint[]
  stops: readonly WorldMapDrawStop[]
  pathNodes?: readonly { point: WorldMapPoint }[]
  legStarts?: readonly number[]
  pathLegHidden?: readonly boolean[]
  userBendIndices?: readonly number[]
}): {
  points: WorldMapPoint[]
  legStarts: number[]
  pathLegHidden: boolean[]
  pathUserBends: boolean[]
} {
  if (options.points.length >= 2) {
    const points = options.points.map((point) => [point[0], point[1]] as WorldMapPoint)
    const pathNodes = options.pathNodes ?? []
    const legStarts =
      pathNodes.length > 0
        ? buildLegStartsFromPathAnchors(points, options.stops, pathNodes)
        : options.legStarts && options.legStarts.length > 0
          ? normalizeImportedLegStarts(options.legStarts, points.length)
          : options.stops.length >= 2
            ? buildLegStartsFromStopAnchors(points, options.stops)
            : [0]
    const legCount = getPathLegRanges(legStarts, points.length).length
    const pathLegHidden = resizeLegHidden(options.pathLegHidden ?? [], legCount)
    const pathUserBends = Array.from({ length: points.length }, () => false)
    for (const index of options.userBendIndices ?? []) {
      if (index >= 0 && index < pathUserBends.length) pathUserBends[index] = true
    }
    return { points, legStarts, pathLegHidden, pathUserBends }
  }

  const points = options.stops.map((stop) => [stop.point[0], stop.point[1]] as WorldMapPoint)
  return {
    points,
    legStarts: buildStopLegStarts(options.stops.length),
    pathLegHidden: [],
    pathUserBends: Array.from({ length: points.length }, () => false),
  }
}
