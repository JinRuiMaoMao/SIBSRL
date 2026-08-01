import type { MessageKey } from '../i18n/messages'
import type { Locale } from '../i18n/types'
import type { BusRoute } from '../types/route'
import { isLockedDisplayRoute } from '../data/routeDisplayGroups'
import { getDirectionShortLabel, getSortedDirectionCount } from './routeDirections'

export interface RealRouteListEntry {
  route: BusRoute
  directionIndex: number
  listKey: string
}

export function realRouteListKey(routeId: string, directionIndex: number): string {
  return `${routeId}:${directionIndex}`
}

function shouldExpandRouteDirections(route: BusRoute): boolean {
  return getSortedDirectionCount(route) > 1
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
  unlockable: RealRouteListEntry[]
  locked: RealRouteListEntry[]
} {
  const unlockable: RealRouteListEntry[] = []
  const locked: RealRouteListEntry[] = []

  for (const entry of entries) {
    if (isLockedDisplayRoute(entry.route)) {
      locked.push(entry)
    } else {
      unlockable.push(entry)
    }
  }

  return { unlockable, locked }
}
