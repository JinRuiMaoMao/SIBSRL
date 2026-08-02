import routeShiftUnlocksJson from '../../data/route-shift-unlocks.json'
import routeTimetablesJson from '../../data/route-timetables.json'
import type { BusRoute } from '../types/route'
import type { RouteTimetablesFile, TimetableScheduleEntry } from '../types/routeTimetableData'
import { getListedRouteIdsForRoute } from './routeDisplayGroups'
import { DISPLAY_ONLY_RENAMES, resolveSpecialRouteCodeToId } from '../utils/routeMerge'
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

function applyShiftUnlockEntry(
  targetRouteId: string,
  unlockRoutes: readonly string[],
  prerequisitesByTarget: Map<string, Set<string>>,
  targetsByPrerequisite: Map<string, Map<string, string>>,
): void {
  addPrerequisiteMapping(targetRouteId, unlockRoutes, prerequisitesByTarget)
  addUnlockTargetMapping(targetRouteId, unlockRoutes, targetsByPrerequisite)
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
    applyShiftUnlockEntry(
      targetRouteId,
      entry.unlockRoutes,
      prerequisitesByTarget,
      targetsByPrerequisite,
    )
  }

  return { prerequisitesByTarget, targetsByPrerequisite }
}

const { prerequisitesByTarget, targetsByPrerequisite } = buildShiftUnlockMaps()

export function getShiftUnlockPrerequisites(route: BusRoute): RouteShiftUnlockPrerequisites | null {
  for (const key of routeLookupKeys(route)) {
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
