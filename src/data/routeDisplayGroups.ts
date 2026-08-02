import type { BusRoute } from '../types/route'
import routeDisplayGroupsJson from '../../data/route-display-groups.json'
import { routeLevelRequired, routeUsesSunshardUnlock } from './routeUnlocks'
import { getShiftUnlockPrerequisites } from './routeShiftUnlocks'
import {
  DISPLAY_ONLY_RENAMES,
  getMergeDirectionKey,
  mergeRoutesByBaseNumber,
  toMergeBaseRouteNumber,
} from '../utils/routeMerge'
import { compareRouteNumber } from '../utils/routeSort'
import { routes } from './routes'

export type RouteDisplayGroupKey = 'normal' | 'special' | 'daily' | 'seasonal'

export const ROUTE_DISPLAY_GROUP_ORDER: RouteDisplayGroupKey[] = [
  'normal',
  'special',
  'daily',
  'seasonal',
]

/** 主站列表 UI：常规在上，特殊+节日在下；不含每日挑战分组。 */
export type RouteListUiSectionKey = 'normal' | 'specialSeasonal'

export const ROUTE_LIST_UI_SECTION_ORDER: RouteListUiSectionKey[] = ['normal', 'specialSeasonal']

export const ROUTE_LIST_UI_SECTION_GROUPS: Record<
  RouteListUiSectionKey,
  readonly RouteDisplayGroupKey[]
> = {
  normal: ['normal'],
  specialSeasonal: ['seasonal', 'special'],
}

const groupRouteIds = routeDisplayGroupsJson as Record<RouteDisplayGroupKey, string[]>

const displayRoutes = mergeRoutesByBaseNumber(routes)
const displayRouteById = new Map(
  displayRoutes.map((route) => [route.id.toLowerCase(), route]),
)

function resolveDisplayRouteForListedId(listedId: string): BusRoute | null {
  const key = listedId.trim()
  if (!key) return null
  const lower = key.toLowerCase()

  const direct = displayRouteById.get(lower)
  if (direct) return direct

  const renamed = DISPLAY_ONLY_RENAMES[key]
  if (renamed) {
    const route = displayRouteById.get(renamed.toLowerCase())
    if (route) return route
  }

  const base = toMergeBaseRouteNumber(key)
  const byBase = displayRouteById.get(base.toLowerCase())
  if (byBase) return byBase

  const raw = routes.find(
    (route) => route.id.toLowerCase() === lower || route.number.toLowerCase() === lower,
  )
  if (!raw) return null

  const rawRename = DISPLAY_ONLY_RENAMES[raw.id] ?? DISPLAY_ONLY_RENAMES[raw.number]
  if (rawRename) return displayRouteById.get(rawRename.toLowerCase()) ?? null

  return displayRouteById.get(toMergeBaseRouteNumber(raw.number).toLowerCase()) ?? null
}

export interface GroupedRouteEntry {
  listedId: string
  route: BusRoute
  directionKey?: 'N' | 'S' | 'E' | 'W'
}

export interface GroupedRouteDisplaySlot {
  listedId: string
  entry: GroupedRouteEntry | null
  /** 有数据且通过当前筛选 */
  isVisible: boolean
}

export function resolveGroupedRouteEntry(listedId: string): GroupedRouteEntry | null {
  const key = listedId.trim()
  if (!key) return null

  const route = resolveDisplayRouteForListedId(key)
  if (!route) return null

  return {
    listedId: key,
    route,
    directionKey: getMergeDirectionKey(key) ?? undefined,
  }
}

/** 列表槽位去重键：分方向编号（73SS、370W）按 listedId，其余按 route.id */
export function groupedRouteDisplaySlotKey(entry: GroupedRouteEntry): string {
  if (entry.directionKey) return entry.listedId.toLowerCase()
  return entry.route.id.toLowerCase()
}

export function groupedRouteDisplaySlotKeyFromSlot(
  slot: GroupedRouteDisplaySlot,
): string | null {
  if (!slot.entry) return slot.listedId.toLowerCase()
  return groupedRouteDisplaySlotKey(slot.entry)
}

export function getRouteDisplayIdsForGroup(group: RouteDisplayGroupKey): string[] {
  return groupRouteIds[group] ?? []
}

export function getRouteDisplayEntriesForGroup(group: RouteDisplayGroupKey): GroupedRouteEntry[] {
  const seenKeys = new Set<string>()
  const entries: GroupedRouteEntry[] = []

  for (const listedId of getRouteDisplayIdsForGroup(group)) {
    const entry = resolveGroupedRouteEntry(listedId)
    if (!entry) continue
    const key = groupedRouteDisplaySlotKey(entry)
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    entries.push(entry)
  }

  return entries.sort((a, b) => compareRouteNumber(a.listedId, b.listedId))
}

