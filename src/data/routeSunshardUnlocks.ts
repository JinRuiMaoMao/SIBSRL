import type { BusRoute } from '../types/route'
import {
  getRouteDisplayIdsForGroup,
  isLockedDisplayRoute,
  resolveGroupedRouteEntry,
  type GroupedRouteDisplaySlot,
} from './routeDisplayGroups'
import { getRouteServiceTypes } from './routeServiceTypes'
import { routeUsesSunshardUnlock } from './routeUnlocks'
import type { DirectionKey } from '../utils/routeMerge'
import { compareLockedDisplaySlotOrder } from '../utils/lockedRouteDisplayOrder'

/** 每个方向单独计阳光碎片解锁（如 U47* 北/南各 300；员工接驳仅北行/西行需碎片） */
const PER_DIRECTION_SUNSHARD_ROUTE_IDS = new Set(['U47*', 'C01', 'C401', 'F701', 'F702'])

/** 员工接驳：仅北行（游戏内 W/N 去程）需阳光碎片，反向走班次解锁 */
const STAFF_SHUTTLE_SUNSHARD_DIRECTION: DirectionKey = 'N'

export function routeHasPerDirectionSunshardUnlock(route: BusRoute): boolean {
  return PER_DIRECTION_SUNSHARD_ROUTE_IDS.has(route.id)
}

export function staffShuttleSunshardDirectionKey(route: BusRoute): DirectionKey | undefined {
  if (!isStaffShuttleSunshardUnlockRoute(route)) return undefined
  const hasNorth = route.stops?.some((stop) => stop.directionKey === STAFF_SHUTTLE_SUNSHARD_DIRECTION)
  return hasNorth ? STAFF_SHUTTLE_SUNSHARD_DIRECTION : route.stops?.[0]?.directionKey as DirectionKey | undefined
}

export function sunshardUnlockSlotKey(routeId: string, directionKey?: DirectionKey): string {
  return directionKey ? `${routeId}|${directionKey}` : routeId
}

export function parseSunshardUnlockSlotKey(key: string): {
  routeId: string
  directionKey?: DirectionKey
} {
  const pipe = key.indexOf('|')
  if (pipe < 0) return { routeId: key }
  return {
    routeId: key.slice(0, pipe),
    directionKey: key.slice(pipe + 1) as DirectionKey,
  }
}

function lockedSpecialSeasonalRouteIds(): Set<string> {
  const ids = new Set<string>()
  for (const group of ['special', 'seasonal'] as const) {
    for (const listedId of getRouteDisplayIdsForGroup(group)) {
      const entry = resolveGroupedRouteEntry(listedId)
      if (entry) ids.add(entry.route.id.toLowerCase())
    }
  }
  return ids
}

/** 开线路（工作人员接驳）阳光碎片解锁：C01 / C401 / F701 / F702 */
export function isStaffShuttleSunshardUnlockRoute(route: BusRoute): boolean {
  return routeUsesSunshardUnlock(route) && getRouteServiceTypes(route.id).includes('staffShuttle')
}

/** 常规列表中、需阳光碎片解锁但未列入 special/seasonal 的锁定卡片（如 U47* 分方向）；
 *  工作人员接驳线即使在 special 分组也始终生成阳光碎片卡。 */
export function getSunshardUnlockLockedDisplaySlots(
  visibleRoutes: readonly BusRoute[],
): GroupedRouteDisplaySlot[] {
  const visibleIds = new Set(visibleRoutes.map((route) => route.id.toLowerCase()))
  const lockedRouteIds = lockedSpecialSeasonalRouteIds()
  const slots: GroupedRouteDisplaySlot[] = []

  for (const route of visibleRoutes) {
    if (!routeUsesSunshardUnlock(route) || !visibleIds.has(route.id.toLowerCase())) continue

    if (routeHasPerDirectionSunshardUnlock(route)) {
      if (isStaffShuttleSunshardUnlockRoute(route)) {
        const directionKey = staffShuttleSunshardDirectionKey(route)
        if (directionKey) {
          const listedId = sunshardUnlockSlotKey(route.id, directionKey)
          slots.push({
            listedId,
            entry: {
              listedId,
              route,
              directionKey,
            },
            isVisible: true,
          })
        }
        continue
      }

      for (const stop of route.stops ?? []) {
        const directionKey = stop.directionKey as DirectionKey | undefined
        if (!directionKey) continue
        const listedId = sunshardUnlockSlotKey(route.id, directionKey)
        slots.push({
          listedId,
          entry: {
            listedId,
            route,
            directionKey,
          },
          isVisible: true,
        })
      }
      continue
    }

    if (
      !isStaffShuttleSunshardUnlockRoute(route) &&
      (lockedRouteIds.has(route.id.toLowerCase()) || isLockedDisplayRoute(route))
    ) {
      continue
    }

    slots.push({
      listedId: route.number,
      entry: {
        listedId: route.number,
        route,
      },
      isVisible: true,
    })
  }

  return slots.sort(compareLockedDisplaySlotOrder)
}

export function mergeSunshardUnlockLockedDisplaySlots(
  lockedSlots: readonly GroupedRouteDisplaySlot[],
  sunshardSlots: readonly GroupedRouteDisplaySlot[],
): GroupedRouteDisplaySlot[] {
  const seenListedIds = new Set(lockedSlots.map((slot) => slot.listedId.toLowerCase()))
  const merged = [...lockedSlots]

  for (const slot of sunshardSlots) {
    const lower = slot.listedId.toLowerCase()
    if (seenListedIds.has(lower)) continue
    seenListedIds.add(lower)
    merged.push(slot)
  }

  return merged.sort(compareLockedDisplaySlotOrder)
}

export function getSunshardUnlockLockedRouteIds(
  visibleRoutes: readonly BusRoute[],
): Set<string> {
  return new Set(
    getSunshardUnlockLockedDisplaySlots(visibleRoutes).map((slot) => slot.entry!.route.id),
  )
}
