import routeShiftUnlocksJson from '../../data/route-shift-unlocks.json'
import {
  getRouteDisplayIdsForGroup,
  resolveGroupedRouteEntry,
} from '../data/routeDisplayGroups'
import { routes } from '../data/routes'
import type { BusRoute } from '../types/route'
import { isRouteStopDataComplete } from './routeCompleteness'
import {
  DISPLAY_ONLY_RENAMES,
  EXACT_MERGE,
  getMergeDirectionKey,
  mergeRoutesByBaseNumber,
  resolveSpecialRouteCodeToId,
  type DirectionKey,
} from './routeMerge'
import { compareRouteNumber } from './routeSort'
import type { GroupedRouteEntry } from '../data/routeDisplayGroups'

export type PlayableRouteCatalogSection = 'anytime' | 'daily' | 'seasonal'

export interface PlayableRouteCatalogEntry {
  code: string
  route: BusRoute
  finished: boolean
}

export interface PlayableRouteCatalog {
  anytime: PlayableRouteCatalogEntry[]
  daily: PlayableRouteCatalogEntry[]
  seasonal: PlayableRouteCatalogEntry[]
}

export interface PlayableRouteSelection {
  routeId: string
  directionIndex: number
}

const shiftUnlockConfig = routeShiftUnlocksJson as Record<
  string,
  { targetRouteNumber?: string }
>

const displayRoutes = mergeRoutesByBaseNumber(routes)
const displayRouteById = new Map(displayRoutes.map((route) => [route.id.toLowerCase(), route]))

const STAFF_SHUTTLE_GAME_SUFFIX: Record<string, { N: string; S: string }> = {
  C01: { N: 'N', S: 'S' },
  C401: { N: 'W', S: 'E' },
  C401A: { N: 'W', S: 'E' },
  F701: { N: 'W', S: 'E' },
  F702: { N: 'W', S: 'E' },
}

const EXTRA_ANYTIME_ROUTE_IDS = ['C01', 'C401', 'C401A', 'F701', 'F702'] as const

const EXTRA_CODES_BY_LISTED: Record<string, string[]> = {
  U47N: ['U47N2'],
  U47S: ['U47S2'],
}

function preferredDisplayCode(listedId: string): string {
  for (const [alias, target] of Object.entries(DISPLAY_ONLY_RENAMES)) {
    if (target === listedId) return alias
  }
  return listedId
}

function appendBidirectionalBaseCodes(entry: GroupedRouteEntry, codes: Set<string>) {
  if (getMergeDirectionKey(entry.listedId)) return
  if ((entry.route.stops?.length ?? 0) < 2) return

  for (const stop of entry.route.stops ?? []) {
    if (!stop.directionKey) continue
    codes.add(`${entry.route.number}${stop.directionKey}`)
  }
}

function expandListedIdToGameCodes(listedId: string): string[] {
  const codes = new Set<string>([preferredDisplayCode(listedId)])
  const entry = resolveGroupedRouteEntry(listedId)
  if (!entry) return [...codes]

  appendBidirectionalBaseCodes(entry, codes)

  const bases = new Set([entry.route.id, entry.route.number])
  for (const [alias, target] of Object.entries(EXACT_MERGE)) {
    if (bases.has(target.base)) codes.add(alias)
  }

  for (const extra of EXTRA_CODES_BY_LISTED[listedId] ?? []) {
    codes.add(extra)
  }

  return [...codes]
}

function appendStaffShuttleCodes(route: BusRoute, codes: Set<string>) {
  const suffixMap = STAFF_SHUTTLE_GAME_SUFFIX[route.id]
  if (!suffixMap) return

  for (const stop of route.stops ?? []) {
    if (stop.directionKey === 'N') codes.add(`${route.number}${suffixMap.N}`)
    if (stop.directionKey === 'S') codes.add(`${route.number}${suffixMap.S}`)
  }

  for (const entry of Object.values(shiftUnlockConfig)) {
    const target = entry.targetRouteNumber
    if (!target) continue
    if (resolveSpecialRouteCodeToId(target) === route.id) codes.add(target)
  }
}

