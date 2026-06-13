import type { BusRoute } from '../types/route'
import routeDisplayGroupsJson from '../../data/route-display-groups.json'
import {
  DISPLAY_ONLY_RENAMES,
  getMergeDirectionKey,
  mergeRoutesByBaseNumber,
  toMergeBaseRouteNumber,
} from '../utils/routeMerge'
import { compareRouteNumber } from '../utils/routeSort'
import { routes } from './routes'

export type RouteDisplayGroupKey = 'normal' | 'daily' | 'seasonal'

export const ROUTE_DISPLAY_GROUP_ORDER: RouteDisplayGroupKey[] = ['normal', 'daily', 'seasonal']

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

export function getRouteDisplayIdsForGroup(group: RouteDisplayGroupKey): string[] {
  return groupRouteIds[group] ?? []
}

export function getRouteDisplayEntriesForGroup(group: RouteDisplayGroupKey): GroupedRouteEntry[] {
  const seenRouteIds = new Set<string>()
  const entries: GroupedRouteEntry[] = []

  for (const listedId of getRouteDisplayIdsForGroup(group)) {
    const entry = resolveGroupedRouteEntry(listedId)
    if (!entry || seenRouteIds.has(entry.route.id)) continue
    seenRouteIds.add(entry.route.id)
    entries.push(entry)
  }

  return entries.sort((a, b) => compareRouteNumber(a.route.number, b.route.number))
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
): GroupedRouteDisplaySlot[] {
  const visibleIds = new Set(visibleRoutes.map((route) => route.id))
  const seenRouteIds = new Set<string>()
  const shown: GroupedRouteDisplaySlot[] = []
  const hidden: GroupedRouteDisplaySlot[] = []

  for (const listedId of getRouteDisplayIdsForGroup(group)) {
    const entry = resolveGroupedRouteEntry(listedId)

    if (!entry) {
      hidden.push({ listedId, entry: null, isVisible: false })
      continue
    }

    if (seenRouteIds.has(entry.route.id)) continue
    seenRouteIds.add(entry.route.id)

    const slot: GroupedRouteDisplaySlot = {
      listedId,
      entry,
      isVisible: visibleIds.has(entry.route.id),
    }

    if (slot.isVisible) shown.push(slot)
    else hidden.push(slot)
  }

  shown.sort((a, b) => compareRouteNumber(a.entry!.route.number, b.entry!.route.number))
  hidden.sort((a, b) => compareRouteNumber(a.listedId, b.listedId))

  return [...shown, ...hidden]
}
