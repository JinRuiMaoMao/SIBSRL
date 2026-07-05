import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { RouteEditorLine, RouteEditorNode, RouteEditorSegment } from './types'

/** 参考 route-editor-main.js updateRouteCornerRadius（有序节点，兼容旧导入） */
export function buildRouteEditorPathD(
  nodes: readonly RouteEditorNode[],
  showPointLines = false,
): string | null {
  if (nodes.length < 2) return null

  const nodesToRender = showPointLines ? nodes : nodes.filter((node) => node.type === 'stop')
  if (nodesToRender.length < 2) return null

  let path = `M ${nodesToRender[0]!.x} ${nodesToRender[0]!.y}`

  for (let i = 1; i < nodesToRender.length - 1; i += 1) {
    const prev = nodesToRender[i - 1]!
    const curr = nodesToRender[i]!
    const next = nodesToRender[i + 1]!

    let cornerRadius = 0
    const originalNode = nodes.find(
      (node) => node.type === 'point' && node.x === curr.x && node.y === curr.y,
    )
    if (originalNode) {
      cornerRadius = originalNode.cornerRadius || 0
    }

    if (cornerRadius > 0) {
      const dx1 = curr.x - prev.x
      const dy1 = curr.y - prev.y
      const dx2 = next.x - curr.x
      const dy2 = next.y - curr.y
      const len1 = Math.hypot(dx1, dy1)
      const len2 = Math.hypot(dx2, dy2)
      if (len1 <= 0 || len2 <= 0) {
        path += ` L ${curr.x} ${curr.y}`
        continue
      }
      const maxRadius = Math.min(cornerRadius, len1 / 2, len2 / 2)
      const u1x = dx1 / len1
      const u1y = dy1 / len1
      const u2x = dx2 / len2
      const u2y = dy2 / len2
      const startX = curr.x - u1x * maxRadius
      const startY = curr.y - u1y * maxRadius
      const endX = curr.x + u2x * maxRadius
      const endY = curr.y + u2y * maxRadius
      path += ` L ${startX} ${startY}`
      path += ` Q ${curr.x} ${curr.y} ${endX} ${endY}`
    } else {
      path += ` L ${curr.x} ${curr.y}`
    }
  }

  const last = nodesToRender[nodesToRender.length - 1]!
  path += ` L ${last.x} ${last.y}`
  return path
}

export function inferSegmentsFromOrderedNodes(
  nodes: readonly RouteEditorNode[],
  startId = 1,
): RouteEditorSegment[] {
  const segments: RouteEditorSegment[] = []
  for (let i = 0; i < nodes.length - 1; i += 1) {
    segments.push({ id: startId + i, fromNodeId: nodes[i]!.id, toNodeId: nodes[i + 1]!.id })
  }
  return segments
}

export function normalizeRouteEditorLine(line: RouteEditorLine): RouteEditorLine {
  const segments = line.segments?.length
    ? line.segments
    : inferSegmentsFromOrderedNodes(line.nodes)
  return { ...line, segments }
}

