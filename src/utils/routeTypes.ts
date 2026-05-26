import { ROUTE_SERVICE_TYPE_ORDER } from '../data/routeServiceTypes.generated'
import type { BusRoute, RouteServiceType, RouteTypeFilter } from '../types/route'

const TYPE_SORT_ORDER: RouteTypeFilter[] = ['centralAxis', ...ROUTE_SERVICE_TYPE_ORDER]
const TYPE_SORT_INDEX = new Map(TYPE_SORT_ORDER.map((t, i) => [t, i] as const))

function sortTypes(types: RouteTypeFilter[]): RouteTypeFilter[] {
  return [...types].sort(
    (a, b) => (TYPE_SORT_INDEX.get(a) ?? 99) - (TYPE_SORT_INDEX.get(b) ?? 99),
  )
}

/** 界面「类型」标签：SIBS 服务类型 + Central Axis */
export function getRouteDisplayTypes(route: BusRoute): RouteTypeFilter[] {
  const tags: RouteTypeFilter[] = [...(route.serviceTypes ?? [])]
  if (route.category === 'centralAxis' && !tags.includes('centralAxis')) {
    tags.unshift('centralAxis')
  }
  return sortTypes(tags)
}

export function routeMatchesTypeFilter(route: BusRoute, type: RouteTypeFilter): boolean {
  if (type === 'centralAxis') return route.category === 'centralAxis'
  return route.serviceTypes?.includes(type as RouteServiceType) ?? false
}

export function routeHasDisplayTypes(route: BusRoute): boolean {
  return getRouteDisplayTypes(route).length > 0
}
