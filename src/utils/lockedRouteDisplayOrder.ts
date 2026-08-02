import type { GroupedRouteDisplaySlot } from '../data/routeDisplayGroups'
import { getShiftUnlockPrerequisites } from '../data/routeShiftUnlocks'
import { routeUsesSunshardUnlock } from '../data/routeUnlocks'
import type { BusRoute } from '../types/route'
import { compareDirectionKeys } from './routeDirectionCore'
import type { DirectionKey } from './routeMerge'
import { compareRouteNumber } from './routeSort'
import type { RealRouteListEntry } from './realRouteListEntries'

function directionIndexForKey(route: BusRoute, directionKey?: DirectionKey): number | undefined {
  if (!directionKey) return undefined
  const idx = route.stops?.findIndex((stop) => stop.directionKey === directionKey) ?? -1
  return idx >= 0 ? idx : undefined
}

/** 锁定卡片是否显示粉框（班次解锁前置线路） */
export function routeHasShiftUnlockPrereqDisplay(
  route: BusRoute,
  options?: { listedId?: string; directionIndex?: number; directionKey?: DirectionKey },
): boolean {
  const directionIndex =
    options?.directionIndex ??
    (options?.directionKey != null ? directionIndexForKey(route, options.directionKey) : undefined)
  const prereqs = getShiftUnlockPrerequisites(route, {
    listedId: options?.listedId,
    directionIndex,
  })
  return (prereqs?.prerequisiteRouteNumbers.length ?? 0) > 0
}

function sortListedIdForRoute(route: BusRoute, listedId?: string): string {
  const trimmed = listedId?.trim()
  if (trimmed) return trimmed.split('|')[0] ?? trimmed
  return route.number
}

function compareLockedRouteOrder(
  routeA: BusRoute,
  routeB: BusRoute,
  dirA?: DirectionKey,
  dirB?: DirectionKey,
  listedIdA?: string,
  listedIdB?: string,
): number {
  const bothSunshard = routeUsesSunshardUnlock(routeA) && routeUsesSunshardUnlock(routeB)
  if (bothSunshard) {
    const shardDiff = (routeA.sunshardsRequired ?? 0) - (routeB.sunshardsRequired ?? 0)
    if (shardDiff !== 0) return shardDiff
  }

  const routeCmp = compareRouteNumber(
    sortListedIdForRoute(routeA, listedIdA),
    sortListedIdForRoute(routeB, listedIdB),
  )
  if (routeCmp !== 0) return routeCmp

  const dirCmp = compareDirectionKeys(dirA, dirB)
  if (dirCmp !== 0) return dirCmp

  if (listedIdA && listedIdB) return compareRouteNumber(listedIdA, listedIdB)
  return compareRouteNumber(routeA.number, routeB.number)
}

export function compareLockedDisplaySlotOrder(
  a: GroupedRouteDisplaySlot,
  b: GroupedRouteDisplaySlot,
): number {
  const routeA = a.entry?.route
  const routeB = b.entry?.route
  if (!routeA || !routeB) return compareRouteNumber(a.listedId, b.listedId)

  return compareLockedRouteOrder(
    routeA,
    routeB,
    a.entry?.directionKey,
    b.entry?.directionKey,
    a.listedId,
    b.listedId,
  )
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

export function listedIdFromRealRouteListKey(listKey: string): string | undefined {
  return listedIdFromRealListKey(listKey)
}

export function compareLockedRealRouteEntryOrder(
  a: RealRouteListEntry,
  b: RealRouteListEntry,
): number {
  const listedIdA = listedIdFromRealListKey(a.listKey)
  const listedIdB = listedIdFromRealListKey(b.listKey)

  const dirA = a.route.stops?.[a.directionIndex]?.directionKey
  const dirB = b.route.stops?.[b.directionIndex]?.directionKey

  return compareLockedRouteOrder(
    a.route,
    b.route,
    dirA,
    dirB,
    listedIdA,
    listedIdB,
  )
}

export function sortLockedRealRouteListEntries(
  entries: readonly RealRouteListEntry[],
): RealRouteListEntry[] {
  return [...entries].sort(compareLockedRealRouteEntryOrder)
}
