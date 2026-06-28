import type { WorldMapPoint } from '../data/worldMapRoutes'
import { resolveWorldMapRouteId } from '../data/worldMapRoutes'

export interface WorldMapRouteExportPayload {
  routeId: string
  note: string
  directions: Array<{
    directionIndex: number
    points: WorldMapPoint[]
  }>
}

export function buildWorldMapRouteExportPayload(
  routeId: string,
  directionIndex: number,
  points: readonly WorldMapPoint[],
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
      },
    ],
  }
}

function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000
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

export async function copyWorldMapRouteJson(payload: WorldMapRouteExportPayload): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(`${JSON.stringify(payload, null, 2)}\n`)
    return true
  } catch {
    return false
  }
}
