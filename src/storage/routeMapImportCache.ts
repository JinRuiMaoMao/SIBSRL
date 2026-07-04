import { resolveRouteMapLookupIds } from '../utils/routeMapLookup'

const STORAGE_PREFIX = 'sibs-route-map-import:'

function storageKey(routeId: string): string {
  return `${STORAGE_PREFIX}${routeId.trim()}`
}

export function readCachedRouteMapImport(routeId: string): unknown | null {
  for (const id of resolveRouteMapLookupIds(routeId)) {
    try {
      const raw = localStorage.getItem(storageKey(id))
      if (!raw) continue
      return JSON.parse(raw) as unknown
    } catch {
      // ignore corrupt cache
    }
  }
  return null
}

export function writeCachedRouteMapImport(routeId: string, payload: unknown): void {
  try {
    localStorage.setItem(storageKey(routeId.trim()), JSON.stringify(payload))
  } catch {
    // quota / private mode
  }
}

export function clearCachedRouteMapImport(routeId: string): void {
  for (const id of resolveRouteMapLookupIds(routeId)) {
    try {
      localStorage.removeItem(storageKey(id))
    } catch {
      // ignore
    }
  }
}