/** 沿线段采样导出用折线（归一化坐标） */
export function sampleRouteEditorPathPoints(
  line: RouteEditorLine,
  imageWidth: number,
  imageHeight: number,
  showPointLines = false,
  samplesPerSegment = 8,
): [number, number][] {
  if (imageWidth <= 0 || imageHeight <= 0) return []

  const nodeById = new Map(line.nodes.map((node) => [node.id, node]))
  const segments = line.segments ?? []
  if (segments.length === 0) return []

  const points: [number, number][] = []

  const pushPoint = (point: [number, number]) => {
    const last = points[points.length - 1]
    if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < 0.00001) return
    points.push(point)
  }

  for (const segment of segments) {
    const from = nodeById.get(segment.fromNodeId)
    const to = nodeById.get(segment.toNodeId)
    if (!from || !to) continue

    if (!showPointLines && from.type === 'point' && to.type === 'point') continue

    const a: [number, number] = [from.x / imageWidth, from.y / imageHeight]
    const b: [number, number] = [to.x / imageWidth, to.y / imageHeight]

    if (points.length === 0) {
      pushPoint(a)
    } else {
      pushPoint(a)
    }

    if (samplesPerSegment <= 1) {
      pushPoint(b)
      continue
    }

    for (let step = 1; step < samplesPerSegment; step += 1) {
      const t = step / samplesPerSegment
      pushPoint([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
    pushPoint(b)
  }

  return points
}

function buildRouteEditorSegmentAdjacency(
  segments: readonly RouteEditorSegment[],
): Map<number, { nodeId: number; segment: RouteEditorSegment }[]> {
  const adjacency = new Map<number, { nodeId: number; segment: RouteEditorSegment }[]>()
  for (const segment of segments) {
    const fromLinks = adjacency.get(segment.fromNodeId) ?? []
    fromLinks.push({ nodeId: segment.toNodeId, segment })
    adjacency.set(segment.fromNodeId, fromLinks)
    const toLinks = adjacency.get(segment.toNodeId) ?? []
    toLinks.push({ nodeId: segment.fromNodeId, segment })
    adjacency.set(segment.toNodeId, toLinks)
  }
  return adjacency
}

function pickUnusedSegmentBetween(
  adjacency: Map<number, { nodeId: number; segment: RouteEditorSegment }[]>,
  fromNodeId: number,
  toNodeId: number,
  usedSegmentIds: ReadonlySet<number>,
): RouteEditorSegment | null {
  const links = (adjacency.get(fromNodeId) ?? [])
    .filter((link) => link.nodeId === toNodeId && !usedSegmentIds.has(link.segment.id))
    .sort((a, b) => a.segment.id - b.segment.id)
  return links[0]?.segment ?? null
}

function nodePathToSegmentPath(
  nodePath: readonly number[],
  adjacency: Map<number, { nodeId: number; segment: RouteEditorSegment }[]>,
  usedSegmentIds: ReadonlySet<number>,
): RouteEditorSegment[] | null {
  if (nodePath.length < 2) return []
  const segmentPath: RouteEditorSegment[] = []
  for (let index = 0; index < nodePath.length - 1; index += 1) {
    const segment = pickUnusedSegmentBetween(
      adjacency,
      nodePath[index]!,
      nodePath[index + 1]!,
      usedSegmentIds,
    )
    if (!segment) return null
    segmentPath.push(segment)
  }
  return segmentPath
}

/** Shortest node path using each drawn segment at most once. */
export function findRouteEditorSegmentPath(
  segments: readonly RouteEditorSegment[],
  fromNodeId: number,
  toNodeId: number,
  usedSegmentIds: ReadonlySet<number>,
): RouteEditorSegment[] | null {
  if (fromNodeId === toNodeId) return []
  if (segments.length === 0) return null

  const adjacency = buildRouteEditorSegmentAdjacency(segments)
  const queue: number[] = [fromNodeId]
  const visited = new Set<number>([fromNodeId])
  const parent = new Map<number, { fromNodeId: number; segment: RouteEditorSegment }>()

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === toNodeId) {
      const segmentPath: RouteEditorSegment[] = []
      let nodeId = toNodeId
      while (parent.has(nodeId)) {
        const step = parent.get(nodeId)!
        segmentPath.push(step.segment)
        nodeId = step.fromNodeId
      }
      segmentPath.reverse()
      return segmentPath
    }

    for (const link of adjacency.get(current) ?? []) {
      if (usedSegmentIds.has(link.segment.id)) continue
      if (visited.has(link.nodeId)) continue
      visited.add(link.nodeId)
      parent.set(link.nodeId, { fromNodeId: current, segment: link.segment })
      queue.push(link.nodeId)
    }
  }

  return null
}

function forwardChainDistance(
  chainOrder: readonly number[],
  fromIndex: number,
  toIndex: number,
): number {
  if (fromIndex < 0 || toIndex < 0) return Number.POSITIVE_INFINITY
  if (toIndex >= fromIndex) return toIndex - fromIndex
  return chainOrder.length - fromIndex + toIndex
}

