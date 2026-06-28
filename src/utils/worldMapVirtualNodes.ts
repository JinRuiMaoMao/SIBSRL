import { resolveWorldMapRouteId, type WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapVirtualNode } from '../types/worldMapDraw'

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

function projectionT(from: WorldMapPoint, to: WorldMapPoint, point: WorldMapPoint): number {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const lenSq = dx * dx + dy * dy
  if (lenSq <= 1e-12) return 0
  return ((point[0] - from[0]) * dx + (point[1] - from[1]) * dy) / lenSq
}

function distanceToSegment(from: WorldMapPoint, to: WorldMapPoint, point: WorldMapPoint): number {
  const t = Math.max(0, Math.min(1, projectionT(from, to, point)))
  const px = from[0] + (to[0] - from[0]) * t
  const py = from[1] + (to[1] - from[1]) * t
  return Math.hypot(point[0] - px, point[1] - py)
}

export function virtualNodesOnLeg(
  from: WorldMapPoint,
  to: WorldMapPoint,
  nodes: readonly WorldMapVirtualNode[],
  routeId: string,
  corridor = 0.035,
): WorldMapVirtualNode[] {
  return nodes
    .filter((node) => virtualNodeAppliesToRoute(node.routeId, routeId))
    .filter((node) => {
      const t = projectionT(from, to, node.point)
      if (t <= 0.04 || t >= 0.96) return false
      return distanceToSegment(from, to, node.point) <= corridor
    })
    .sort((a, b) => projectionT(from, to, a.point) - projectionT(from, to, b.point))
}

export function buildLegAnchorPoints(
  from: WorldMapPoint,
  to: WorldMapPoint,
  nodes: readonly WorldMapVirtualNode[],
  routeId: string,
): WorldMapPoint[] {
  const via = virtualNodesOnLeg(from, to, nodes, routeId)
  return [from, ...via.map((node) => node.point), to]
}
