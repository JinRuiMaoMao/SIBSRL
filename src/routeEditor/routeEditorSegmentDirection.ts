import type { RouteEditorSegment } from './types'

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