/** Greedy forward walk along chainOrder using only unused segments (never reverses). */
function walkForwardUnusedSegmentsToNode(
  segments: readonly RouteEditorSegment[],
  chainOrder: readonly number[],
  fromChainIndex: number,
  toNodeId: number,
  usedSegmentIds: ReadonlySet<number>,
): RouteEditorSegment[] | null {
  const adjacency = buildRouteEditorSegmentAdjacency(segments)
  let chainCursor = fromChainIndex
  let currentNodeId = chainOrder[fromChainIndex]
  if (currentNodeId == null) return null
  if (currentNodeId === toNodeId) return []

  let previousNodeId: number | null = null
  const segmentPath: RouteEditorSegment[] = []
  const maxSteps = segments.length + chainOrder.length

  for (let step = 0; step < maxSteps; step += 1) {
    if (currentNodeId === toNodeId) return segmentPath

    const targetIndex = indexInChainAfter(chainOrder, toNodeId, chainCursor)
    const candidates = (adjacency.get(currentNodeId) ?? [])
      .filter((link) => !usedSegmentIds.has(link.segment.id) && link.nodeId !== previousNodeId)
      .sort((a, b) => a.segment.id - b.segment.id)

    if (!candidates.length) return null

    let bestLink = candidates[0]!
    let bestScore = Number.POSITIVE_INFINITY
    for (const link of candidates) {
      const linkIndex = indexInChainAfter(chainOrder, link.nodeId, chainCursor)
      if (linkIndex < 0) continue
      const progress = forwardChainDistance(chainOrder, chainCursor, linkIndex)
      const remaining =
        targetIndex >= 0 ? forwardChainDistance(chainOrder, linkIndex, targetIndex) : progress
      const score = progress * 1000 + remaining
      if (score < bestScore) {
        bestScore = score
        bestLink = link
      }
    }

    segmentPath.push(bestLink.segment)
    previousNodeId = currentNodeId
    currentNodeId = bestLink.nodeId
    const nextCursor = indexInChainAfter(chainOrder, currentNodeId, chainCursor)
    if (nextCursor >= 0) chainCursor = nextCursor
  }

  return currentNodeId === toNodeId ? segmentPath : null
}

function resolveSegmentPathBetween(
  segments: readonly RouteEditorSegment[],
  chainOrder: readonly number[],
  fromNodeId: number,
  toNodeId: number,
  fromChainIndex: number,
  usedSegmentIds: ReadonlySet<number>,
): RouteEditorSegment[] | null {
  if (fromNodeId === toNodeId) return []

  const adjacency = buildRouteEditorSegmentAdjacency(segments)
  const fromIndex =
    fromChainIndex >= 0 ? fromChainIndex : chainOrder.indexOf(fromNodeId)
  if (fromIndex < 0) return null

  const toIndex = indexInChainAfter(chainOrder, toNodeId, fromIndex)
  if (toIndex >= 0) {
    const forwardPath = sliceChainOrderForward(chainOrder, fromIndex, toIndex)
    if (
      forwardPath.length >= 2 &&
      forwardPath[forwardPath.length - 1] === toNodeId
    ) {
      const forwardSegments = nodePathToSegmentPath(forwardPath, adjacency, usedSegmentIds)
      if (forwardSegments) return forwardSegments
    }
  }

  return walkForwardUnusedSegmentsToNode(
    segments,
    chainOrder,
    fromIndex,
    toNodeId,
    usedSegmentIds,
  )
}

/** Walk every drawn segment once, starting from startNodeId (defines forward direction). */
export function buildRouteEditorChainNodeOrder(
  segments: readonly RouteEditorSegment[],
  startNodeId: number,
): number[] {
  if (segments.length === 0) return [startNodeId]

  const adjacency = buildRouteEditorSegmentAdjacency(segments)
  const ordered: number[] = [startNodeId]
  const used = new Set<number>()
  let current = startNodeId
  let previous: number | null = null

  while (used.size < segments.length) {
    const links = (adjacency.get(current) ?? []).filter((link) => !used.has(link.segment.id))
    const next = links.find((link) => link.nodeId !== previous) ?? links[0]
    if (!next) break
    used.add(next.segment.id)
    previous = current
    current = next.nodeId
    ordered.push(current)
  }

  return ordered
}

