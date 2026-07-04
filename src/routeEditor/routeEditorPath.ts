import type { RouteEditorNode } from './types'

/** 参考 route-editor-main.js updateRouteCornerRadius */
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

/** 沿节点顺序采样导出用折线（归一化坐标） */
export function sampleRouteEditorPathPoints(
  nodes: readonly RouteEditorNode[],
  imageWidth: number,
  imageHeight: number,
  showPointLines = false,
  samplesPerSegment = 8,
): [number, number][] {
  if (nodes.length < 2 || imageWidth <= 0 || imageHeight <= 0) return []
  const pathD = buildRouteEditorPathD(nodes, showPointLines)
  if (!pathD) return []

  const ordered = nodes.map(
    (node) => [node.x / imageWidth, node.y / imageHeight] as [number, number],
  )
  if (ordered.length <= 2 || samplesPerSegment <= 1) return ordered

  const points: [number, number][] = [ordered[0]!]
  for (let i = 0; i < ordered.length - 1; i += 1) {
    const a = ordered[i]!
    const b = ordered[i + 1]!
    for (let step = 1; step < samplesPerSegment; step += 1) {
      const t = step / samplesPerSegment
      points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
    points.push(b)
  }
  return points
}
