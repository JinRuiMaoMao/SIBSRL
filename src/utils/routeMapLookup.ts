import { ROUTE_MAP_ROUTE_ALIASES } from '../data/routeMapsManifest'
import type { BusRoute } from '../types/route'

/** Candidate route ids to try when loading stored/API route maps. */
export function resolveRouteMapLookupIds(routeId: string): string[] {
  const trimmed = routeId.trim()
  if (!trimmed) return []

  const ids = new Set<string>()
  ids.add(trimmed)

  const alias = ROUTE_MAP_ROUTE_ALIASES[trimmed]
  if (alias) ids.add(alias)

  for (const [from, to] of Object.entries(ROUTE_MAP_ROUTE_ALIASES)) {
    if (to === trimmed) ids.add(from)
  }

  return [...ids]
}

export function routeMapIdsMatch(left: string, right: string): boolean {
  const a = left.trim()
  const b = right.trim()
  if (!a || !b) return false
  if (a === b) return true
  return resolveRouteMapLookupIds(a).includes(b) || resolveRouteMapLookupIds(b).includes(a)
}

/** Resolve a published route record from a route-map URL id (e.g. 21 → 21A). */
export function findRouteForMapPage(routeId: string, routesList: readonly BusRoute[]): BusRoute | undefined {
  for (const id of resolveRouteMapLookupIds(routeId)) {
    const match = routesList.find((route) => route.id === id)
    if (match) return match
  }
  return undefined
}
