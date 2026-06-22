import { ROUTE_SERVICE_TYPE_ORDER } from '../data/routeServiceTypes.generated'
import type { BusRoute, RouteServiceType, RouteTypeFilter } from '../types/route'
import { getDirectionDataIndex, getDirectionKey } from './routeDirectionCore'
import { routeHasLoopDirectionLayout } from './routeLoopView'

const TYPE_SORT_ORDER: RouteTypeFilter[] = ['centralAxis', ...ROUTE_SERVICE_TYPE_ORDER]
const TYPE_SORT_INDEX = new Map(TYPE_SORT_ORDER.map((t, i) => [t, i] as const))

export interface RouteDisplayTypeOptions {
  directionIndex?: number
  loopView?: boolean
}

function sortTypes(types: RouteTypeFilter[]): RouteTypeFilter[] {
  return [...types].sort(
    (a, b) => (TYPE_SORT_INDEX.get(a) ?? 99) - (TYPE_SORT_INDEX.get(b) ?? 99),
  )
}

/** 246X：环线视图 / 东行 / 西行各自对应 SIBS 类型（246XA、246PE、146W） */
function get246XDisplayTypes(
  route: BusRoute,
  directionIndex: number,
  loopView: boolean,
): RouteTypeFilter[] | null {
  if (route.id !== '246X' || !routeHasLoopDirectionLayout(route)) return null

  if (loopView) return sortTypes(['loop'])

  const directionKey = getDirectionKey(route, getDirectionDataIndex(route, directionIndex))
  if (directionKey === 'E') return sortTypes(['semiDirect', 'specialDeparture'])
  if (directionKey === 'W') return sortTypes(['specialDeparture'])
  return null
}

/** 界面「类型」标签：SIBS 服务类型 + Central Axis */
export function getRouteDisplayTypes(
  route: BusRoute,
  options?: RouteDisplayTypeOptions,
): RouteTypeFilter[] {
  if (options) {
    const contextual = get246XDisplayTypes(
      route,
      options.directionIndex ?? 0,
      options.loopView ?? false,
    )
    if (contextual) return contextual
  }

  const tags: RouteTypeFilter[] = [...(route.serviceTypes ?? [])]
  if (route.category === 'centralAxis' && !tags.includes('centralAxis')) {
    tags.unshift('centralAxis')
  }
  return sortTypes([...new Set(tags)])
}

export function routeMatchesTypeFilter(route: BusRoute, type: RouteTypeFilter): boolean {
  if (type === 'centralAxis') return route.category === 'centralAxis'
  return route.serviceTypes?.includes(type as RouteServiceType) ?? false
}

export function routeHasDisplayTypes(route: BusRoute): boolean {
  return getRouteDisplayTypes(route).length > 0
}
