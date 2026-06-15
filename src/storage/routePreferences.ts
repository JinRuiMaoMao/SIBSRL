import type { RouteDisplayGroupKey } from '../data/routeDisplayGroups'
import type { RouteFilters, RouteTypeFilter } from '../types/route'
import { TYPE_FILTER_ORDER } from '../i18n/routeTypes'

export type RouteListGroupKey = RouteDisplayGroupKey | 'favorites' | 'recent'

export const FAVORITE_ROUTES_STORAGE_KEY = 'sibs-favorite-routes'
export const ROUTE_FILTERS_STORAGE_KEY = 'sibs-route-filters'
export const ROUTE_GROUP_OPEN_STORAGE_KEY = 'sibs-route-group-open'

const DEFAULT_GROUP_OPEN: Record<RouteListGroupKey, boolean> = {
  favorites: false,
  recent: false,
  normal: false,
  daily: false,
  seasonal: false,
}

const DEFAULT_SAVED_FILTERS: Pick<RouteFilters, 'zone' | 'operator' | 'type'> = {
  zone: 'all',
  operator: 'all',
  type: 'all',
}

function isRouteTypeFilter(value: unknown): value is RouteTypeFilter {
  return typeof value === 'string' && TYPE_FILTER_ORDER.includes(value as RouteTypeFilter)
}

export function readStoredFavoriteRouteIds(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITE_ROUTES_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(stored)) return []
    return stored.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  } catch {
    return []
  }
}

export function writeStoredFavoriteRouteIds(ids: string[]): void {
  try {
    localStorage.setItem(FAVORITE_ROUTES_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}

export function readStoredRouteFilters(): Pick<RouteFilters, 'zone' | 'operator' | 'type'> {
  try {
    const stored = JSON.parse(localStorage.getItem(ROUTE_FILTERS_STORAGE_KEY) ?? 'null')
    if (!stored || typeof stored !== 'object') return { ...DEFAULT_SAVED_FILTERS }

    const zone =
      stored.zone === 'all' || (typeof stored.zone === 'number' && Number.isFinite(stored.zone))
        ? stored.zone
        : 'all'
    const operator = typeof stored.operator === 'string' ? stored.operator : 'all'
    const type =
      stored.type === 'all' || isRouteTypeFilter(stored.type) ? stored.type : 'all'

    return { zone, operator, type }
  } catch {
    return { ...DEFAULT_SAVED_FILTERS }
  }
}

export function writeStoredRouteFilters(
  filters: Pick<RouteFilters, 'zone' | 'operator' | 'type'>,
): void {
  try {
    localStorage.setItem(
      ROUTE_FILTERS_STORAGE_KEY,
      JSON.stringify({
        zone: filters.zone,
        operator: filters.operator,
        type: filters.type,
      }),
    )
  } catch {
    /* ignore */
  }
}

export function readStoredRouteGroupOpen(): Record<RouteListGroupKey, boolean> {
  try {
    const stored = JSON.parse(localStorage.getItem(ROUTE_GROUP_OPEN_STORAGE_KEY) ?? 'null')
    if (!stored || typeof stored !== 'object') return { ...DEFAULT_GROUP_OPEN }
    return {
      favorites: Boolean(stored.favorites),
      recent: Boolean(stored.recent),
      normal: Boolean(stored.normal),
      daily: Boolean(stored.daily),
      seasonal: Boolean(stored.seasonal),
    }
  } catch {
    return { ...DEFAULT_GROUP_OPEN }
  }
}

export function writeStoredRouteGroupOpen(groupOpen: Record<RouteListGroupKey, boolean>): void {
  try {
    localStorage.setItem(ROUTE_GROUP_OPEN_STORAGE_KEY, JSON.stringify(groupOpen))
  } catch {
    /* ignore */
  }
}

export function defaultClosedRouteGroups(): Record<RouteListGroupKey, boolean> {
  return { ...DEFAULT_GROUP_OPEN }
}
