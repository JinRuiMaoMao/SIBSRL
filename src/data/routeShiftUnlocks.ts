import routeShiftUnlocksJson from '../../data/route-shift-unlocks.json'
import routeTimetablesJson from '../../data/route-timetables.json'
import type { BusRoute } from '../types/route'
import type { RouteTimetablesFile, TimetableScheduleEntry } from '../types/routeTimetableData'
import {
  getListedRouteIdsForRoute,
  resolveGroupedRouteEntry,
  getRouteDisplayIdsForGroup,
  ROUTE_DISPLAY_GROUP_ORDER,
  type GroupedRouteDisplaySlot,
} from './routeDisplayGroups'
import { DISPLAY_ONLY_RENAMES, getMergeDirectionKey, resolveSpecialRouteCodeToId, toMergeBaseRouteNumber } from '../utils/routeMerge'
import { compareRouteNumber } from '../utils/routeSort'

const file = routeTimetablesJson as unknown as RouteTimetablesFile
const staticShiftUnlocks = routeShiftUnlocksJson as Record<string, { unlockRoutes: string[] }>

/** 游戏内：满足条件后保证解锁所需班次（与 UI 文案一致） */
export const SHIFT_UNLOCK_GUARANTEED_SHIFTS = 50

export interface RouteShiftUnlockPrerequisites {
  prerequisiteRouteNumbers: string[]
  guaranteedShifts: number
}

export interface RouteShiftUnlockTarget {
  targetRouteId: string
  targetRouteNumber: string
  guaranteedShifts: number
}

function resolveUnlockTargetRouteId(routeCode: string): string {
  return resolveSpecialRouteCodeToId(routeCode)
}

function routeLookupKeys(route: BusRoute): string[] {
  const keys = new Set<string>()
  for (const value of [route.id, route.number, ...getListedRouteIdsForRoute(route)]) {
    const trimmed = value.trim()
    if (trimmed) keys.add(trimmed)
  }
  for (const value of [route.id, route.number]) {
    const renamed = DISPLAY_ONLY_RENAMES[value]
    if (renamed) keys.add(renamed)
  }
  for (const [from, to] of Object.entries(DISPLAY_ONLY_RENAMES)) {
    if (to === route.id || to === route.number) keys.add(from)
  }
  return [...keys]
}

function addPrerequisiteMapping(
  targetKey: string,
  prerequisiteRoutes: readonly string[],
  prerequisitesByTarget: Map<string, Set<string>>,
): void {
  const prereqSet = prerequisitesByTarget.get(targetKey) ?? new Set<string>()
  for (const prereq of prerequisiteRoutes) {
    prereqSet.add(prereq)
  }
  prerequisitesByTarget.set(targetKey, prereqSet)
}

function addUnlockTargetMapping(
  displayTargetNumber: string,
  prerequisiteRoutes: readonly string[],
  targetsByPrerequisite: Map<string, Map<string, string>>,
): void {
  for (const prereq of prerequisiteRoutes) {
    const byTarget = targetsByPrerequisite.get(prereq) ?? new Map<string, string>()
    byTarget.set(displayTargetNumber, displayTargetNumber)
    targetsByPrerequisite.set(prereq, byTarget)
  }
}

function buildShiftUnlockMaps(): {
  prerequisitesByTarget: Map<string, Set<string>>
  targetsByPrerequisite: Map<string, Map<string, string>>
} {
  const prerequisitesByTarget = new Map<string, Set<string>>()
  const targetsByPrerequisite = new Map<string, Map<string, string>>()

  for (const record of file.data) {
    const parentRouteNumber = record.route?.trim() || null
    for (const bound of Object.values(record.timetable ?? {})) {
      for (const shiftEntries of Object.values(bound)) {
        for (const rawEntry of shiftEntries) {
          const entry = rawEntry as TimetableScheduleEntry
          if (!entry.unlockRoutes?.length || !entry.routeCode) continue

          const variantTargetId = resolveUnlockTargetRouteId(entry.routeCode)
          const displayTargetNumber = parentRouteNumber ?? variantTargetId

          addPrerequisiteMapping(variantTargetId, entry.unlockRoutes, prerequisitesByTarget)

          if (parentRouteNumber && parentRouteNumber !== variantTargetId) {
            addPrerequisiteMapping(parentRouteNumber, entry.unlockRoutes, prerequisitesByTarget)
          }

          addUnlockTargetMapping(displayTargetNumber, entry.unlockRoutes, targetsByPrerequisite)
        }
      }
    }
  }

  for (const [targetRouteId, entry] of Object.entries(staticShiftUnlocks)) {
    if (!entry.unlockRoutes?.length) continue

    addPrerequisiteMapping(targetRouteId, entry.unlockRoutes, prerequisitesByTarget)

    const displayTargetNumber = toMergeBaseRouteNumber(targetRouteId)
    if (displayTargetNumber !== targetRouteId) {
      // 变体编号（如 C401AW）只注册自身；不合并到展示线路 id，避免 C401A 出现混合前置条件。
    }

    addUnlockTargetMapping(displayTargetNumber, entry.unlockRoutes, targetsByPrerequisite)
  }

  return { prerequisitesByTarget, targetsByPrerequisite }
}

const { prerequisitesByTarget, targetsByPrerequisite } = buildShiftUnlockMaps()

