import seasonalAvailabilityJson from '../../data/seasonal-route-availability.json'
import { getListedRouteIdsForRoute } from './routeDisplayGroups'
import { todayHktDateString } from './dailyChallenge'
import type { BusRoute } from '../types/route'

interface SeasonalAvailabilityWindow {
  start: string
  end?: string
}

type SeasonalAvailabilityMap = Record<string, SeasonalAvailabilityWindow[]>

const availabilityMap = seasonalAvailabilityJson as SeasonalAvailabilityMap & {
  _comment?: string
}

function lookupWindows(routeKey: string): SeasonalAvailabilityWindow[] | undefined {
  const direct = availabilityMap[routeKey] ?? availabilityMap[routeKey.toUpperCase()]
  return direct?.length ? direct : undefined
}

function isDateInWindow(date: string, window: SeasonalAvailabilityWindow): boolean {
  if (date < window.start) return false
  if (window.end && date > window.end) return false
  return true
}

/** 季节限定线路是否已到开放期（HKT 游戏日） */
export function isSeasonalRouteUnlocked(route: BusRoute, now = new Date()): boolean {
  const date = todayHktDateString(now)
  const keys = new Set<string>([route.id, route.number, ...getListedRouteIdsForRoute(route)])

  for (const key of keys) {
    const windows = lookupWindows(key)
    if (!windows) continue
    if (windows.some((window) => isDateInWindow(date, window))) return true
  }

  return false
}
