import { resolveWorldMapRouteId, type WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapVirtualNode } from '../types/worldMapDraw'

const JUNCTION_EPSILON = 0.00008
const NEXT_LEG_CLOSER_RATIO = 0.92

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

function dist(a: WorldMapPoint, b: WorldMapPoint): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

export function pointsNear(a: WorldMapPoint, b: WorldMapPoint, epsilon = JUNCTION_EPSILON): boolean {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) <= epsilon
}

export type RoutePathTarget =
  | { kind: 'virtual-node'; node: WorldMapVirtualNode }
  | { kind: 'stop'; point: WorldMapPoint }

/**
 * Pick the next travel target: list's next virtual node, or the next route-detail stop.
 * Ignores road junctions — only list order and stop sequence matter.
 */
export function pickNextRoutePathTarget(
  orderedVNs: readonly WorldMapVirtualNode[],
  vnIndex: number,
  stops: readonly { point: WorldMapPoint }[],
  stopIndex: number,
): RoutePathTarget | null {
  const nextNode = orderedVNs[vnIndex]
  const nextStop = stops[stopIndex]
  const nextLegEnd = stops[stopIndex + 1]?.point

  if (nextNode && nextStop) {
    if (!shouldDeferVirtualNodeToNextLeg(nextNode, nextStop.point, nextLegEnd)) {
      return { kind: 'virtual-node', node: nextNode }
    }
    return { kind: 'stop', point: nextStop.point }
  }

  if (nextNode) return { kind: 'virtual-node', node: nextNode }
  if (nextStop) return { kind: 'stop', point: nextStop.point }
  return null
}

/**
 * Multi-stop routes only: defer when the next list node clearly belongs to a later leg.
 * Does not inspect road junctions — only list order and stop positions.
 */
export function shouldDeferVirtualNodeToNextLeg(
  node: WorldMapVirtualNode,
  legEnd: WorldMapPoint,
  nextLegEnd: WorldMapPoint | undefined,
): boolean {
  if (!nextLegEnd) return false
  const toLegEnd = dist(node.point, legEnd)
  const toNextLeg = dist(node.point, nextLegEnd)
  return toNextLeg < toLegEnd * NEXT_LEG_CLOSER_RATIO
}

/** @deprecated Use sequential next-node hops in rebuildDraftPathFromStops instead. */
export function collectVirtualNodesForLeg(
  orderedNodes: readonly WorldMapVirtualNode[],
  startIndex: number,
  legEnd: WorldMapPoint,
  nextLegEnd: WorldMapPoint | undefined,
): { nodes: WorldMapVirtualNode[]; nextIndex: number } {
  const nodes: WorldMapVirtualNode[] = []
  let index = startIndex
  while (index < orderedNodes.length) {
    const node = orderedNodes[index]!
    if (shouldDeferVirtualNodeToNextLeg(node, legEnd, nextLegEnd)) break
    nodes.push(node)
    index += 1
  }
  return { nodes, nextIndex: index }
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
