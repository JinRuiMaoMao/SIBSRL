import type { IslandMapRouteOverlay } from '../contexts/IslandMapOverlayContext'
import type { WorldMapPoint } from '../data/worldMapRoutes'

const STORAGE_KEY = 'sibs-map-draw-route-handoff'

function isWorldMapPoint(value: unknown): value is WorldMapPoint {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1])
  )
}

function parseHandoff(value: unknown): IslandMapRouteOverlay | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (typeof record.routeId !== 'string' || !record.routeId.trim()) return null
  if (typeof record.routeNumber !== 'string' || !record.routeNumber.trim()) return null
  if (typeof record.directionIndex !== 'number' || !Number.isFinite(record.directionIndex)) return null
  if (!Array.isArray(record.points) || record.points.length < 1) return null
  if (!record.points.every(isWorldMapPoint)) return null
  return {
    routeId: record.routeId.trim(),
    routeNumber: record.routeNumber.trim(),
    directionIndex: Math.round(record.directionIndex),
    points: record.points as WorldMapPoint[],
  }
}

export function stashMapDrawRouteHandoff(overlay: IslandMapRouteOverlay): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(overlay))
  } catch {
    // ignore quota / private mode
  }
}

export function consumeMapDrawRouteHandoff(): IslandMapRouteOverlay | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    if (!raw) return null
    return parseHandoff(JSON.parse(raw))
  } catch {
    return null
  }
}
