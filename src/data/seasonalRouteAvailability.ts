import seasonalAvailabilityJson from '../../data/seasonal-route-availability.json'
import { getListedRouteIdsForRoute } from './routeDisplayGroups'
import { todayHktDateString } from './dailyChallenge'
import type { Locale } from '../i18n/types'
import type { BusRoute } from '../types/route'

export interface SeasonalAvailabilityWindow {
  start: string
  end?: string
  promoteBelowDailyChallenge?: boolean
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

function routeAvailabilityKeys(route: BusRoute): string[] {
  return [route.id, route.number, ...getListedRouteIdsForRoute(route)]
}

/** 季节限定线路是否已到开放期（HKT 游戏日） */
export function isSeasonalRouteUnlocked(route: BusRoute, now = new Date()): boolean {
  return getSeasonalRouteActiveWindow(route, now) != null
}

/** 当前 HKT 游戏日命中的开放窗口；无 end 表示开放中且尚未公布结束日。 */
export function getSeasonalRouteActiveWindow(
  route: BusRoute,
  now = new Date(),
): SeasonalAvailabilityWindow | null {
  const date = todayHktDateString(now)
  const keys = new Set<string>(routeAvailabilityKeys(route))

  for (const key of keys) {
    const windows = lookupWindows(key)
    if (!windows) continue
    const active = windows.find((window) => isDateInWindow(date, window))
    if (active) return active
  }

  return null
}

function addGameDays(date: string, days: number): string {
  const base = Date.parse(`${date}T00:00:00+08:00`)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong' }).format(
    new Date(base + days * 86_400_000),
  )
}

export function formatSeasonalGameDayShort(date: string, _locale: Locale): string {
  const [, month, day] = date.split('-').map(Number)
  return `${month}/${day}`
}

export function getSeasonalUnavailableFromDate(window: SeasonalAvailabilityWindow): string | null {
  if (!window.end) return null
  return addGameDays(window.end, 1)
}

/** 距季节开放窗口结束（end 日次日 08:00 HKT）的毫秒数 */
export function getMsUntilSeasonalWindowEnds(
  window: SeasonalAvailabilityWindow,
  now = new Date(),
): number | null {
  const unavailableFrom = getSeasonalUnavailableFromDate(window)
  if (!unavailableFrom) return null
  const endMs = Date.parse(`${unavailableFrom}T08:00:00+08:00`)
  return Math.max(0, endMs - now.getTime())
}

export function formatSeasonalAvailabilityCountdown(ms: number): string {
  if (ms <= 0) return '00d 00h'
  const totalHours = Math.floor(ms / 3_600_000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h`
}

export interface SeasonalAvailabilityLabels {
  range: string
  unavailableFrom: string | null
}

export function getSeasonalAvailabilityLabels(
  window: SeasonalAvailabilityWindow,
  locale: Locale,
  t: (key: 'seasonalAvailabilityRange' | 'seasonalAvailabilityUnavailableFrom', params: Record<string, string>) => string,
): SeasonalAvailabilityLabels {
  const start = formatSeasonalGameDayShort(window.start, locale)
  const end = window.end ? formatSeasonalGameDayShort(window.end, locale) : null
  const range =
    end != null
      ? t('seasonalAvailabilityRange', { start, end })
      : t('seasonalAvailabilityRange', { start, end: start })
  const unavailableFromDate = getSeasonalUnavailableFromDate(window)
  const unavailableFrom = unavailableFromDate
    ? t('seasonalAvailabilityUnavailableFrom', {
        date: formatSeasonalGameDayShort(unavailableFromDate, locale),
      })
    : null
  return { range, unavailableFrom }
}

export function shouldPromoteSeasonalRouteBelowDailyChallenge(
  route: BusRoute,
  now = new Date(),
): boolean {
  const window = getSeasonalRouteActiveWindow(route, now)
  return window?.promoteBelowDailyChallenge === true
}
