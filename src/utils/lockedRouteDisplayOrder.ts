import {
  getRouteDisplayGroupsForRoute,
  type GroupedRouteDisplaySlot,
} from '../data/routeDisplayGroups'
import { getShiftUnlockPrerequisites } from '../data/routeShiftUnlocks'
import { routeUsesSunshardUnlock } from '../data/routeUnlocks'
import type { BusRoute } from '../types/route'
import type { DirectionKey } from './routeMerge'
import { compareRouteNumber } from './routeSort'
import type { RealRouteListEntry } from './realRouteListEntries'

function directionIndexForKey(route: BusRoute, directionKey?: DirectionKey): number | undefined {
  if (!directionKey) return undefined
  const idx = route.stops?.findIndex((stop) => stop.directionKey === directionKey) ?? -1
  return idx >= 0 ? idx : undefined
}

/** 锁定卡片是否显示粉框（班次解锁前置线路，非阳光碎片解锁） */
export function routeHasShiftUnlockPrereqDisplay(
  route: BusRoute,
  options?: { listedId?: string; directionIndex?: number; directionKey?: DirectionKey },
): boolean {
  if (routeUsesSunshardUnlock(route)) return false
  const directionIndex =
    options?.directionIndex ??
    (options?.directionKey != null ? directionIndexForKey(route, options.directionKey) : undefined)
  const prereqs = getShiftUnlockPrerequisites(route, {
    listedId: options?.listedId,
    directionIndex,
  })
  return (prereqs?.prerequisiteRouteNumbers.length ?? 0) > 0
}

function lockedDisplayRank(route: BusRoute, hasShiftPrereq: boolean): number {
  const groups = getRouteDisplayGroupsForRoute(route)
  if (groups.includes('seasonal')) return 0
  if (hasShiftPrereq) return 1
  if (groups.includes('special')) return 2
  return 3
}

function compareSameRouteDirectionKeys(dirA?: DirectionKey, dirB?: DirectionKey): number {
  if (dirA === 'N' && dirB === 'S') return -1
  if (dirA === 'S' && dirB === 'N') return 1
  return 0
}

export function compareLockedDisplaySlotOrder(
  a: GroupedRouteDisplaySlot,
  b: GroupedRouteDisplaySlot,
): number {
  const routeA = a.entry?.route
  const routeB = b.entry?.route
  if (!routeA || !routeB) return compareRouteNumber(a.listedId, b.listedId)

  const prereqA = routeHasShiftUnlockPrereqDisplay(routeA, {
    listedId: a.listedId,
    directionKey: a.entry?.directionKey,
  })
  const prereqB = routeHasShiftUnlockPrereqDisplay(routeB, {
    listedId: b.listedId,
    directionKey: b.entry?.directionKey,
  })

  const rankDiff = lockedDisplayRank(routeA, prereqA) - lockedDisplayRank(routeB, prereqB)
  if (rankDiff !== 0) return rankDiff

  const routeCmp = compareRouteNumber(routeA.number, routeB.number)
  if (routeCmp !== 0) return routeCmp

  const dirCmp = compareSameRouteDirectionKeys(a.entry?.directionKey, b.entry?.directionKey)
  if (dirCmp !== 0) return dirCmp

  return compareRouteNumber(a.listedId, b.listedId)
}

export function sortLockedDisplaySlots(
  slots: readonly GroupedRouteDisplaySlot[],
): GroupedRouteDisplaySlot[] {
  return [...slots].sort(compareLockedDisplaySlotOrder)
}

function listedIdFromRealListKey(listKey: string): string | undefined {
  const colon = listKey.indexOf(':')
  if (colon < 0) return undefined
  const suffix = listKey.slice(colon + 1)
  return suffix.includes('|') ? suffix : undefined
}

export function compareLockedRealRouteEntryOrder(
  a: RealRouteListEntry,
  b: RealRouteListEntry,
): number {
  const listedIdA = listedIdFromRealListKey(a.listKey)
  const listedIdB = listedIdFromRealListKey(b.listKey)

  const prereqA = routeHasShiftUnlockPrereqDisplay(a.route, {
    listedId: listedIdA,
    directionIndex: a.directionIndex,
  })
  const prereqB = routeHasShiftUnlockPrereqDisplay(b.route, {
    listedId: listedIdB,
    directionIndex: b.directionIndex,
  })

  const rankDiff = lockedDisplayRank(a.route, prereqA) - lockedDisplayRank(b.route, prereqB)
  if (rankDiff !== 0) return rankDiff

  const routeCmp = compareRouteNumber(a.route.number, b.route.number)
  if (routeCmp !== 0) return routeCmp

  const dirA = a.route.stops?.[a.directionIndex]?.directionKey
  const dirB = b.route.stops?.[b.directionIndex]?.directionKey
  const dirCmp = compareSameRouteDirectionKeys(dirA, dirB)
  if (dirCmp !== 0) return dirCmp

  return compareRouteNumber(a.listKey, b.listKey)
}

export function sortLockedRealRouteListEntries(
  entries: readonly RealRouteListEntry[],
): RealRouteListEntry[] {
  return [...entries].sort(compareLockedRealRouteEntryOrder)
}