export function getMissingRouteDisplayIds(): string[] {
  const missing: string[] = []
  for (const group of ROUTE_DISPLAY_GROUP_ORDER) {
    for (const id of getRouteDisplayIdsForGroup(group)) {
      if (!resolveGroupedRouteEntry(id)) missing.push(id)
    }
  }
  return missing
}

/** 分组 JSON 中指向该展示线路的全部列表编号（含 25YN、240A 等合并前 ID） */
const listedRouteIdsByDisplayId = (() => {
  const map = new Map<string, string[]>()
  for (const group of ROUTE_DISPLAY_GROUP_ORDER) {
    for (const listedId of getRouteDisplayIdsForGroup(group)) {
      const entry = resolveGroupedRouteEntry(listedId)
      if (!entry) continue
      const key = entry.route.id.toLowerCase()
      const list = map.get(key) ?? []
      if (!list.some((id) => id.toLowerCase() === listedId.toLowerCase())) {
        list.push(listedId)
      }
      map.set(key, list)
    }
  }
  return map
})()

export function getListedRouteIdsForRoute(route: BusRoute): string[] {
  return listedRouteIdsByDisplayId.get(route.id.toLowerCase()) ?? []
}

const displayGroupsByRouteId = (() => {
  const map = new Map<string, RouteDisplayGroupKey[]>()
  for (const group of ROUTE_DISPLAY_GROUP_ORDER) {
    for (const listedId of getRouteDisplayIdsForGroup(group)) {
      const entry = resolveGroupedRouteEntry(listedId)
      if (!entry) continue
      const key = entry.route.id.toLowerCase()
      const groups = map.get(key) ?? []
      if (!groups.includes(group)) groups.push(group)
      map.set(key, groups)
    }
  }
  return map
})()

/** 该展示线路在 route-display-groups.json 中属于哪些分组 */
export function getRouteDisplayGroupsForRoute(route: BusRoute): RouteDisplayGroupKey[] {
  return displayGroupsByRouteId.get(route.id.toLowerCase()) ?? []
}

export function filterGroupEntriesByRoutes(
  group: RouteDisplayGroupKey,
  visibleRoutes: BusRoute[],
): GroupedRouteEntry[] {
  return getGroupDisplaySlots(group, visibleRoutes)
    .filter((slot): slot is GroupedRouteDisplaySlot & { entry: GroupedRouteEntry } =>
      Boolean(slot.isVisible && slot.entry),
    )
    .map((slot) => slot.entry)
}

export function getGroupDisplaySlots(
  group: RouteDisplayGroupKey,
  visibleRoutes: BusRoute[],
  prependListedIds: string[] = [],
): GroupedRouteDisplaySlot[] {
  const visibleIds = new Set(visibleRoutes.map((route) => route.id))
  const seenSlotKeys = new Set<string>()
  const seenListedIds = new Set<string>()
  const shown: GroupedRouteDisplaySlot[] = []

  const listedIds = [...prependListedIds, ...getRouteDisplayIdsForGroup(group)].filter((listedId) => {
    const key = listedId.trim().toLowerCase()
    if (!key || seenListedIds.has(key)) return false
    seenListedIds.add(key)
    return true
  })

  for (const listedId of listedIds) {
    const entry = resolveGroupedRouteEntry(listedId)
    if (!entry) continue
    const slotKey = groupedRouteDisplaySlotKey(entry)
    if (seenSlotKeys.has(slotKey)) continue
    if (!visibleIds.has(entry.route.id)) continue

    seenSlotKeys.add(slotKey)
    shown.push({
      listedId,
      entry,
      isVisible: true,
    })
  }

  shown.sort((a, b) => compareRouteNumber(a.listedId, b.listedId))

  return shown
}

function routeHasShiftOrSunshardGameUnlock(route: BusRoute): boolean {
  if (routeUsesSunshardUnlock(route)) return true
  const prereqs = getShiftUnlockPrerequisites(route)
  return (prereqs?.prerequisiteRouteNumbers.length ?? 0) > 0
}

/**
 * 特别分组中仅等级解锁的线路：进入常规列表，仍保留 serviceTypes 等属性。
 * 节日限定、阳光碎片、班次解锁仍留在锁定区。
 */
