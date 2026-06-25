import type { BusRoute, RouteFilters } from '../types/route'
import { routeMatchesTypeFilter } from './routeTypes'
import { matchesRouteSearchQuery } from './routeSearchQuery'
import { parseStructuredSearchQuery } from './structuredSearchQuery'

export function routeMatchesFilters(route: BusRoute, filters: RouteFilters): boolean {
  const structured = parseStructuredSearchQuery(filters.query)

  const zone = structured.zone ?? (filters.zone !== 'all' ? filters.zone : 'all')
  if (zone !== 'all' && !route.zones.includes(zone)) return false

  const operator = structured.operator ?? filters.operator
  if (
    operator !== 'all' &&
    !route.operators.some((o) => o.toLowerCase() === operator.toLowerCase())
  ) {
    return false
  }

  const type = structured.type ?? filters.type
  if (type !== 'all' && !routeMatchesTypeFilter(route, type)) return false

  if (structured.category && route.category !== structured.category) return false

  for (const excluded of structured.excludeTypes) {
    if (routeMatchesTypeFilter(route, excluded)) return false
  }

  for (const excluded of structured.excludeCategories) {
    if (route.category === excluded) return false
  }

  for (const excludedZone of structured.excludeZones) {
    if (route.zones.includes(excludedZone)) return false
  }

  for (const excludedOperator of structured.excludeOperators) {
    if (
      route.operators.some((o) => o.toLowerCase() === excludedOperator.toLowerCase())
    ) {
      return false
    }
  }

  if (structured.level != null) {
    if (route.levelRequired !== structured.level) return false
  }

  return matchesRouteSearchQuery(route, structured.text)
}
