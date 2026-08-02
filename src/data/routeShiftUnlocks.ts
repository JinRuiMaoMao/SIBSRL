import routeTimetablesJson from '../../data/route-timetables.json'
import type { BusRoute } from '../types/route'
import type { RouteTimetablesFile, TimetableScheduleEntry } from '../types/routeTimetableData'
import { getListedRouteIdsForRoute } from './routeDisplayGroups'
import { resolveSpecialRouteCodeToId } from '../utils/routeMerge'
import { compareRouteNumber } from '../utils/routeSort'

const file = routeTimetablesJson as unknown as RouteTimetablesFile

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
  return [...keys]
}

function buildShiftUnlockMaps(): {
  prerequisitesByTarget: Map<string, Set<string>>
  targetsByPrerequisite: Map<string, Map<string, string>>
} {
  const prerequisitesByTarget = new Map<string, Set<string>>()
  const targetsByPrerequisite = new Map<string, Map<string, string>>()

  for (const record of file.data) {
    for (const bound of Object.values(record.timetable ?? {})) {
      for (const shiftEntries of Object.values(bound)) {
        for (const rawEntry of shiftEntries) {
          const entry = rawEntry as TimetableScheduleEntry
          if (!entry.unlockRoutes?.length || !entry.routeCode) continue

          const targetId = resolveUnlockTargetRouteId(entry.routeCode)
          const prereqSet = prerequisitesByTarget.get(targetId) ?? new Set<string>()
          for (const prereq of entry.unlockRoutes) {
            prereqSet.add(prereq)
          }
          prerequisitesByTarget.set(targetId, prereqSet)

          for (const prereq of entry.unlockRoutes) {
            const byTarget = targetsByPrerequisite.get(prereq) ?? new Map<string, string>()
            byTarget.set(targetId, targetId)
            targetsByPrerequisite.set(prereq, byTarget)
          }
        }
      }
    }
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
