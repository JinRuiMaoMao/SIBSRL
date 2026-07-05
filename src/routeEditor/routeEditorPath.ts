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

/** Sample the drawn polyline between two connected nodes. */
export function sampleRouteEditorPathBetweenNodes(
  line: RouteEditorLine,
  imageWidth: number,
  imageHeight: number,
  fromNodeId: number,
  toNodeId: number,
  samplesPerSegment = 16,
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

  const nodePath = findRouteEditorNodePath(line.segments ?? [], fromNodeId, toNodeId)
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

/** Sample from first stopSeq through each stop in order to the last (follows drawn segments). */
export function sampleRouteEditorTrajectoryThroughStops(
  line: RouteEditorLine,
  imageWidth: number,
  imageHeight: number,
  orderedStops: readonly RouteEditorNode[],
  samplesPerSegment = 16,
): [number, number][] {
  if (orderedStops.length < 2) return []

  const points: [number, number][] = []
  const pushPoint = (point: [number, number]) => {
    const last = points[points.length - 1]
    if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < 0.00001) return
    points.push(point)
  }

  for (let index = 0; index < orderedStops.length - 1; index += 1) {
    const fromStop = orderedStops[index]!
    const toStop = orderedStops[index + 1]!
    const leg = sampleRouteEditorPathBetweenNodes(
      line,
      imageWidth,
      imageHeight,
      fromStop.id,
      toStop.id,
      samplesPerSegment,
    )
    for (const point of leg) pushPoint(point)
  }

  return points
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
): [number, number][] {
  if (imageWidth <= 0 || imageHeight <= 0) return []

  const nodeById = new Map(line.nodes.map((node) => [node.id, node]))
  const segments = line.segments ?? []
  if (segments.length === 0) return []

  const adjacency = buildRouteEditorSegmentAdjacency(segments)
  const endpointLinkCount = (nodeId: number) => (adjacency.get(nodeId)?.length ?? 0)

  const pickStartNodeId = (): number => {
    const sequenced = line.nodes
      .filter((node) => node.type === 'stop' && node.stopSeq != null && node.stopSeq > 0)
      .sort((a, b) => a.stopSeq! - b.stopSeq! || a.id - b.id)
    if (sequenced.length >= 1) return sequenced[0]!.id

    for (const node of line.nodes) {
      if (node.type !== 'stop') continue
      if (endpointLinkCount(node.id) === 1) return node.id
    }
    for (const node of line.nodes) {
      if (endpointLinkCount(node.id) === 1) return node.id
    }
    for (const node of line.nodes) {
      if (node.type === 'stop') return node.id
    }
    return segments[0]!.fromNodeId
  }

  const points: [number, number][] = []
  const pushPoint = (point: [number, number]) => {
    const last = points[points.length - 1]
    if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < 0.00001) return
    points.push(point)
  }

  const used = new Set<number>()
  let current = pickStartNodeId()
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

    sampleSegmentPoints(fromNode, toNode, imageWidth, imageHeight, samplesPerSegment, pushPoint)
    used.add(next.segment.id)
    previous = current
    current = next.nodeId
  }

  if (points.length >= 2) return points

  for (const segment of segments) {
    const from = nodeById.get(segment.fromNodeId)
    const to = nodeById.get(segment.toNodeId)
    if (!from || !to) continue
    sampleSegmentPoints(from, to, imageWidth, imageHeight, samplesPerSegment, pushPoint)
  }

  return points
}
