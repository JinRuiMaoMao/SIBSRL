import type { WorldMapPoint } from '../data/worldMapRoutes'
import { resolveWorldMapRouteId } from '../data/worldMapRoutes'
import type { WorldMapDrawStop } from '../types/worldMapDraw'

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
  }>
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

export function buildWorldMapRouteExportPayload(
  routeId: string,
  directionIndex: number,
  points: readonly WorldMapPoint[],
  stops: readonly WorldMapDrawStop[] = [],
): WorldMapRouteExportPayload | null {
  const trimmedRouteId = routeId.trim()
  if (!trimmedRouteId || points.length < 2) return null

  const canonicalId = resolveWorldMapRouteId(trimmedRouteId) ?? trimmedRouteId

  return {
    routeId: canonicalId,
    note: 'Drawn in SIBS Route Lookup map editor; coordinates are normalized (0–1) on SIMap.png.',
    directions: [
      {
        directionIndex,
        points: points.map(([x, y]) => [roundCoord(x), roundCoord(y)] as WorldMapPoint),
        stops:
          stops.length > 0
            ? stops.map((stop) => ({
                name: { zh: stop.name.zh, en: stop.name.en },
                point: [roundCoord(stop.point[0]), roundCoord(stop.point[1])] as WorldMapPoint,
              }))
            : undefined,
      },
    ],
  }
}

function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000
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
