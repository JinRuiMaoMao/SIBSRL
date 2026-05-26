import type { BusRoute, RouteServiceType } from '../types/route'
import {
  ROUTE_SERVICE_TYPE_MAP,
  ROUTE_SERVICE_TYPE_ORDER,
} from './routeServiceTypes.generated'

export { ROUTE_SERVICE_TYPE_ORDER }

/** 同线路不同编号别名（SIBS 类型表 ↔ 资料库 id） */
const SERVICE_TYPE_ALIASES: Record<string, string> = {
  '140P': '141P',
  '73A': '73',
}

export function getRouteServiceTypes(routeId: string): RouteServiceType[] {
  const direct = ROUTE_SERVICE_TYPE_MAP[routeId]
  if (direct?.length) return [...direct]
  const alias = SERVICE_TYPE_ALIASES[routeId]
  if (alias && ROUTE_SERVICE_TYPE_MAP[alias]) return [...ROUTE_SERVICE_TYPE_MAP[alias]]
  return []
}

export function applyRouteServiceTypes(route: BusRoute): BusRoute {
  const fromMap = getRouteServiceTypes(route.id)
  const merged = [...new Set([...(route.serviceTypes ?? []), ...fromMap])].sort(
    (a, b) => ROUTE_SERVICE_TYPE_ORDER.indexOf(a) - ROUTE_SERVICE_TYPE_ORDER.indexOf(b),
  )
  return merged.length ? { ...route, serviceTypes: merged } : route
}

export function wikiUrlForRouteId(id: string): string {
  const encoded = encodeURIComponent(`Bus_route_${id}`)
  return `https://sunshine-islands-roblox.fandom.com/wiki/${encoded}`
}
