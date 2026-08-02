import type { MessageKey } from '../i18n/messages'
import type { Locale } from '../i18n/types'
import type { BusRoute } from '../types/route'
import { isLockedDisplayRoute, getRouteDisplayGroupsForRoute } from '../data/routeDisplayGroups'
import { getListedRouteIdsForRoute } from '../data/routeDisplayGroups'
import { getMergeDirectionKey } from './routeMerge'
import { compareRouteNumber } from './routeSort'
import { getDirectionShortLabel, getSortedDirectionCount } from './routeDirections'

export interface RealRouteListEntry {
  route: BusRoute
  directionIndex: number
  listKey: string
}

export function realRouteListKey(routeId: string, directionIndex: number): string {
  return `${routeId}:${directionIndex}`
}

/** 仅当分组内存在多个不同走向的列表编号（如 370E + 370W）时才按方向拆卡。 */
function shouldExpandRouteDirections(route: BusRoute): boolean {
  if (getSortedDirectionCount(route) <= 1) return false

  const directionKeys = new Set(
    getListedRouteIdsForRoute(route)
      .map((listedId) => getMergeDirectionKey(listedId))
      .filter((key): key is NonNullable<typeof key> => key != null),
  )
  return directionKeys.size >= 2
}

export function buildRealRouteListEntries(routes: readonly BusRoute[]): RealRouteListEntry[] {
  const entries: RealRouteListEntry[] = []

  for (const route of routes) {
    if (!shouldExpandRouteDirections(route)) {
      entries.push({
        route,
        directionIndex: 0,
        listKey: realRouteListKey(route.id, 0),
      })
      continue
    }

    const count = getSortedDirectionCount(route)
    for (let directionIndex = 0; directionIndex < count; directionIndex++) {
      entries.push({
        route,
        directionIndex,
        listKey: realRouteListKey(route.id, directionIndex),
      })
    }
  }

  return entries
}

export function formatRealRouteDisplayNumber(
  route: BusRoute,
  directionIndex: number,
  t: (key: MessageKey) => string,
  locale: Locale,
): string {
  if (!shouldExpandRouteDirections(route)) return route.number

  const label = getDirectionShortLabel(route, directionIndex, t, locale)
  return `${route.number}（${label}）`
}

export function partitionRealRouteListEntries(entries: readonly RealRouteListEntry[]): {
  normal: RealRouteListEntry[]
  locked: RealRouteListEntry[]
} {
  const normal: RealRouteListEntry[] = []
  const locked: RealRouteListEntry[] = []

  for (const entry of entries) {
    if (isLockedDisplayRoute(entry.route)) {
      locked.push(entry)
    } else {
      normal.push(entry)
    }
  }

  return { normal, locked }
}

function lockedRouteGroupRank(route: BusRoute): number {
  const groups = getRouteDisplayGroupsForRoute(route)
  if (groups.includes('seasonal')) return 0
  if (groups.includes('special')) return 1
  return 2
}

/** 锁定列表：节日限定成组在前，特别路线成组在后，组内按线路号排序。 */
export function sortLockedRealRouteListEntries(
  entries: readonly RealRouteListEntry[],
): RealRouteListEntry[] {
  return [...entries].sort((a, b) => {
    const rankDiff = lockedRouteGroupRank(a.route) - lockedRouteGroupRank(b.route)
    if (rankDiff !== 0) return rankDiff
    return compareRouteNumber(a.route.number, b.route.number)
  })
}

export function filterRealRouteListEntriesByUnlockCategory(
  entries: readonly RealRouteListEntry[],
  category: 'seasonal' | 'special' | null,
): RealRouteListEntry[] {
  if (!category) return [...entries]
  return entries.filter((entry) => getRouteDisplayGroupsForRoute(entry.route).includes(category))
}
