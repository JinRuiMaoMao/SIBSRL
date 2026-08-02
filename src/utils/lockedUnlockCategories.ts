import type { RouteUnlockCategoryKind } from '../components/RouteUnlockCategoryCard'
import type { MessageKey } from '../i18n/messages'
import {
  getRouteDisplayGroupsForRoute,
  type GroupedRouteDisplaySlot,
} from '../data/routeDisplayGroups'
import { routeBelongsToShiftUnlockCategory, getShiftUnlockPrerequisites } from '../data/routeShiftUnlocks'
import { isSunshardDirectionLockedSlot } from '../data/routeSunshardUnlocks'
import { routeUsesSunshardUnlock } from '../data/routeUnlocks'
import type { BusRoute } from '../types/route'
import {
  sortLockedDisplaySlots,
  sortLockedDisplaySlotsForUnlockCategory,
  sortLockedRealRouteListEntriesForUnlockCategory,
} from './lockedRouteDisplayOrder'
import type { RealRouteListEntry } from './realRouteListEntries'

export const UNLOCK_CATEGORY_ORDER: RouteUnlockCategoryKind[] = ['seasonal', 'special', 'shift']

export const UNLOCK_CATEGORY_TITLE_KEYS: Record<RouteUnlockCategoryKind, MessageKey> = {
  seasonal: 'routeUnlockCategoryEvents',
  special: 'routeUnlockCategorySpecial',
  shift: 'routeUnlockCategoryShift',
}

export interface LockedUnlockLookupOptions {
  listedId?: string
  directionIndex?: number
}

export function directionIndexForLockedSlot(
  route: BusRoute,
  directionKey?: string,
): number {
  if (!directionKey) return 0
  const idx = route.stops?.findIndex((stop) => stop.directionKey === directionKey) ?? -1
  return idx >= 0 ? idx : 0
}

export function listedIdFromRealRouteListEntry(entry: RealRouteListEntry): string | undefined {
  const colon = entry.listKey.indexOf(':')
  if (colon < 0) return undefined
  const suffix = entry.listKey.slice(colon + 1)
  if (!suffix) return undefined
  if (suffix.includes('|')) return suffix
  if (!/^\d+$/.test(suffix)) return suffix
  return undefined
}

/** Assign each locked item to exactly one unlock category (sunshard direction > shift prereq > seasonal > sunshard > shift). */
export function resolveLockedUnlockCategory(
  route: BusRoute,
  options?: LockedUnlockLookupOptions,
): RouteUnlockCategoryKind {
  if (options?.listedId && isSunshardDirectionLockedSlot(route, options.listedId)) {
    return 'special'
  }
  if ((getShiftUnlockPrerequisites(route, options)?.prerequisiteRouteNumbers.length ?? 0) > 0) {
    return 'shift'
  }
  if (getRouteDisplayGroupsForRoute(route).includes('seasonal')) return 'seasonal'
  if (routeUsesSunshardUnlock(route)) return 'special'
  if (routeBelongsToShiftUnlockCategory(route, options)) return 'shift'
  return 'special'
}

export function lockedItemBelongsToUnlockCategory(
  route: BusRoute,
  category: RouteUnlockCategoryKind,
  options?: LockedUnlockLookupOptions,
): boolean {
  return resolveLockedUnlockCategory(route, options) === category
}

export type LockedSlotsByUnlockCategory = Record<
  RouteUnlockCategoryKind,
  GroupedRouteDisplaySlot[]
>

export type LockedEntriesByUnlockCategory = Record<
  RouteUnlockCategoryKind,
  RealRouteListEntry[]
>

function emptyCategoryGroups<T>(): Record<RouteUnlockCategoryKind, T[]> {
  return { seasonal: [], special: [], shift: [] }
}

export function partitionLockedDisplaySlotsByUnlockCategory(
  slots: readonly GroupedRouteDisplaySlot[],
): LockedSlotsByUnlockCategory {
  const groups = emptyCategoryGroups<GroupedRouteDisplaySlot>()

  for (const slot of slots) {
    if (slot.entry == null) continue
    const { route, listedId, directionKey } = slot.entry
    const directionIndex = directionIndexForLockedSlot(route, directionKey)
    const category = resolveLockedUnlockCategory(route, { listedId, directionIndex })
    groups[category].push(slot)
  }

  return {
    seasonal: sortLockedDisplaySlotsForUnlockCategory(groups.seasonal, 'seasonal'),
    special: sortLockedDisplaySlotsForUnlockCategory(groups.special, 'special'),
    shift: sortLockedDisplaySlotsForUnlockCategory(groups.shift, 'shift'),
  }
}

export function partitionRealRouteListEntriesByUnlockCategory(
  entries: readonly RealRouteListEntry[],
): LockedEntriesByUnlockCategory {
  const groups = emptyCategoryGroups<RealRouteListEntry>()

  for (const entry of entries) {
    const listedId = listedIdFromRealRouteListEntry(entry)
    const category = resolveLockedUnlockCategory(entry.route, {
      listedId,
      directionIndex: entry.directionIndex,
    })
    groups[category].push(entry)
  }

  return {
    seasonal: sortLockedRealRouteListEntriesForUnlockCategory(groups.seasonal, 'seasonal'),
    special: sortLockedRealRouteListEntriesForUnlockCategory(groups.special, 'special'),
    shift: sortLockedRealRouteListEntriesForUnlockCategory(groups.shift, 'shift'),
  }
}

export function countLockedUnlockCategoryItems(
  groups: LockedSlotsByUnlockCategory | LockedEntriesByUnlockCategory,
): number {
  return UNLOCK_CATEGORY_ORDER.reduce((sum, kind) => sum + groups[kind].length, 0)
}
