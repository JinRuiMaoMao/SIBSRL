import type { GroupedRouteDisplaySlot } from '../data/routeDisplayGroups'
import { lockedCardDisplayNumber } from '../data/routeShiftUnlocks'
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

/** 锁定区：仅按编号/起终点等文本过滤；zone/operator/type 仍不影响锁定列表。 */
export function lockedDisplaySlotMatchesSearchQuery(
  slot: GroupedRouteDisplaySlot,
  filters: RouteFilters,
): boolean {
  if (!slot.entry) return false

  const text = parseStructuredSearchQuery(filters.query).text.trim()
  if (!text) return true

  const { route, listedId, directionKey } = slot.entry
  if (matchesRouteSearchQuery(route, text)) return true

  const textLower = text.toLowerCase()
  const listedLower = listedId.toLowerCase()
  if (listedLower.includes(textLower)) return true

  const listedRouteId = listedLower.split('|')[0] ?? listedLower
  if (listedRouteId.startsWith(textLower) || textLower.startsWith(listedRouteId)) return true

  const displayNumber = lockedCardDisplayNumber(route, listedId, directionKey)
  if (displayNumber?.toLowerCase().includes(textLower)) return true

  const directionQuery = text.match(/^(.+)([nsew])$/i)
  if (directionQuery) {
    const base = directionQuery[1]!.trim()
    const dir = directionQuery[2]!.toUpperCase()
    if (!base) return false
    const routeMatches = matchesRouteSearchQuery(route, base)
    const dirMatches =
      directionKey?.toUpperCase() === dir ||
      listedLower.endsWith(`|${dir.toLowerCase()}`) ||
      listedLower.endsWith(dir.toLowerCase())
    if (routeMatches && dirMatches) return true
  }

  return false
}

export function filterLockedDisplaySlotsBySearchQuery(
  slots: readonly GroupedRouteDisplaySlot[],
  filters: RouteFilters,
): GroupedRouteDisplaySlot[] {
  const text = parseStructuredSearchQuery(filters.query).text.trim()
  if (!text) return [...slots]
  return slots.filter((slot) => lockedDisplaySlotMatchesSearchQuery(slot, filters))
}
