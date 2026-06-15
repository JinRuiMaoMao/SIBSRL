import type { BusRoute } from '../types/route'
import { mergeRoutesByBaseNumber } from './routeMerge'
import { routes } from '../data/routes'

export interface MatchedStop {
  zh: string
  en: string
}

let stopIndex: Map<string, { stop: MatchedStop; routeIds: Set<string> }> | null = null

function stopKey(zh: string, en: string): string {
  return `${zh.trim().toLowerCase()}|${en.trim().toLowerCase()}`
}

function buildStopIndex(): Map<string, { stop: MatchedStop; routeIds: Set<string> }> {
  const map = new Map<string, { stop: MatchedStop; routeIds: Set<string> }>()
  const displayRoutes = mergeRoutesByBaseNumber(routes)

  for (const route of displayRoutes) {
    for (const direction of route.stops ?? []) {
      for (const stop of direction.list) {
        const key = stopKey(stop.name.zh, stop.name.en)
        const existing = map.get(key)
        if (existing) {
          existing.routeIds.add(route.id)
          continue
        }
        map.set(key, {
          stop: { zh: stop.name.zh, en: stop.name.en },
          routeIds: new Set([route.id]),
        })
      }
    }
  }

  return map
}

function getStopIndex() {
  if (!stopIndex) stopIndex = buildStopIndex()
  return stopIndex
}

export function findStopsMatchingQuery(query: string): MatchedStop[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []

  const matches: MatchedStop[] = []
  const seen = new Set<string>()

  for (const { stop } of getStopIndex().values()) {
    const key = stopKey(stop.zh, stop.en)
    if (seen.has(key)) continue
    if (stop.zh.toLowerCase().includes(q) || stop.en.toLowerCase().includes(q)) {
      seen.add(key)
      matches.push(stop)
    }
  }

  return matches.sort((a, b) => a.zh.localeCompare(b.zh, 'zh-Hans'))
}

export function findRoutesPassingStop(stop: MatchedStop, displayRoutes: BusRoute[]): BusRoute[] {
  const key = stopKey(stop.zh, stop.en)
  const routeIds = getStopIndex().get(key)?.routeIds
  if (!routeIds) return []

  const byId = new Map(displayRoutes.map((route) => [route.id, route]))
  return [...routeIds]
    .map((id) => byId.get(id))
    .filter((route): route is BusRoute => route != null)
}

export function routePassesStopQuery(route: BusRoute, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false

  return (
    route.stops?.some((direction) =>
      direction.list.some(
        (stop) =>
          stop.name.zh.toLowerCase().includes(q) || stop.name.en.toLowerCase().includes(q),
      ),
    ) ?? false
  )
}