export function isLevelOnlySpecialListRoute(route: BusRoute): boolean {
  const groups = getRouteDisplayGroupsForRoute(route)
  if (!groups.includes('special') || groups.includes('seasonal')) return false
  if (routeHasShiftOrSunshardGameUnlock(route)) return false
  return (routeLevelRequired(route) ?? 0) > 0
}

/** 特别班次但无需等级/碎片/班次解锁（如 476*）：与常规线同列展示。 */
export function isUnlockFreeSpecialListRoute(route: BusRoute): boolean {
  const groups = getRouteDisplayGroupsForRoute(route)
  if (!groups.includes('special') || groups.includes('seasonal')) return false
  if (routeHasShiftOrSunshardGameUnlock(route)) return false
  if ((routeLevelRequired(route) ?? 0) > 0) return false
  return true
}

/** 应从锁定区移入常规列表的特别路线（纯等级或无需解锁）。 */
export function isNormalListEligibleSpecialRoute(route: BusRoute): boolean {
  return isLevelOnlySpecialListRoute(route) || isUnlockFreeSpecialListRoute(route)
}

/** 仅出现在锁定区：节日限定，或需阳光碎片/班次解锁的特别路线。 */
export function isLockedDisplayRoute(route: BusRoute): boolean {
  const groups = getRouteDisplayGroupsForRoute(route)
  if (groups.includes('seasonal')) return true
  if (groups.includes('special') && !isNormalListEligibleSpecialRoute(route)) return true
  return false
}

/** 常规列表：合并应展示在常规区的特别路线（保留 listedId / 方向与类型标签）。 */
export function mergeLevelOnlySpecialIntoNormalSlots(
  normalSlots: readonly GroupedRouteDisplaySlot[],
  visibleRoutes: BusRoute[],
): GroupedRouteDisplaySlot[] {
  const seenRouteIds = new Set(
    normalSlots.map((slot) => slot.entry?.route.id).filter((id): id is string => Boolean(id)),
  )
  const merged = [...normalSlots]

  for (const slot of getGroupDisplaySlots('special', visibleRoutes)) {
    if (!slot.entry || seenRouteIds.has(slot.entry.route.id)) continue
    if (!isNormalListEligibleSpecialRoute(slot.entry.route)) continue
    seenRouteIds.add(slot.entry.route.id)
    merged.push(slot)
  }

  merged.sort((a, b) => compareRouteNumber(a.listedId, b.listedId))
  return merged
}

/** 锁定区列表：去掉已归入常规列表的特别路线；保留阳光碎片/班次解锁卡片。 */
export function filterLockedSectionDisplaySlots(
  slots: readonly GroupedRouteDisplaySlot[],
): GroupedRouteDisplaySlot[] {
  return slots.filter((slot) => !slot.entry || !isNormalListEligibleSpecialRoute(slot.entry.route))
}

export function isDailyOnlyDisplayRoute(route: BusRoute): boolean {
  const groups = getRouteDisplayGroupsForRoute(route)
  if (!groups.includes('daily')) return false
  return !groups.some((group) => group === 'normal' || group === 'special' || group === 'seasonal')
}

export function filterRoutesForMainRouteList(routes: readonly BusRoute[]): BusRoute[] {
  return routes.filter((route) => !isDailyOnlyDisplayRoute(route))
}

export function mergeGroupDisplaySlots(
  groups: readonly RouteDisplayGroupKey[],
  slotsByGroup: Record<RouteDisplayGroupKey, GroupedRouteDisplaySlot[]>,
): GroupedRouteDisplaySlot[] {
  const seenSlotKeys = new Set<string>()
  const merged: GroupedRouteDisplaySlot[] = []

  for (const group of groups) {
    const groupMerged: GroupedRouteDisplaySlot[] = []
    for (const slot of slotsByGroup[group] ?? []) {
      if (!slot.isVisible || !slot.entry) continue
      const slotKey = groupedRouteDisplaySlotKeyFromSlot(slot)
      if (!slotKey || seenSlotKeys.has(slotKey)) continue
      seenSlotKeys.add(slotKey)
      groupMerged.push(slot)
    }
    groupMerged.sort((a, b) => compareRouteNumber(a.listedId, b.listedId))
    merged.push(...groupMerged)
  }

  return merged
}

export function countVisibleMergedSlots(slots: readonly GroupedRouteDisplaySlot[]): number {
  const seenSlotKeys = new Set<string>()
  let count = 0
  for (const slot of slots) {
    if (!slot.isVisible || !slot.entry) continue
    const slotKey = groupedRouteDisplaySlotKeyFromSlot(slot)
    if (!slotKey || seenSlotKeys.has(slotKey)) continue
    seenSlotKeys.add(slotKey)
    count++
  }
  return count
}
