import type { RouteEditorNode, RouteEditorSegment } from './types'

export interface RouteEditorSegmentOverlapGroup {
  key: string
  count: number
  midX: number
  midY: number
}

export function undirectedSegmentPairKey(fromNodeId: number, toNodeId: number): string {
  return fromNodeId < toNodeId ? `${fromNodeId}|${toNodeId}` : `${toNodeId}|${fromNodeId}`
}

/** Groups segments between the same two nodes (A↔B stacks A→B and B→A). */
export function buildRouteEditorSegmentOverlapGroups(
  segments: readonly RouteEditorSegment[],
  nodeById: ReadonlyMap<number, RouteEditorNode>,
): RouteEditorSegmentOverlapGroup[] {
  const groups = new Map<string, RouteEditorSegmentOverlapGroup>()

  for (const segment of segments) {
    const from = nodeById.get(segment.fromNodeId)
    const to = nodeById.get(segment.toNodeId)
    if (!from || !to) continue

    const key = undirectedSegmentPairKey(segment.fromNodeId, segment.toNodeId)
    const existing = groups.get(key)
    if (existing) {
      existing.count += 1
      continue
    }

    groups.set(key, {
      key,
      count: 1,
      midX: (from.x + to.x) / 2,
      midY: (from.y + to.y) / 2,
    })
  }

  return [...groups.values()].filter((group) => group.count > 1)
}