function indexInChainAfter(
  chainOrder: readonly number[],
  nodeId: number,
  afterIndex: number,
): number {
  for (let index = afterIndex; index < chainOrder.length; index += 1) {
    if (chainOrder[index] === nodeId) return index
  }
  for (let index = 1; index < afterIndex; index += 1) {
    if (chainOrder[index] === nodeId) return index
  }
  return chainOrder.indexOf(nodeId)
}

/** Forward slice along chainOrder from fromIndex to toIndex (wraps on loops, never reverses). */
function sliceChainOrderForward(
  chainOrder: readonly number[],
  fromIndex: number,
  toIndex: number,
): number[] {
  if (fromIndex === toIndex) return [chainOrder[fromIndex]!]
  if (toIndex > fromIndex) return [...chainOrder.slice(fromIndex, toIndex + 1)]
  return [...chainOrder.slice(fromIndex), ...chainOrder.slice(1, toIndex + 1)]
}

/** Follow the drawn polyline forward; avoids U-turn shortcuts on loops. */
export function findRouteEditorForwardNodePath(
  segments: readonly RouteEditorSegment[],
  chainOrder: readonly number[],
  fromNodeId: number,
  toNodeId: number,
  fromChainIndex?: number,
): number[] | null {
  if (fromNodeId === toNodeId) return [fromNodeId]

  const fromIndex =
    fromChainIndex ??
    (chainOrder.indexOf(fromNodeId) >= 0 ? chainOrder.indexOf(fromNodeId) : -1)
  if (fromIndex < 0) return findRouteEditorNodePath(segments, fromNodeId, toNodeId)

  const toIndex = indexInChainAfter(chainOrder, toNodeId, fromIndex)
  if (toIndex < 0) return findRouteEditorNodePath(segments, fromNodeId, toNodeId)

  return sliceChainOrderForward(chainOrder, fromIndex, toIndex)
}

/** Shortest node path along drawn segments (BFS). */
export function findRouteEditorNodePath(
  segments: readonly RouteEditorSegment[],
  fromNodeId: number,
  toNodeId: number,
): number[] | null {
  if (fromNodeId === toNodeId) return [fromNodeId]
  if (segments.length === 0) return null

  const adjacency = buildRouteEditorSegmentAdjacency(segments)
  const queue: number[] = [fromNodeId]
  const visited = new Set<number>([fromNodeId])
  const parent = new Map<number, number>()

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === toNodeId) {
      const path: number[] = [toNodeId]
      let nodeId = toNodeId
      while (parent.has(nodeId)) {
        nodeId = parent.get(nodeId)!
        path.push(nodeId)
      }
      path.reverse()
      return path
    }

    for (const link of adjacency.get(current) ?? []) {
      if (visited.has(link.nodeId)) continue
      visited.add(link.nodeId)
      parent.set(link.nodeId, current)
      queue.push(link.nodeId)
    }
  }

  return null
}

/** Sample the drawn polyline between two connected nodes (forward along chainStartNodeId). */
export function sampleRouteEditorPathBetweenNodes(
  line: RouteEditorLine,
  imageWidth: number,
  imageHeight: number,
  fromNodeId: number,
  toNodeId: number,
  samplesPerSegment = 16,
  chainStartNodeId?: number,
  fromChainIndex?: number,
): [number, number][] {
  if (imageWidth <= 0 || imageHeight <= 0) return []

  const nodeById = new Map(line.nodes.map((node) => [node.id, node]))
  const fromNode = nodeById.get(fromNodeId)
  const toNode = nodeById.get(toNodeId)
  if (!fromNode || !toNode) return []

  const points: [number, number][] = []
  const pushPoint = (point: [number, number]) => {
    const last = points[points.length - 1]
    if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < 0.00001) return
    points.push(point)
  }

  if (fromNodeId === toNodeId) {
    pushPoint([fromNode.x / imageWidth, fromNode.y / imageHeight])
    return points
  }

  const segments = line.segments ?? []
  const chainOrder =
    chainStartNodeId != null
      ? buildRouteEditorChainNodeOrder(segments, chainStartNodeId)
      : buildRouteEditorChainNodeOrder(
          segments,
          findRouteEditorChainStartNodeId(line.nodes, segments),
        )

  const nodePath =
    chainOrder.length > 0
      ? findRouteEditorForwardNodePath(segments, chainOrder, fromNodeId, toNodeId, fromChainIndex)
      : findRouteEditorNodePath(segments, fromNodeId, toNodeId)

  if (!nodePath || nodePath.length < 2) {
    sampleSegmentPoints(fromNode, toNode, imageWidth, imageHeight, samplesPerSegment, pushPoint)
    return points
  }

  for (let index = 0; index < nodePath.length - 1; index += 1) {
    const segmentFrom = nodeById.get(nodePath[index]!)
    const segmentTo = nodeById.get(nodePath[index + 1]!)
    if (!segmentFrom || !segmentTo) continue
    sampleSegmentPoints(segmentFrom, segmentTo, imageWidth, imageHeight, samplesPerSegment, pushPoint)
  }

  return points
}

