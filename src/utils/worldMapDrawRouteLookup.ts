import { routes } from '../data/routes'
import type { RouteStop } from '../types/route'
import { DISPLAY_ONLY_RENAMES, findDisplayRouteByQuery, mergeRoutesByBaseNumber } from './routeMerge'
import { findStopsMatchingQuery } from './routeStopLookup'

export function findBusRouteForDraw(routeQuery: string) {
  const displayRoutes = mergeRoutesByBaseNumber(routes)
  const query = routeQuery.trim()
  if (!query) return undefined

  const direct = findDisplayRouteByQuery(displayRoutes, query)
  if (direct) return direct

  const byDisplayNumber = displayRoutes.find((entry) => {
    const display = DISPLAY_ONLY_RENAMES[entry.id] ?? DISPLAY_ONLY_RENAMES[entry.number]
    return display === query
  })
  if (byDisplayNumber) return byDisplayNumber

  const knownAliases: Record<string, string> = { '21': '21A' }
  const aliasedId = knownAliases[query]
  if (aliasedId) {
    return displayRoutes.find((entry) => entry.id === aliasedId)
  }

  return undefined
}

export function getDrawRouteStops(routeQuery: string, directionIndex: number): readonly RouteStop[] {
  const route = findBusRouteForDraw(routeQuery)
  return route?.stops?.[directionIndex]?.list ?? route?.stops?.[0]?.list ?? []
}

export interface DrawStopSuggestion {
  zh: string
  en: string
  fromRouteDetail: boolean
}

function matchesStopQuery(query: string, zh: string, en: string): boolean {
  const raw = query.trim()
  if (!raw) return true
  const q = raw.toLowerCase()
  return zh.includes(raw) || en.toLowerCase().includes(q)
}

/** Prefer stop names from the route detail page when drawing a route. */
export function findDrawStopSuggestions(
  query: string,
  routeQuery: string,
  directionIndex: number,
  addedStopKeys: ReadonlySet<string>,
): DrawStopSuggestion[] {
  const routeStops = getDrawRouteStops(routeQuery, directionIndex)
  const routeSuggestions: DrawStopSuggestion[] = []

  for (const stop of routeStops) {
    const zh = stop.name.zh.trim()
    const en = (stop.name.en || stop.name.zh).trim()
    const key = `${zh}|${en}`
    if (addedStopKeys.has(key)) continue
    if (!matchesStopQuery(query, zh, en)) continue
    routeSuggestions.push({ zh, en, fromRouteDetail: true })
  }

  if (routeSuggestions.length > 0) {
    return routeSuggestions.slice(0, 8)
  }

  if (query.trim().length < 2) return []

  return findStopsMatchingQuery(query)
    .filter((stop) => !addedStopKeys.has(`${stop.zh}|${stop.en}`))
    .slice(0, 8)
    .map((stop) => ({ zh: stop.zh, en: stop.en, fromRouteDetail: false }))
}
