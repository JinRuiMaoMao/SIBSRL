import routeTimetablesJson from '../../data/route-timetables.json'
import type { BusRoute } from '../types/route'
import type { GameRouteTimetableRecord, RouteTimetablesFile } from '../types/routeTimetableData'
import { DISPLAY_ONLY_RENAMES } from '../utils/routeMerge'

const file = routeTimetablesJson as unknown as RouteTimetablesFile

const byRouteKey = new Map<string, GameRouteTimetableRecord>(
  file.data.map((entry) => [entry.route, entry]),
)

export function getGameRouteTimetableRecord(routeKey: string): GameRouteTimetableRecord | null {
  return byRouteKey.get(routeKey) ?? null
}

export function listGameRouteTimetableKeys(): string[] {
  return [...byRouteKey.keys()]
}

/** 将本站线路号映射到 game routeData 的 route 字段 */
export function resolveGameRouteTimetableKey(route: BusRoute): string | null {
  const candidates: string[] = []
  const add = (value?: string) => {
    const v = value?.trim()
    if (!v || candidates.includes(v)) return
    candidates.push(v)
  }

  add(route.number)
  add(route.id)
  add(DISPLAY_ONLY_RENAMES[route.number])
  add(DISPLAY_ONLY_RENAMES[route.id])
  if (/A$/i.test(route.number)) add(route.number.slice(0, -1))

  for (const key of candidates) {
    if (byRouteKey.has(key)) return key
  }
  return null
}

export function routeHasStructuredTimetable(route: BusRoute): boolean {
  return resolveGameRouteTimetableKey(route) != null
}