const TRAJECTORY_ARC_MATCH_EPSILON_PX = 12

function toNormalizedPoint(x: number, y: number, imageWidth: number, imageHeight: number): WorldMapPoint {
  return [x / imageWidth, y / imageHeight]
}

function interpolatePathPointAtArcLength(
  path: readonly WorldMapPoint[],
  arcLength: number,
  imageWidth: number,
  imageHeight: number,
): WorldMapPoint | null {
  if (path.length === 0) return null
  if (path.length === 1) return [path[0]![0], path[0]![1]]

  let remaining = Math.max(0, arcLength)
  for (let index = 0; index < path.length - 1; index += 1) {
    const a = path[index]!
    const b = path[index + 1]!
    const ax = a[0] * imageWidth
    const ay = a[1] * imageHeight
    const bx = b[0] * imageWidth
    const by = b[1] * imageHeight
    const segLen = Math.hypot(bx - ax, by - ay)
    if (segLen <= 0) continue
    if (remaining > segLen) {
      remaining -= segLen
      continue
    }
    const t = remaining / segLen
    return toNormalizedPoint(ax + (bx - ax) * t, ay + (by - ay) * t, imageWidth, imageHeight)
  }

  const last = path[path.length - 1]!
  return [last[0], last[1]]
}

/** Closest arc-length at or after minArcLength (handles paths that revisit the same geometry). */
export function pathArcLengthToStopMonotonic(
  path: readonly WorldMapPoint[],
  stopPoint: WorldMapPoint,
  imageWidth: number,
  imageHeight: number,
  minArcLength = 0,
): number {
  if (path.length < 2) return 0

  const targetX = stopPoint[0] * imageWidth
  const targetY = stopPoint[1] * imageHeight
  let cumulative = 0
  let bestDistance = Infinity
  let bestArcLength = minArcLength

  for (let index = 0; index < path.length - 1; index += 1) {
    const a = path[index]!
    const b = path[index + 1]!
    const ax = a[0] * imageWidth
    const ay = a[1] * imageHeight
    const bx = b[0] * imageWidth
    const by = b[1] * imageHeight
    const dx = bx - ax
    const dy = by - ay
    const segLenSq = dx * dx + dy * dy
    let t = 0
    if (segLenSq > 0) {
      t = Math.min(1, Math.max(0, ((targetX - ax) * dx + (targetY - ay) * dy) / segLenSq))
    }
    const projX = ax + dx * t
    const projY = ay + dy * t
    const distance = Math.hypot(targetX - projX, targetY - projY)
    const arcAtProjection = cumulative + Math.hypot(projX - ax, projY - ay)
    if (arcAtProjection >= minArcLength - TRAJECTORY_ARC_MATCH_EPSILON_PX && distance < bestDistance) {
      bestDistance = distance
      bestArcLength = arcAtProjection
    }
    cumulative += Math.hypot(dx, dy)
  }

  return bestArcLength
}

/** Monotonic arc-length marker for each stop on a sampled trajectory path. */
export function buildTrajectoryStopArcLengths(
  path: readonly WorldMapPoint[],
  orderedStops: readonly RouteEditorNode[],
  imageWidth: number,
  imageHeight: number,
): number[] {
  let minArc = 0
  const arcs: number[] = []
  for (const stop of orderedStops) {
    const stopPoint = toNormalizedPoint(stop.x, stop.y, imageWidth, imageHeight)
    const arc = pathArcLengthToStopMonotonic(path, stopPoint, imageWidth, imageHeight, minArc)
    arcs.push(arc)
    minArc = arc + 1
  }
  return arcs
}

