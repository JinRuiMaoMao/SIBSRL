import type { BusRoute } from '../types/route'
import { routeHasDirectionVariants } from './routeDirections'
import { EXACT_MERGE, type DirectionKey } from './routeMerge'

export function shouldMergeDirectionalListEntries(entry: {
  listedId: string
  route: BusRoute
  directionKey?: DirectionKey
}): boolean {
  const { listedId, route, directionKey } = entry
  if (!directionKey || !routeHasDirectionVariants(route)) return false

  if (listedId.startsWith(route.number)) {
    const suffix = listedId.slice(route.number.length).toUpperCase()
    if (suffix === directionKey) return true
  }
  if (listedId.startsWith(route.id)) {
    const suffix = listedId.slice(route.id.length).toUpperCase()
    if (suffix === directionKey) return true
  }

  const exact = EXACT_MERGE[listedId]
  if (exact?.base === route.id && exact.directionKey === directionKey) {
    return listedId.startsWith(route.number) || listedId.startsWith(route.id)
  }

  return false
}

/** 列表卡片线路号：方向成对条目（46E/46W）显示合并编号（46）。 */
export function routeCardDisplayNumber(
  route: BusRoute,
  listedId?: string,
  directionKey?: DirectionKey,
): string {
  if (
    listedId &&
    directionKey &&
    shouldMergeDirectionalListEntries({ listedId, route, directionKey })
  ) {
    return route.number
  }
  if (listedId && listedId !== route.number && listedId !== route.id) return listedId
  return route.number
}
