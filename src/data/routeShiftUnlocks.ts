import routeShiftUnlocksJson from '../../data/route-shift-unlocks.json'
import routeTimetablesJson from '../../data/route-timetables.json'
import type { BusRoute } from '../types/route'
import type { RouteTimetablesFile, TimetableScheduleEntry } from '../types/routeTimetableData'
import {
  getListedRouteIdsForRoute,
  resolveGroupedRouteEntry,
  getRouteDisplayIdsForGroup,
  type GroupedRouteDisplaySlot,
} from './routeDisplayGroups'
import { shouldOmitWholeRouteShiftUnlockSlot } from './routeSunshardUnlocks'
import {
  DISPLAY_ONLY_RENAMES,
  resolveSpecialRouteCodeToId,
  toMergeBaseRouteNumber,
  type DirectionKey,
} from '../utils/routeMerge'
import { compareRouteNumber } from '../utils/routeSort'

const file = routeTimetablesJson as unknown as RouteTimetablesFile

export interface StaticShiftUnlockEntry {
  unlockRoutes: string[]
  unlockFromDirectionKey?: DirectionKey
  targetRouteNumber?: string
  /** 为 false 时，该锁定项本身不能作为解锁其他线路的前置来源（如 C401A 北行） */
  canUnlockOthers?: boolean
  /** 满足前置后保证解锁所需班次数；1 表示 100% 解锁（如员工接驳反向） */
  guaranteedShifts?: number
}

const staticShiftUnlocks = routeShiftUnlocksJson as Record<string, StaticShiftUnlockEntry>

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

export interface ShiftUnlockLookupOptions {
  listedId?: string
  directionIndex?: number
}

interface ShiftUnlockTargetEdge {
  prerequisiteRoute: string
  prerequisiteDirectionKey?: DirectionKey
  targetRouteNumber: string
  guaranteedShifts: number
}

function resolveUnlockTargetRouteId(routeCode: string): string {
  return resolveSpecialRouteCodeToId(routeCode)
}

export function shiftUnlockSlotKey(routeId: string, directionKey?: DirectionKey): string {
  return directionKey ? `${routeId}|${directionKey}` : routeId
}

export function parseShiftUnlockSlotKey(key: string): { routeId: string; directionKey?: DirectionKey } {
  const pipe = key.indexOf('|')
  if (pipe < 0) return { routeId: key }
  return {
    routeId: key.slice(0, pipe),
    directionKey: key.slice(pipe + 1) as DirectionKey,
  }
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

function resolveDirectionKey(route: BusRoute, directionIndex?: number): DirectionKey | undefined {
  if (directionIndex == null) return undefined
  return route.stops?.[directionIndex]?.directionKey
}

function resolveShiftUnlockLookupKeys(
  route: BusRoute,
  options?: ShiftUnlockLookupOptions,
): string[] {
  const keys: string[] = []
  const listedId = options?.listedId?.trim()
  if (listedId) keys.push(listedId)

  const listedHasDirection = listedId?.includes('|') ?? false
  const listedIsWholeRoute =
    listedId != null &&
    !listedHasDirection &&
    (listedId.toLowerCase() === route.id.toLowerCase() ||
      listedId.toLowerCase() === route.number.toLowerCase())

  const directionKey = resolveDirectionKey(route, options?.directionIndex)
  if (directionKey && !listedIsWholeRoute) {
    const slotKey = shiftUnlockSlotKey(route.id, directionKey)
    if (!keys.includes(slotKey)) keys.push(slotKey)
  }

  if (!listedHasDirection) {
    keys.push(...routeLookupKeys(route))
  }

  return keys
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

function buildShiftUnlockMaps(): {
  prerequisitesByTarget: Map<string, Set<string>>
  targetEdges: ShiftUnlockTargetEdge[]
} {
  const prerequisitesByTarget = new Map<string, Set<string>>()
  const targetEdges: ShiftUnlockTargetEdge[] = []

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

          for (const prereq of entry.unlockRoutes) {
            targetEdges.push({
              prerequisiteRoute: prereq,
              targetRouteNumber: displayTargetNumber,
              guaranteedShifts: SHIFT_UNLOCK_GUARANTEED_SHIFTS,
            })
          }
        }
      }
    }
  }

  for (const [targetKey, entry] of Object.entries(staticShiftUnlocks)) {
    if (!entry.unlockRoutes?.length) continue

    addPrerequisiteMapping(targetKey, entry.unlockRoutes, prerequisitesByTarget)

    const { routeId } = parseShiftUnlockSlotKey(targetKey)
    const displayTargetNumber = entry.targetRouteNumber ?? toMergeBaseRouteNumber(routeId)

    for (const prereq of entry.unlockRoutes) {
      targetEdges.push({
        prerequisiteRoute: prereq,
        prerequisiteDirectionKey: entry.unlockFromDirectionKey,
        targetRouteNumber: displayTargetNumber,
        guaranteedShifts: entry.guaranteedShifts ?? SHIFT_UNLOCK_GUARANTEED_SHIFTS,
      })
    }
  }

  return { prerequisitesByTarget, targetEdges }
}