/** Extract a path slice between two arc lengths (supports backtracking when end < start). */
export function slicePathByArcLengthRange(
  path: readonly WorldMapPoint[],
  startArc: number,
  endArc: number,
  imageWidth: number,
  imageHeight: number,
): WorldMapPoint[] {
  if (path.length < 2) return [...path]
  if (Math.abs(endArc - startArc) < 0.5) {
    const point = interpolatePathPointAtArcLength(path, startArc, imageWidth, imageHeight)
    return point ? [point] : []
  }

  const forward = endArc >= startArc
  const low = forward ? startArc : endArc
  const high = forward ? endArc : startArc
  const slice: WorldMapPoint[] = []

  const startPoint = interpolatePathPointAtArcLength(path, low, imageWidth, imageHeight)
  if (startPoint) slice.push(startPoint)

  let cumulative = 0
  for (let index = 0; index < path.length - 1; index += 1) {
    const a = path[index]!
    const b = path[index + 1]!
    const ax = a[0] * imageWidth
    const ay = a[1] * imageHeight
    const bx = b[0] * imageWidth
    const by = b[1] * imageHeight
    const segLen = Math.hypot(bx - ax, by - ay)
    const segStart = cumulative
    const segEnd = cumulative + segLen

    if (segEnd <= low || segStart >= high) {
      cumulative += segLen
      continue
    }

    if (segStart >= low && segEnd <= high) {
      slice.push([b[0], b[1]])
    }

    cumulative += segLen
  }

  const endPoint = interpolatePathPointAtArcLength(path, high, imageWidth, imageHeight)
  if (endPoint) slice.push(endPoint)

  const deduped: WorldMapPoint[] = []
  for (const point of slice) {
    const last = deduped[deduped.length - 1]
    if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < 0.00001) continue
    deduped.push(point)
  }

  return forward ? deduped : [...deduped].reverse()
}

function sampleSegmentPathIntoTrajectory(
  line: RouteEditorLine,
  segmentPath: readonly RouteEditorSegment[],
  imageWidth: number,
  imageHeight: number,
  samplesPerSegment: number,
  points: WorldMapPoint[],
  segmentIds: number[],
  segmentEndArcLengths: number[],
  arcLengthPx: { value: number },
) {
  const nodeById = new Map(line.nodes.map((node) => [node.id, node]))
  for (const segment of segmentPath) {
    const from = nodeById.get(segment.fromNodeId)
    const to = nodeById.get(segment.toNodeId)
    if (!from || !to) continue
    sampleSegmentPoints(from, to, imageWidth, imageHeight, samplesPerSegment, (point) => {
      pushTrajectoryPoint(points, arcLengthPx, imageWidth, imageHeight, point)
    })
    segmentIds.push(segment.id)
    segmentEndArcLengths.push(arcLengthPx.value)
  }
}

function pushTrajectoryPoint(
  points: WorldMapPoint[],
  arcLengthPx: { value: number },
  imageWidth: number,
  imageHeight: number,
  point: WorldMapPoint,
) {
  const last = points[points.length - 1]
  if (last) {
    arcLengthPx.value += Math.hypot(
      (point[0] - last[0]) * imageWidth,
      (point[1] - last[1]) * imageHeight,
    )
  }
  if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < 0.00001) return
  points.push(point)
}

export interface RouteEditorTrajectorySample {
  path: WorldMapPoint[]
  /** Drawn segment ids in traversal order; each id appears at most once. */
  segmentIds: number[]
  /** Pixel arc length at the end of each segment along path. */
  segmentEndArcLengths: number[]
}

