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
