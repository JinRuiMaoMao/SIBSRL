import type { BusRoute, RouteServiceType } from '../types/route'
import {
  ROUTE_SERVICE_TYPE_MAP,
  ROUTE_SERVICE_TYPE_ORDER,
} from './routeServiceTypes.generated'

export { ROUTE_SERVICE_TYPE_ORDER }

/** 同系列编号共享 SIBS 类型（双向合并） */
const SERVICE_TYPE_ALIASES: Record<string, string[]> = {
  '140P': ['141P'],
  '141P': ['140P'],
  '476SA': ['476S'],
  /** 246XA 为游戏内环线编号，合并展示为 246X */
  '246X': ['246XA'],
}

function sortServiceTypes(types: RouteServiceType[]): RouteServiceType[] {
  return [...types].sort(
    (a, b) => ROUTE_SERVICE_TYPE_ORDER.indexOf(a) - ROUTE_SERVICE_TYPE_ORDER.indexOf(b),
  )
}

export function getRouteServiceTypes(routeId: string): RouteServiceType[] {
  const merged = new Set<RouteServiceType>()

  const addForId = (id: string) => {
    const list = ROUTE_SERVICE_TYPE_MAP[id]
    if (list) list.forEach((t) => merged.add(t))
  }

  addForId(routeId)
  for (const aliasId of SERVICE_TYPE_ALIASES[routeId] ?? []) {
    addForId(aliasId)
  }

  return sortServiceTypes([...merged])
}

export function applyRouteServiceTypes(route: BusRoute): BusRoute {
  const fromMap = getRouteServiceTypes(route.id)
  const merged = [...new Set([...(route.serviceTypes ?? []), ...fromMap])].sort(
    (a, b) => ROUTE_SERVICE_TYPE_ORDER.indexOf(a) - ROUTE_SERVICE_TYPE_ORDER.indexOf(b),
  )
  return merged.length ? { ...route, serviceTypes: merged } : route
}

export function wikiUrlForRouteId(id: string): string {
  const wikiAliases: Record<string, string> = {
    S1A: 'S1',
    S2A: 'S2',
    'U47*': 'U47',
  }
  const wikiId = wikiAliases[id] ?? id
  const encoded = encodeURIComponent(`Bus_route_${wikiId}`)
  return `https://sunshine-islands-roblox.fandom.com/wiki/${encoded}`
}