/** Sample from first stopSeq through each stop in order to the last (each segment used once). */
export function sampleRouteEditorTrajectoryThroughStops(
  line: RouteEditorLine,
  imageWidth: number,
  imageHeight: number,
  orderedStops: readonly RouteEditorNode[],
  samplesPerSegment = 16,
): RouteEditorTrajectorySample {
  const empty: RouteEditorTrajectorySample = { path: [], segmentIds: [], segmentEndArcLengths: [] }
  if (orderedStops.length < 2) return empty

  const segments = line.segments ?? []
  const chainStartNodeId = orderedStops[0]!.id
  const chainOrder = buildRouteEditorChainNodeOrder(segments, chainStartNodeId)
  let chainCursor = chainOrder.indexOf(chainStartNodeId)
  if (chainCursor < 0) chainCursor = 0

  const nodeById = new Map(line.nodes.map((node) => [node.id, node]))
  const usedSegmentIds = new Set<number>()
  const points: WorldMapPoint[] = []
  const segmentIds: number[] = []
  const segmentEndArcLengths: number[] = []
  const arcLengthPx = { value: 0 }

  for (let index = 0; index < orderedStops.length - 1; index += 1) {
    const fromStop = orderedStops[index]!
    const toStop = orderedStops[index + 1]!
    const segmentPath = resolveSegmentPathBetween(
      segments,
      chainOrder,
      fromStop.id,
      toStop.id,
      chainCursor,
      usedSegmentIds,
    )

    if (segmentPath && segmentPath.length > 0) {
      sampleSegmentPathIntoTrajectory(
        line,
        segmentPath,
        imageWidth,
        imageHeight,
        samplesPerSegment,
        points,
        segmentIds,
        segmentEndArcLengths,
        arcLengthPx,
      )
      for (const segment of segmentPath) usedSegmentIds.add(segment.id)
    } else {
      const fromNode = nodeById.get(fromStop.id)
      const toNode = nodeById.get(toStop.id)
      if (fromNode && toNode) {
        sampleSegmentPoints(fromNode, toNode, imageWidth, imageHeight, samplesPerSegment, (point) => {
          pushTrajectoryPoint(points, arcLengthPx, imageWidth, imageHeight, point)
        })
      }
    }

    pushTrajectoryPoint(
      points,
      arcLengthPx,
      imageWidth,
      imageHeight,
      toNormalizedPoint(toStop.x, toStop.y, imageWidth, imageHeight),
    )

    const nextCursor = indexInChainAfter(chainOrder, toStop.id, chainCursor)
    if (nextCursor >= 0) chainCursor = nextCursor
  }

  if (points.length >= 2) {
    return { path: points, segmentIds, segmentEndArcLengths }
  }

  return sampleRouteEditorTrajectoryPathPoints(line, imageWidth, imageHeight, samplesPerSegment)
}

function findRouteEditorChainStartNodeId(
  nodes: readonly RouteEditorNode[],
  segments: readonly RouteEditorSegment[],
): number {
  const adjacency = buildRouteEditorSegmentAdjacency(segments)
  const endpointLinkCount = (nodeId: number) => (adjacency.get(nodeId)?.length ?? 0)

  const sequenced = nodes
    .filter((node) => node.type === 'stop' && node.stopSeq != null && node.stopSeq > 0)
    .sort((a, b) => a.stopSeq! - b.stopSeq! || a.id - b.id)
  if (sequenced.length >= 1) return sequenced[0]!.id

  for (const node of nodes) {
    if (node.type !== 'stop') continue
    if (endpointLinkCount(node.id) === 1) return node.id
  }
  for (const node of nodes) {
    if (endpointLinkCount(node.id) === 1) return node.id
  }
  for (const node of nodes) {
    if (node.type === 'stop') return node.id
  }
  return segments[0]?.fromNodeId ?? nodes[0]?.id ?? 0
}

