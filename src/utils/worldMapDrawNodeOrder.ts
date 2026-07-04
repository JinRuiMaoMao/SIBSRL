import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawPathNode, WorldMapDrawStop, WorldMapOrderedNodeRef } from '../types/worldMapDraw'

export function resolveOrderedNodePoint(
  ref: WorldMapOrderedNodeRef,
  stops: readonly WorldMapDrawStop[],
  pathNodes: readonly WorldMapDrawPathNode[],
): WorldMapPoint | null {
  if (ref.kind === 'stop') {
    return stops.find((stop) => stop.id === ref.id)?.point ?? null
  }
  return pathNodes.find((node) => node.id === ref.id)?.point ?? null
}

/** 按节点顺序生成直线路径（参考 Downloads/index 编辑器）。 */
export function rebuildPathFromNodeOrder(
  order: readonly WorldMapOrderedNodeRef[],
  stops: readonly WorldMapDrawStop[],
  pathNodes: readonly WorldMapDrawPathNode[],
): {
  points: WorldMapPoint[]
  legStarts: number[]
  legHidden: boolean[]
  userBends: boolean[]
  legControls: (WorldMapPoint | null)[]
} {
  const points: WorldMapPoint[] = []
  const userBends: boolean[] = []

  for (const ref of order) {
    const point = resolveOrderedNodePoint(ref, stops, pathNodes)
    if (!point) continue
    const prev = points[points.length - 1]
    if (prev && Math.hypot(prev[0] - point[0], prev[1] - point[1]) <= 0.00005) {
      continue
    }
    points.push([point[0], point[1]])
    userBends.push(ref.kind === 'path-node')
  }

  return {
    points,
    legStarts: [0],
    legHidden: [],
    userBends,
    legControls: [],
  }
}

/** 从现有站点/拐点推断顺序（导入或旧草稿）。 */
export function inferNodeOrderFromDraft(
  stops: readonly WorldMapDrawStop[],
  pathNodes: readonly WorldMapDrawPathNode[],
  pathPoints: readonly WorldMapPoint[],
): WorldMapOrderedNodeRef[] {
  if (pathPoints.length >= 2) {
    const order: WorldMapOrderedNodeRef[] = []
    const usedStops = new Set<string>()
    const usedNodes = new Set<string>()

    for (const point of pathPoints) {
      const stop = stops.find(
        (entry) =>
          !usedStops.has(entry.id) &&
          Math.hypot(entry.point[0] - point[0], entry.point[1] - point[1]) < 0.002,
      )
      if (stop) {
        order.push({ kind: 'stop', id: stop.id })
        usedStops.add(stop.id)
        continue
      }
      const node = pathNodes.find(
        (entry) =>
          !usedNodes.has(entry.id) &&
          Math.hypot(entry.point[0] - point[0], entry.point[1] - point[1]) < 0.002,
      )
      if (node) {
        order.push({ kind: 'path-node', id: node.id })
        usedNodes.add(node.id)
      }
    }

    for (const stop of stops) {
      if (!usedStops.has(stop.id)) order.push({ kind: 'stop', id: stop.id })
    }
    for (const node of pathNodes) {
      if (!usedNodes.has(node.id)) order.push({ kind: 'path-node', id: node.id })
    }
    return order
  }

  return [
    ...stops.map((stop) => ({ kind: 'stop' as const, id: stop.id })),
    ...pathNodes.map((node) => ({ kind: 'path-node' as const, id: node.id })),
  ]
}

export function removeNodeFromOrder(
  order: readonly WorldMapOrderedNodeRef[],
  ref: WorldMapOrderedNodeRef,
): WorldMapOrderedNodeRef[] {
  return order.filter((entry) => !(entry.kind === ref.kind && entry.id === ref.id))
}