function buildSectionFromListedIds(listedIds: readonly string[]): PlayableRouteCatalogEntry[] {
  const seenCodes = new Set<string>()
  const entries: PlayableRouteCatalogEntry[] = []

  for (const listedId of listedIds) {
    const entry = resolveGroupedRouteEntry(listedId)
    if (!entry) continue

    const codes = new Set(expandListedIdToGameCodes(listedId))
    if (STAFF_SHUTTLE_GAME_SUFFIX[entry.route.id]) {
      appendStaffShuttleCodes(entry.route, codes)
    }

    for (const code of codes) {
      const key = code.toLowerCase()
      if (seenCodes.has(key)) continue
      seenCodes.add(key)
      entries.push({
        code,
        route: entry.route,
        finished: isRouteStopDataComplete(entry.route),
      })
    }
  }

  return entries.sort((a, b) => compareRouteNumber(a.code, b.code))
}

function buildExtraAnytimeEntries(): PlayableRouteCatalogEntry[] {
  const entries: PlayableRouteCatalogEntry[] = []
  const seenCodes = new Set<string>()

  for (const routeId of EXTRA_ANYTIME_ROUTE_IDS) {
    const route = displayRouteById.get(routeId.toLowerCase())
    if (!route) continue

    const codes = new Set<string>()
    appendStaffShuttleCodes(route, codes)

    for (const [alias, target] of Object.entries(EXACT_MERGE)) {
      if (target.base === route.id) codes.add(alias)
    }

    for (const code of codes) {
      const key = code.toLowerCase()
      if (seenCodes.has(key)) continue
      seenCodes.add(key)
      entries.push({
        code,
        route,
        finished: isRouteStopDataComplete(route),
      })
    }
  }

  return entries.sort((a, b) => compareRouteNumber(a.code, b.code))
}

function mergeSectionEntries(
  primary: PlayableRouteCatalogEntry[],
  extra: PlayableRouteCatalogEntry[],
): PlayableRouteCatalogEntry[] {
  const seenCodes = new Set(primary.map((entry) => entry.code.toLowerCase()))
  const merged = [...primary]

  for (const entry of extra) {
    const key = entry.code.toLowerCase()
    if (seenCodes.has(key)) continue
    seenCodes.add(key)
    merged.push(entry)
  }

  return merged.sort((a, b) => compareRouteNumber(a.code, b.code))
}

export function buildPlayableRouteCatalog(): PlayableRouteCatalog {
  const anytimeListedIds = [
    ...getRouteDisplayIdsForGroup('normal'),
    ...getRouteDisplayIdsForGroup('special'),
  ]

  return {
    anytime: mergeSectionEntries(
      buildSectionFromListedIds(anytimeListedIds),
      buildExtraAnytimeEntries(),
    ),
    daily: buildSectionFromListedIds(getRouteDisplayIdsForGroup('daily')),
    seasonal: buildSectionFromListedIds(getRouteDisplayIdsForGroup('seasonal')),
  }
}

function directionIndexForKey(route: BusRoute, directionKey?: DirectionKey): number {
  if (!directionKey) return 0
  const idx = route.stops?.findIndex((stop) => stop.directionKey === directionKey) ?? -1
  return idx >= 0 ? idx : 0
}

export function resolvePlayableRouteCode(code: string): PlayableRouteSelection | null {
  const trimmed = code.trim()
  if (!trimmed) return null

  const grouped = resolveGroupedRouteEntry(trimmed)
  if (grouped) {
    return {
      routeId: grouped.route.id,
      directionIndex: directionIndexForKey(grouped.route, grouped.directionKey),
    }
  }

  const renamed = DISPLAY_ONLY_RENAMES[trimmed]
  if (renamed) {
    const route = displayRouteById.get(renamed.toLowerCase())
    if (route) return { routeId: route.id, directionIndex: 0 }
  }

  const routeId = resolveSpecialRouteCodeToId(trimmed)
  const route = displayRouteById.get(routeId.toLowerCase())
  if (!route) return null

  const directionKey = getMergeDirectionKey(trimmed)
  return {
    routeId: route.id,
    directionIndex: directionIndexForKey(route, directionKey ?? undefined),
  }
}