/** Walk segment graph from a route endpoint so sampling follows the drawn polyline order. */
export function orderRouteEditorSegmentChain(
  nodes: readonly RouteEditorNode[],
  segments: readonly RouteEditorSegment[],
): RouteEditorSegment[] {
  if (segments.length <= 1) return [...segments]

  const adjacency = new Map<number, { segment: RouteEditorSegment; other: number }[]>()
  for (const segment of segments) {
    const fromLinks = adjacency.get(segment.fromNodeId) ?? []
    fromLinks.push({ segment, other: segment.toNodeId })
    adjacency.set(segment.fromNodeId, fromLinks)
    const toLinks = adjacency.get(segment.toNodeId) ?? []
    toLinks.push({ segment, other: segment.fromNodeId })
    adjacency.set(segment.toNodeId, toLinks)
  }

  const pickStartNodeId = (): number => {
    for (const node of nodes) {
      if (node.type !== 'stop') continue
      if ((adjacency.get(node.id)?.length ?? 0) === 1) return node.id
    }
    for (const node of nodes) {
      if ((adjacency.get(node.id)?.length ?? 0) === 1) return node.id
    }
    for (const node of nodes) {
      if (node.type === 'stop') return node.id
    }
    return segments[0]!.fromNodeId
  }

  const ordered: RouteEditorSegment[] = []
  const used = new Set<number>()
  let current = pickStartNodeId()
  let previous: number | null = null

  while (ordered.length < segments.length) {
    const links = (adjacency.get(current) ?? []).filter((link) => !used.has(link.segment.id))
    const next =
      links.find((link) => link.other !== previous) ??
      links[0]
    if (!next) break
    ordered.push(next.segment)
    used.add(next.segment.id)
    previous = current
    current = next.other
  }

  return ordered.length === segments.length ? ordered : [...segments]
}

function sampleSegmentPoints(
  from: RouteEditorNode,
  to: RouteEditorNode,
  imageWidth: number,
  imageHeight: number,
  samplesPerSegment: number,
  pushPoint: (point: [number, number]) => void,
) {
  const a: [number, number] = [from.x / imageWidth, from.y / imageHeight]
  const b: [number, number] = [to.x / imageWidth, to.y / imageHeight]
  pushPoint(a)
  if (samplesPerSegment <= 1) {
    pushPoint(b)
    return
  }
  for (let step = 1; step < samplesPerSegment; step += 1) {
    const t = step / samplesPerSegment
    pushPoint([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
  }
  pushPoint(b)
}

/** Sample every drawn segment in chain order for trajectory playback (matches overlay lines). */
export function sampleRouteEditorTrajectoryPathPoints(
  line: RouteEditorLine,
  imageWidth: number,
  imageHeight: number,
  samplesPerSegment = 16,
): RouteEditorTrajectorySample {
  const empty: RouteEditorTrajectorySample = { path: [], segmentIds: [], segmentEndArcLengths: [] }
  if (imageWidth <= 0 || imageHeight <= 0) return empty

  const nodeById = new Map(line.nodes.map((node) => [node.id, node]))
  const segments = line.segments ?? []
  if (segments.length === 0) return empty

  const adjacency = buildRouteEditorSegmentAdjacency(segments)
  const startNodeId = findRouteEditorChainStartNodeId(line.nodes, segments)

  const points: WorldMapPoint[] = []
  const segmentIds: number[] = []
  const segmentEndArcLengths: number[] = []
  const arcLengthPx = { value: 0 }

  const used = new Set<number>()
  let current = startNodeId
  let previous: number | null = null

  while (used.size < segments.length) {
    const links = (adjacency.get(current) ?? []).filter((link) => !used.has(link.segment.id))
    const next =
      links.find((link) => link.nodeId !== previous) ??
      links[0]
    if (!next) break

    const fromNode = nodeById.get(current)
    const toNode = nodeById.get(next.nodeId)
    if (!fromNode || !toNode) break

    sampleSegmentPoints(fromNode, toNode, imageWidth, imageHeight, samplesPerSegment, (point) => {
      pushTrajectoryPoint(points, arcLengthPx, imageWidth, imageHeight, point)
    })
    segmentIds.push(next.segment.id)
    segmentEndArcLengths.push(arcLengthPx.value)
    used.add(next.segment.id)
    previous = current
    current = next.nodeId
  }

  if (points.length >= 2) {
    return { path: points, segmentIds, segmentEndArcLengths }
  }

  for (const segment of segments) {
    const from = nodeById.get(segment.fromNodeId)
    const to = nodeById.get(segment.toNodeId)
    if (!from || !to) continue
    sampleSegmentPoints(from, to, imageWidth, imageHeight, samplesPerSegment, (point) => {
      pushTrajectoryPoint(points, arcLengthPx, imageWidth, imageHeight, point)
    })
    segmentIds.push(segment.id)
    segmentEndArcLengths.push(arcLengthPx.value)
  }

  return { path: points, segmentIds, segmentEndArcLengths }
}
