import type { RouteEditorNode, RouteEditorSegment } from './types'

/** Node pairs with both A→B and B→A drawn (dual carriageway). */
export function buildRouteEditorDualCarriagewayPairs(
  segments: readonly RouteEditorSegment[],
): Set<string> {
  const forwardKeys = new Set(
    segments.map((segment) => `${segment.fromNodeId}:${segment.toNodeId}`),
  )
  const pairs = new Set<string>()
  for (const segment of segments) {
    if (forwardKeys.has(`${segment.toNodeId}:${segment.fromNodeId}`)) {
      const low = Math.min(segment.fromNodeId, segment.toNodeId)
      const high = Math.max(segment.fromNodeId, segment.toNodeId)
      pairs.add(`${low}:${high}`)
    }
  }
  return pairs
}

export function hasDirectedRouteEditorSegment(
  segments: readonly RouteEditorSegment[],
  fromNodeId: number,
  toNodeId: number,
): boolean {
  return segments.some(
    (segment) => segment.fromNodeId === fromNodeId && segment.toNodeId === toNodeId,
  )
}

export function isDirectedRouteEditorNodePath(
  segments: readonly RouteEditorSegment[],
  nodePath: readonly number[],
): boolean {
  for (let index = 0; index < nodePath.length - 1; index += 1) {
    if (!hasDirectedRouteEditorSegment(segments, nodePath[index]!, nodePath[index + 1]!)) {
      return false
    }
  }
  return nodePath.length >= 1
}

/** Triangle polygon points (tip forward) centered on the segment midpoint. */
export function segmentDirectionArrowPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size: number,
): string {
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const half = size * 0.55
  const wing = size * 0.42
  const tipX = midX + Math.cos(angle) * half
  const tipY = midY + Math.sin(angle) * half
  const baseX = midX - Math.cos(angle) * half
  const baseY = midY - Math.sin(angle) * half
  const leftX = baseX + Math.cos(angle + Math.PI / 2) * wing
  const leftY = baseY + Math.sin(angle + Math.PI / 2) * wing
  const rightX = baseX + Math.cos(angle - Math.PI / 2) * wing
  const rightY = baseY + Math.sin(angle - Math.PI / 2) * wing
  return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`
}

export interface RouteEditorDisplayPolyline {
  d: string
  segmentIds: readonly number[]
}

/** Merge segments that meet at shared nodes into continuous SVG paths (viewer display). */
export function buildRouteEditorDisplayPolylines(
  segments: readonly RouteEditorSegment[],
  nodeById: ReadonlyMap<number, RouteEditorNode>,
): RouteEditorDisplayPolyline[] {
  if (segments.length === 0) return []

  const remaining = new Map(segments.map((segment) => [segment.id, segment]))
  const polylines: RouteEditorDisplayPolyline[] = []

  const nodePoint = (nodeId: number): [number, number] | null => {
    const node = nodeById.get(nodeId)
    return node ? [node.x, node.y] : null
  }

  while (remaining.size > 0) {
    const start = remaining.values().next().value as RouteEditorSegment
    remaining.delete(start.id)

    const startFrom = nodePoint(start.fromNodeId)
    const startTo = nodePoint(start.toNodeId)
    if (!startFrom || !startTo) continue

    const points: [number, number][] = [startFrom, startTo]
    const segmentIds: number[] = [start.id]
    let headNode = start.fromNodeId
    let tailNode = start.toNodeId

    let headInnerNode: number | null = null
    let tailInnerNode: number | null = start.fromNodeId

    const extendFrom = (nodeId: number, atFront: boolean) => {
      while (true) {
        let nextSegment: RouteEditorSegment | null = null
        let nextNodeId: number | null = null
        const neighborNodeId = atFront ? headInnerNode : tailInnerNode

        for (const segment of remaining.values()) {
          if (segment.fromNodeId === nodeId) {
            if (segment.toNodeId === neighborNodeId) continue
            nextSegment = segment
            nextNodeId = segment.toNodeId
            break
          }
          if (segment.toNodeId === nodeId) {
            if (segment.fromNodeId === neighborNodeId) continue
            nextSegment = segment
            nextNodeId = segment.fromNodeId
            break
          }
        }

        if (!nextSegment || nextNodeId == null) break

        remaining.delete(nextSegment.id)
        segmentIds[atFront ? 'unshift' : 'push'](nextSegment.id)
        const nextPoint = nodePoint(nextNodeId)
        if (!nextPoint) break
        if (atFront) {
          points.unshift(nextPoint)
          headInnerNode = headNode
          headNode = nextNodeId
          nodeId = headNode
        } else {
          points.push(nextPoint)
          tailInnerNode = tailNode
          tailNode = nextNodeId
          nodeId = tailNode
        }
      }
    }

    extendFrom(tailNode, false)
    extendFrom(headNode, true)

    if (points.length < 2) continue

    const d = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`)
      .join(' ')
    polylines.push({ d, segmentIds })
  }

  return polylines
}
