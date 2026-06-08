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
