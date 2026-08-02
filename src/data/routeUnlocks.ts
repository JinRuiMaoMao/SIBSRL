import type { BusRoute } from '../types/route'
import { ROUTE_UNLOCK_MAP } from './routeUnlocks.generated'

export function applyRouteUnlocks(route: BusRoute): BusRoute {
  const unlock = ROUTE_UNLOCK_MAP[route.id] ?? ROUTE_UNLOCK_MAP[route.number]
  if (!unlock) return route

  return {
    ...route,
    levelRequired: route.levelRequired ?? unlock.levelRequired,
    sunshardsRequired: route.sunshardsRequired ?? unlock.sunshardsRequired,
  }
}

/** 锁定线路以阳光碎片解锁（非班次解锁前置线路） */
export function routeUsesSunshardUnlock(route: BusRoute): boolean {
  return (route.sunshardsRequired ?? 0) > 0
}

export function routeLevelRequired(route: BusRoute): number | undefined {
  const unlock = ROUTE_UNLOCK_MAP[route.id] ?? ROUTE_UNLOCK_MAP[route.number]
  return route.levelRequired ?? unlock?.levelRequired
}
