import type { WorldMapPoint } from '../data/worldMapRoutes'
import { resolveWorldMapRouteId } from '../data/worldMapRoutes'
import type { WorldMapDrawStop, WorldMapVirtualNode } from '../types/worldMapDraw'
import { canonicalVirtualNodeRouteId } from './worldMapVirtualNodes'

export interface WorldMapStopsExportPayload {
  routeId: string
  note: string
  directions: Array<{
    directionIndex: number
    stops: Array<{
      name: { zh: string; en: string }
      point: WorldMapPoint
    }>
  }>
}

export interface WorldMapCatalogStopsExportPayload {
  kind: 'world-map-stop-catalog'
  note: string
  stops: Array<{
    name: { zh: string; en: string }
    point: WorldMapPoint
  }>
}

export interface WorldMapRouteExportPayload {
  routeId: string
  note: string
  directions: Array<{
    directionIndex: number
    points: WorldMapPoint[]
    stops?: Array<{
      name: { zh: string; en: string }
      point: WorldMapPoint
    }>
    virtualNodes?: Array<{
      order: number
      routeId: string
      kind: WorldMapVirtualNode['kind']
      point: WorldMapPoint
    }>
  }>
}

export function buildWorldMapCatalogStopsExportPayload(
  stops: readonly WorldMapDrawStop[],
): WorldMapCatalogStopsExportPayload | null {
  if (stops.length < 1) return null

  return {
    kind: 'world-map-stop-catalog',
    note:
      'All-stop catalog on SIMap (normalized 0–1). Routes can be traced later by matching route stop names to these points.',
    stops: stops.map((stop) => ({
      name: { zh: stop.name.zh, en: stop.name.en },
      point: [roundCoord(stop.point[0]), roundCoord(stop.point[1])] as WorldMapPoint,
    })),
  }
}

export function buildWorldMapStopsExportPayload(
  routeId: string,
  directionIndex: number,
  stops: readonly WorldMapDrawStop[],
): WorldMapStopsExportPayload | null {
  const trimmedRouteId = routeId.trim()
  if (!trimmedRouteId || stops.length < 2) return null

  const canonicalId = resolveWorldMapRouteId(trimmedRouteId) ?? trimmedRouteId

  return {
    routeId: canonicalId,
    note:
      'Stops only (normalized 0–1 on SIMap). Path will be traced in stop order along roads (#ffffff), bridges (#fece7a), and tunnels (#d33682).',
    directions: [
      {
        directionIndex,
        stops: stops.map((stop) => ({
          name: { zh: stop.name.zh, en: stop.name.en },
          point: [roundCoord(stop.point[0]), roundCoord(stop.point[1])] as WorldMapPoint,
        })),
      },
    ],
  }
}

function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000
}

/** Route ID for export: form field, then virtual nodes, then map overlay. */
export function resolveWorldMapExportRouteId(
  routeId: string,
  virtualNodes: readonly WorldMapVirtualNode[],
  fallbackRouteId?: string,
): string {
  const trimmed = routeId.trim()
  if (trimmed) return resolveWorldMapRouteId(trimmed) ?? trimmed
  for (const node of virtualNodes) {
    const fromNode = node.routeId.trim()
    if (fromNode) return resolveWorldMapRouteId(fromNode) ?? fromNode
  }
  const fallback = fallbackRouteId?.trim()
  if (fallback) return resolveWorldMapRouteId(fallback) ?? fallback
  return ''
}

export function buildWorldMapRouteExportPayload(
  routeId: string,
  directionIndex: number,
  points: readonly WorldMapPoint[],
  stops: readonly WorldMapDrawStop[] = [],
  virtualNodes: readonly WorldMapVirtualNode[] = [],
  fallbackRouteId?: string,
): WorldMapRouteExportPayload | null {
  const canonicalId = resolveWorldMapExportRouteId(routeId, virtualNodes, fallbackRouteId)
  const hasPath = points.length >= 2
  if (!canonicalId || (!hasPath && stops.length === 0 && virtualNodes.length === 0)) return null

  return {
    routeId: canonicalId,
    note:
      'Route on SIMapGerenal (normalized 0–1): path points, stops, and virtual nodes in one file. Virtual nodes follow order field along the route.',
    directions: [
      {
        directionIndex,
        points: hasPath ? points.map(([x, y]) => [roundCoord(x), roundCoord(y)] as WorldMapPoint) : [],
        stops: stops.map((stop) => ({
          name: { zh: stop.name.zh, en: stop.name.en },
          point: [roundCoord(stop.point[0]), roundCoord(stop.point[1])] as WorldMapPoint,
        })),
        virtualNodes: [...virtualNodes]
          .sort((a, b) => a.order - b.order)
          .map((node) => ({
            order: node.order,
            routeId: canonicalVirtualNodeRouteId(node.routeId),
            kind: node.kind,
            point: [roundCoord(node.point[0]), roundCoord(node.point[1])] as WorldMapPoint,
          })),
      },
    ],
  }
}

export function downloadWorldMapCatalogStopsJson(payload: WorldMapCatalogStopsExportPayload): void {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'world-map-stops.json'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadWorldMapStopsJson(payload: WorldMapStopsExportPayload): void {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${payload.routeId}-stops.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadWorldMapRouteJson(payload: WorldMapRouteExportPayload): void {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${payload.routeId}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function copyWorldMapCatalogStopsJson(
  payload: WorldMapCatalogStopsExportPayload,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(`${JSON.stringify(payload, null, 2)}\n`)
    return true
  } catch {
    return false
  }
}

export async function copyWorldMapStopsJson(payload: WorldMapStopsExportPayload): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(`${JSON.stringify(payload, null, 2)}\n`)
    return true
  } catch {
    return false
  }
}

export async function copyWorldMapRouteJson(payload: WorldMapRouteExportPayload): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(`${JSON.stringify(payload, null, 2)}\n`)
    return true
  } catch {
    return false
  }
}
