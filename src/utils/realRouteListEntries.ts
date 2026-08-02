import type { MessageKey } from '../i18n/messages'
import type { Locale } from '../i18n/types'
import type { BusRoute } from '../types/route'
import {
  isLockedDisplayRoute,
  type GroupedRouteDisplaySlot,
} from '../data/routeDisplayGroups'
import { getListedRouteIdsForRoute } from '../data/routeDisplayGroups'
import {
  getShiftUnlockLockedDisplaySlots,
  parseShiftUnlockSlotKey,
  routeHasDirectionalShiftUnlockSlots,
} from '../data/routeShiftUnlocks'
import {
  getSunshardUnlockLockedDisplaySlots,
  getSunshardUnlockLockedRouteIds,
  parseSunshardUnlockSlotKey,
  routeHasPerDirectionSunshardUnlock,
} from '../data/routeSunshardUnlocks'
import { getMergeDirectionKey } from './routeMerge'
import { getDirectionShortLabel, getSortedDirectionCount } from './routeDirections'
import { sortLockedRealRouteListEntries as sortLockedEntriesByDisplayOrder } from './lockedRouteDisplayOrder'
import {
  listedIdFromRealRouteListEntry,
  lockedItemBelongsToUnlockCategory,
  partitionRealRouteListEntriesByUnlockCategory,
} from './lockedUnlockCategories'

export { partitionRealRouteListEntriesByUnlockCategory } from './lockedUnlockCategories'

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

/** 与 normal 网格共用 listSectionSlots，保证 real 锁定区线路一致（含阳光碎片/班次解锁卡）。 */
export function buildRealRouteListEntriesFromDisplaySlots(
  slots: readonly GroupedRouteDisplaySlot[],
): RealRouteListEntry[] {
  const entries: RealRouteListEntry[] = []
  const seenListKeys = new Set<string>()

  for (const slot of slots) {
    if (!slot.entry) continue
    const { route, directionKey } = slot.entry
    let directionIndex = 0
    if (directionKey) {
      const idx = route.stops?.findIndex((stop) => stop.directionKey === directionKey) ?? -1
      if (idx >= 0) directionIndex = idx
    }

    const listedIdLower = slot.listedId.toLowerCase()
    const isWholeRouteSlot =
      listedIdLower === route.number.toLowerCase() || listedIdLower === route.id.toLowerCase()
    const listKey =
      slot.entry.directionKey && listedIdLower !== route.number.toLowerCase()
        ? `${route.id}:${slot.listedId}`
        : slot.listedId.includes('|') || isWholeRouteSlot
          ? `${route.id}:${slot.listedId}`
          : realRouteListKey(route.id, directionIndex)

    if (seenListKeys.has(listKey)) continue
    seenListKeys.add(listKey)
    entries.push({ route, directionIndex, listKey })
  }

  return entries
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

/** 锁定列表：节日限定 → 粉框班次解锁 → 阳光碎片解锁 → 其余特别路线，组内按碎片数/线路号排序。 */
export function sortLockedRealRouteListEntries(
  entries: readonly RealRouteListEntry[],
): RealRouteListEntry[] {
  return sortLockedEntriesByDisplayOrder(entries)
}

export function buildShiftUnlockRealRouteEntries(
  visibleRoutes: readonly BusRoute[],
): RealRouteListEntry[] {
  const entries: RealRouteListEntry[] = []

  for (const slot of getShiftUnlockLockedDisplaySlots(visibleRoutes)) {
    const route = slot.entry?.route
    if (!route) continue

    if (routeHasDirectionalShiftUnlockSlots(route)) {
      const { directionKey } = parseShiftUnlockSlotKey(slot.listedId)
      let directionIndex = 0
      if (directionKey) {
        const idx = route.stops?.findIndex((stop) => stop.directionKey === directionKey) ?? -1
        if (idx >= 0) directionIndex = idx
      }
      entries.push({
        route,
        directionIndex,
        listKey: `${route.id}:${slot.listedId}`,
      })
      continue
    }

    entries.push(...buildRealRouteListEntries([route]))
  }

  return entries
}

export function buildSunshardUnlockRealRouteEntries(
  visibleRoutes: readonly BusRoute[],
): RealRouteListEntry[] {
  const entries: RealRouteListEntry[] = []

  for (const slot of getSunshardUnlockLockedDisplaySlots(visibleRoutes)) {
    const route = slot.entry?.route
    if (!route) continue

    if (routeHasPerDirectionSunshardUnlock(route)) {
      const { directionKey } = parseSunshardUnlockSlotKey(slot.listedId)
      let directionIndex = 0
      if (directionKey) {
        const idx = route.stops?.findIndex((stop) => stop.directionKey === directionKey) ?? -1
        if (idx >= 0) directionIndex = idx
      }
      entries.push({
        route,
        directionIndex,
        listKey: `${route.id}:${slot.listedId}`,
      })
      continue
    }

    entries.push(...buildRealRouteListEntries([route]))
  }

  return entries
}

export function partitionRealRouteListWithShiftUnlocks(
  entries: readonly RealRouteListEntry[],
  visibleRoutes: readonly BusRoute[],
): {
  normal: RealRouteListEntry[]
  locked: RealRouteListEntry[]
} {
  const { normal, locked } = partitionRealRouteListEntries(entries)
  const shiftUnlockEntries = buildShiftUnlockRealRouteEntries(visibleRoutes)
  const sunshardUnlockEntries = buildSunshardUnlockRealRouteEntries(visibleRoutes)
  const hiddenRouteIds = new Set([
    ...shiftUnlockEntries.map((entry) => entry.route.id),
    ...getSunshardUnlockLockedRouteIds(visibleRoutes),
  ])
  const normalFiltered = normal.filter((entry) => !hiddenRouteIds.has(entry.route.id))

  if (shiftUnlockEntries.length === 0 && sunshardUnlockEntries.length === 0) {
    return { normal: normalFiltered, locked: sortLockedRealRouteListEntries(locked) }
  }

  return {
    normal: normalFiltered,
    locked: sortLockedRealRouteListEntries([
      ...locked,
      ...shiftUnlockEntries,
      ...sunshardUnlockEntries,
    ]),
  }
}

export function filterRealRouteListEntriesByUnlockCategory(
  entries: readonly RealRouteListEntry[],
  category: 'seasonal' | 'special' | 'shift' | null,
): RealRouteListEntry[] {
  if (!category) return [...entries]
  return entries.filter((entry) =>
    lockedItemBelongsToUnlockCategory(entry.route, category, {
      listedId: listedIdFromRealRouteListEntry(entry),
      directionIndex: entry.directionIndex,
    }),
  )
}
