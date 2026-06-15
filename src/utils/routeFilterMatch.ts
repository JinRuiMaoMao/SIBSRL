import type { BusRoute, RouteFilters } from '../types/route'
import { routeMatchesTypeFilter } from './routeTypes'
import { matchesRouteSearchQuery } from './routeSearchQuery'

export function routeMatchesFilters(route: BusRoute, filters: RouteFilters): boolean {
  if (filters.zone !== 'all' && !route.zones.includes(filters.zone)) return false
  if (filters.operator !== 'all' && !route.operators.includes(filters.operator)) return false
  if (filters.type !== 'all' && !routeMatchesTypeFilter(route, filters.type)) return false
  return matchesRouteSearchQuery(route, filters.query)
}
