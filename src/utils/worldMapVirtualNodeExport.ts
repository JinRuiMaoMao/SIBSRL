import type { WorldMapPoint } from '../data/worldMapRoutes'
import { canonicalVirtualNodeRouteId } from './worldMapVirtualNodes'
import type { WorldMapVirtualNode, WorldMapVirtualNodeKind } from '../types/worldMapDraw'

export interface WorldMapVirtualNodeCatalogPayload {
  kind: 'world-map-virtual-node-catalog'
  note: string
  nodes: Array<{
    routeId: string
    kind: WorldMapVirtualNodeKind
    point: WorldMapPoint
  }>
}

function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function buildWorldMapVirtualNodeCatalogPayload(
  nodes: readonly WorldMapVirtualNode[],
): WorldMapVirtualNodeCatalogPayload | null {
  if (nodes.length < 1) return null
  return {
    kind: 'world-map-virtual-node-catalog',
    note:
      'Virtual path nodes on SIMapGerenal (north-up, normalized 0–1). Direction: ↑ straight north, ← left, → right. Surface: on-bridge/off-bridge/enter-tunnel/exit-tunnel snap to nearest bridge, road, or tunnel.',
    nodes: nodes.map((node) => ({
      routeId: canonicalVirtualNodeRouteId(node.routeId),
      kind: node.kind,
      point: [roundCoord(node.point[0]), roundCoord(node.point[1])] as WorldMapPoint,
    })),
  }
}

export function downloadWorldMapVirtualNodeCatalogJson(payload: WorldMapVirtualNodeCatalogPayload): void {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'world-map-virtual-nodes.json'
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function copyWorldMapVirtualNodeCatalogJson(
  payload: WorldMapVirtualNodeCatalogPayload,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(`${JSON.stringify(payload, null, 2)}\n`)
    return true
  } catch {
    return false
  }
}