export function hasShiftUnlockPrerequisitesKey(key: string): boolean {
  const trimmed = key.trim()
  if (!trimmed) return false
  return (prerequisitesByTarget.get(trimmed)?.size ?? 0) > 0
}

export function routeHasVariantShiftUnlockListedIds(route: BusRoute): boolean {
  return getListedRouteIdsForRoute(route).some((listedId) => hasShiftUnlockPrerequisitesKey(listedId))
}

export function getShiftUnlockPrerequisites(
  route: BusRoute,
  options?: { listedId?: string },
): RouteShiftUnlockPrerequisites | null {
  const keys: string[] = []
  if (options?.listedId?.trim()) keys.push(options.listedId.trim())
  keys.push(...routeLookupKeys(route))

  for (const key of keys) {
    const prereqs = prerequisitesByTarget.get(key)
    if (!prereqs?.size) continue
    return {
      prerequisiteRouteNumbers: [...prereqs].sort(compareRouteNumber),
      guaranteedShifts: SHIFT_UNLOCK_GUARANTEED_SHIFTS,
    }
  }
  return null
}

export function getShiftUnlockTargets(route: BusRoute): RouteShiftUnlockTarget[] {
  const seen = new Set<string>()
  const targets: RouteShiftUnlockTarget[] = []

  for (const key of routeLookupKeys(route)) {
    const byTarget = targetsByPrerequisite.get(key)
    if (!byTarget) continue
    for (const [targetId, targetRouteNumber] of byTarget) {
      if (seen.has(targetId)) continue
      seen.add(targetId)
      targets.push({
        targetRouteId: targetId,
        targetRouteNumber,
        guaranteedShifts: SHIFT_UNLOCK_GUARANTEED_SHIFTS,
      })
    }
  }

  return targets.sort((a, b) => compareRouteNumber(a.targetRouteNumber, b.targetRouteNumber))
}

export function formatShiftUnlockPrerequisiteRoutes(numbers: readonly string[]): string {
  return numbers.map((n) => `Route ${n}`).join(', ')
}

/** 详情页解锁目标：编号用逗号连接，前缀 Route 由 i18n 模板提供。 */
export function formatShiftUnlockTargetRoutes(numbers: readonly string[]): string {
  return numbers.join(', ')
}

export function resolveShiftUnlockListedRouteId(
  route: BusRoute,
  directionIndex: number,
): string | undefined {
  const listedIds = getListedRouteIdsForRoute(route)
  const unlockListedIds = listedIds.filter((listedId) => hasShiftUnlockPrerequisitesKey(listedId))
  if (unlockListedIds.length === 1) return unlockListedIds[0]
  if (unlockListedIds.length >= 2) {
    const directionKey = route.stops?.[directionIndex]?.directionKey
    if (directionKey) {
      const match = unlockListedIds.find((listedId) => getMergeDirectionKey(listedId) === directionKey)
      if (match) return match
    }
  }
  return undefined
}

/** 常规分组内、需班次解锁但未列入 special/seasonal 的锁定卡片（如员工接驳）。 */
export function getShiftUnlockLockedDisplaySlots(
  visibleRoutes: readonly BusRoute[],
): GroupedRouteDisplaySlot[] {
  const visibleIds = new Set(visibleRoutes.map((route) => route.id.toLowerCase()))
  const lockedRouteIds = new Set(
    ['special', 'seasonal'].flatMap((group) =>
      getRouteDisplayIdsForGroup(group as 'special' | 'seasonal').map((listedId) => {
        const entry = resolveGroupedRouteEntry(listedId)
        return entry?.route.id.toLowerCase() ?? ''
      }),
    ),
  )

  const slots: GroupedRouteDisplaySlot[] = []
  const seenListedIds = new Set<string>()

  for (const listedId of getRouteDisplayIdsForGroup('normal')) {
    const key = listedId.trim()
    const lower = key.toLowerCase()
    if (!key || seenListedIds.has(lower)) continue

    const entry = resolveGroupedRouteEntry(listedId)
    if (!entry || !visibleIds.has(entry.route.id.toLowerCase())) continue
    if (lockedRouteIds.has(entry.route.id.toLowerCase())) continue

    if (hasShiftUnlockPrerequisitesKey(key)) {
      seenListedIds.add(lower)
      slots.push({ listedId: key, entry, isVisible: true })
      continue
    }

    if (
      hasShiftUnlockPrerequisitesKey(entry.route.id) &&
      !routeHasVariantShiftUnlockListedIds(entry.route) &&
      !slots.some((slot) => slot.entry?.route.id.toLowerCase() === entry.route.id.toLowerCase())
    ) {
      seenListedIds.add(lower)
      slots.push({ listedId: key, entry, isVisible: true })
    }
  }

  return slots.sort((a, b) => compareRouteNumber(a.listedId, b.listedId))
}

export function mergeShiftUnlockLockedDisplaySlots(
  lockedSlots: readonly GroupedRouteDisplaySlot[],
  shiftUnlockSlots: readonly GroupedRouteDisplaySlot[],
): GroupedRouteDisplaySlot[] {
  const seenListedIds = new Set(lockedSlots.map((slot) => slot.listedId.toLowerCase()))
  const merged = [...lockedSlots]

  for (const slot of shiftUnlockSlots) {
    const lower = slot.listedId.toLowerCase()
    if (seenListedIds.has(lower)) continue
    seenListedIds.add(lower)
    merged.push(slot)
  }

  return merged.sort((a, b) => compareRouteNumber(a.listedId, b.listedId))
}