const { prerequisitesByTarget, targetEdges } = buildShiftUnlockMaps()

export function hasShiftUnlockPrerequisitesKey(key: string): boolean {
  const trimmed = key.trim()
  if (!trimmed) return false
  return (prerequisitesByTarget.get(trimmed)?.size ?? 0) > 0
}

export function routeHasDirectionalShiftUnlockSlots(route: BusRoute): boolean {
  const prefix = `${route.id}|`
  return Object.keys(staticShiftUnlocks).some((key) => key.startsWith(prefix))
}

/** @deprecated 使用 routeHasDirectionalShiftUnlockSlots */
export function routeHasVariantShiftUnlockListedIds(route: BusRoute): boolean {
  return routeHasDirectionalShiftUnlockSlots(route)
}

export function getShiftUnlockPrerequisites(
  route: BusRoute,
  options?: ShiftUnlockLookupOptions,
): RouteShiftUnlockPrerequisites | null {
  for (const key of resolveShiftUnlockLookupKeys(route, options)) {
    const prereqs = prerequisitesByTarget.get(key)
    if (!prereqs?.size) continue
    return {
      prerequisiteRouteNumbers: [...prereqs].sort(compareRouteNumber),
      guaranteedShifts: staticShiftUnlocks[key]?.guaranteedShifts ?? SHIFT_UNLOCK_GUARANTEED_SHIFTS,
    }
  }
  return null
}

export function getShiftUnlockTargets(
  route: BusRoute,
  options?: ShiftUnlockLookupOptions,
): RouteShiftUnlockTarget[] {
  const seen = new Set<string>()
  const targets: RouteShiftUnlockTarget[] = []
  const currentDirectionKey = resolveDirectionKey(route, options?.directionIndex)
  const sourceRoutes = new Set(routeLookupKeys(route))

  for (const edge of targetEdges) {
    if (!sourceRoutes.has(edge.prerequisiteRoute)) continue
    if (
      edge.prerequisiteDirectionKey &&
      currentDirectionKey &&
      edge.prerequisiteDirectionKey !== currentDirectionKey
    ) {
      continue
    }
    if (seen.has(edge.targetRouteNumber)) continue
    seen.add(edge.targetRouteNumber)
    targets.push({
      targetRouteId: edge.targetRouteNumber,
      targetRouteNumber: edge.targetRouteNumber,
      guaranteedShifts: edge.guaranteedShifts,
    })
  }

  return targets.sort((a, b) => compareRouteNumber(a.targetRouteNumber, b.targetRouteNumber))
}

export function formatShiftUnlockPrerequisiteRoutes(numbers: readonly string[]): string {
  return numbers.map((n) => `Route ${n}`).join(', ')
}

/** Locked-card copy: include required direction when a slot config specifies unlockFromDirectionKey. */
export function formatShiftUnlockPrerequisitesForLockedCard(
  route: BusRoute,
  options?: ShiftUnlockLookupOptions,
): string | null {
  const prereqs = getShiftUnlockPrerequisites(route, options)
  if (!prereqs) return null

  for (const key of resolveShiftUnlockLookupKeys(route, options)) {
    const staticEntry = staticShiftUnlocks[key]
    const prereqSet = prerequisitesByTarget.get(key)
    if (!staticEntry || !prereqSet?.size) continue

    const directionKey = staticEntry.unlockFromDirectionKey
    if (directionKey && prereqs.prerequisiteRouteNumbers.length === 1) {
      return `Route ${prereqs.prerequisiteRouteNumbers[0]} (${directionKey})`
    }
    break
  }

  return formatShiftUnlockPrerequisiteRoutes(prereqs.prerequisiteRouteNumbers)
}

