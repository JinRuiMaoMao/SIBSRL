import { resolveWorldMapRouteId, type WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapVirtualNode } from '../types/worldMapDraw'

const JUNCTION_EPSILON = 0.00008

export function canonicalVirtualNodeRouteId(routeId: string): string {
  const trimmed = routeId.trim()
  return resolveWorldMapRouteId(trimmed) ?? trimmed
}

export function virtualNodeAppliesToRoute(nodeRouteId: string, currentRouteId: string): boolean {
  const node = canonicalVirtualNodeRouteId(nodeRouteId)
  const current = canonicalVirtualNodeRouteId(currentRouteId)
  if (!node || !current) return false
  return node === current
}

export function orderedVirtualNodesForRoute(
  nodes: readonly WorldMapVirtualNode[],
  routeId: string,
): WorldMapVirtualNode[] {
  return nodes
    .filter((node) => virtualNodeAppliesToRoute(node.routeId, routeId))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

export function nextVirtualNodeOrder(
  nodes: readonly WorldMapVirtualNode[],
  routeId: string,
): number {
  const routeNodes = orderedVirtualNodesForRoute(nodes, routeId)
  if (routeNodes.length === 0) return 0
  return routeNodes[routeNodes.length - 1]!.order + 1
}

function projectionT(from: WorldMapPoint, to: WorldMapPoint, point: WorldMapPoint): number {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const lenSq = dx * dx + dy * dy
  if (lenSq <= 1e-12) return 0
  return ((point[0] - from[0]) * dx + (point[1] - from[1]) * dy) / lenSq
}

export function pointsNear(a: WorldMapPoint, b: WorldMapPoint, epsilon = JUNCTION_EPSILON): boolean {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) <= epsilon
}

/** Whether the next ordered virtual node lies ahead on the leg toward the next stop. */
export function shouldVisitVirtualNodeBeforeStop(
  node: WorldMapVirtualNode,
  from: WorldMapPoint,
  to: WorldMapPoint,
): boolean {
  const t = projectionT(from, to, node.point)
  if (t <= 0.01) return false
  if (t >= 0.99) return false
  const distToNode = Math.hypot(node.point[0] - from[0], node.point[1] - from[1])
  const distToStop = Math.hypot(to[0] - from[0], to[1] - from[1])
  return distToNode <= distToStop * 1.2
}

/** Consecutive virtual nodes at the same junction share one map location but keep separate order values. */
export function collectJunctionVirtualNodeChain(
  orderedNodes: readonly WorldMapVirtualNode[],
  startIndex: number,
): { chain: WorldMapVirtualNode[]; nextIndex: number } {
  const first = orderedNodes[startIndex]
  if (!first) return { chain: [], nextIndex: startIndex }

  const chain = [first]
  let index = startIndex + 1
  while (index < orderedNodes.length && pointsNear(orderedNodes[index]!.point, first.point)) {
    chain.push(orderedNodes[index]!)
    index += 1
  }
  return { chain, nextIndex: index }
}

export function buildLegAnchorPoints(
  from: WorldMapPoint,
  to: WorldMapPoint,
  nodes: readonly WorldMapVirtualNode[],
  routeId: string,
): WorldMapPoint[] {
  const ordered = orderedVirtualNodesForRoute(nodes, routeId)
  const anchors: WorldMapPoint[] = [from]
  for (const node of ordered) {
    if (shouldVisitVirtualNodeBeforeStop(node, from, to)) {
      anchors.push(node.point)
    }
  }
  anchors.push(to)
  return anchors
}