/** 锁定卡标题方向：仅来自 slot 配置或 listedId 中的 `|N`/`|S`，不用 stops[directionIndex] 推断。 */
export function directionKeyForLockedDisplay(
  listedId?: string,
  slotDirectionKey?: DirectionKey,
): DirectionKey | undefined {
  if (slotDirectionKey) return slotDirectionKey
  if (!listedId) return undefined
  return parseShiftUnlockSlotKey(listedId).directionKey
}

export function lockedCardDisplayNumber(
  route: BusRoute,
  listedId?: string,
  slotDirectionKey?: DirectionKey,
): string | undefined {
  const resolvedDirectionKey = directionKeyForLockedDisplay(listedId, slotDirectionKey)
  if (resolvedDirectionKey) return `${route.number} (${resolvedDirectionKey})`
  if (listedId && listedId !== route.number && listedId !== route.id) return listedId
  return undefined
}

export function formatShiftUnlockTargetRoutes(numbers: readonly string[]): string {
  return numbers.join(', ')
}

export function resolveShiftUnlockListedRouteId(
  route: BusRoute,
  directionIndex: number,
): string | undefined {
  const directionKey = route.stops?.[directionIndex]?.directionKey
  if (directionKey) {
    const slotKey = shiftUnlockSlotKey(route.id, directionKey)
    if (hasShiftUnlockPrerequisitesKey(slotKey)) return slotKey
  }
  return undefined
}

function compareShiftUnlockSlotOrder(a: GroupedRouteDisplaySlot, b: GroupedRouteDisplaySlot): number {
  const routeCmp = compareRouteNumber(a.entry?.route.number ?? a.listedId, b.entry?.route.number ?? b.listedId)
  if (routeCmp !== 0) return routeCmp
  const dirA = a.entry?.directionKey
  const dirB = b.entry?.directionKey
  if (dirA === 'N' && dirB === 'S') return -1
  if (dirA === 'S' && dirB === 'N') return 1
  return compareRouteNumber(a.listedId, b.listedId)
}

function resolveRouteForShiftUnlockSlot(
  routeId: string,
  visibleRoutes: readonly BusRoute[],
): BusRoute | null {
  return visibleRoutes.find((route) => route.id === routeId) ?? null
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

  for (const targetKey of Object.keys(staticShiftUnlocks).sort(compareRouteNumber)) {
    const entryConfig = staticShiftUnlocks[targetKey]
    if (!entryConfig?.unlockRoutes?.length) continue

    const { routeId, directionKey } = parseShiftUnlockSlotKey(targetKey)
    const route = resolveRouteForShiftUnlockSlot(routeId, visibleRoutes)
    if (!route || !visibleIds.has(route.id.toLowerCase())) continue
    if (shouldOmitWholeRouteShiftUnlockSlot(route, targetKey)) continue
    if (lockedRouteIds.has(route.id.toLowerCase()) && !routeHasDirectionalShiftUnlockSlots(route)) continue

    slots.push({
      listedId: targetKey,
      entry: {
        listedId: targetKey,
        route,
        directionKey,
      },
      isVisible: true,
    })
  }

  return slots.sort(compareShiftUnlockSlotOrder)
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

  return merged
}

export function getShiftUnlockLockedRouteIds(
  visibleRoutes: readonly BusRoute[],
): Set<string> {
  return new Set(
    getShiftUnlockLockedDisplaySlots(visibleRoutes).map((slot) => slot.entry!.route.id),
  )
}

/** 可解锁路线 · 开特定线路：需完成前置班次，或跑本线有机会解锁后续线路。 */
export function routeBelongsToShiftUnlockCategory(
  route: BusRoute,
  options?: ShiftUnlockLookupOptions,
): boolean {
  if ((getShiftUnlockPrerequisites(route, options)?.prerequisiteRouteNumbers.length ?? 0) > 0) {
    return true
  }
  return getShiftUnlockTargets(route, options).length > 0
}
