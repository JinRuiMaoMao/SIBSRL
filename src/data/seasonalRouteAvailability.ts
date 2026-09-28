import eventsJson from '../../data/upcoming-game-events.json'
import {
  getNextOccurrenceStart,
  isMonthDayInWindow,
  monthDayFromDate,
  resolveOccurrenceDates,
  resolveOccurrenceDatesFromStart,
} from '../utils/recurringGameCalendar'
import { getListedRouteIdsForRoute } from './routeDisplayGroups'
import { todayHktDateString } from './dailyChallenge'
import type { Locale } from '../i18n/types'
import type { BilingualText } from '../types/route'
import type { BusRoute } from '../types/route'

export interface SeasonalAvailabilityWindow {
  start: string
  end?: string
  promoteBelowDailyChallenge?: boolean
  eventId?: string
  eventTitle?: BilingualText
}

interface FestivalRouteBinding {
  startMonthDay: string
  endMonthDay: string
  displayEndMonthDay: string
  eventId: string
  eventTitle: BilingualText
}

interface StoredFestivalEvent {
  id: string
  title: BilingualText
  start: string
  end?: string
  playableEnd?: string
  detail?: {
    routes?: Array<{ code: string }>
  }
}

const festivalEvents = (eventsJson as { events: StoredFestivalEvent[] }).events

function playableEndMonthDay(event: StoredFestivalEvent): string {
  return event.playableEnd ?? event.end ?? event.start
}

function displayEndMonthDay(event: StoredFestivalEvent): string {
  return event.end ?? event.start
}

function buildRouteBindings(): Map<string, FestivalRouteBinding[]> {
  const map = new Map<string, FestivalRouteBinding[]>()

  for (const event of festivalEvents) {
    const routes = event.detail?.routes
    if (!routes?.length) continue

    const binding: FestivalRouteBinding = {
      startMonthDay: event.start,
      endMonthDay: playableEndMonthDay(event),
      displayEndMonthDay: displayEndMonthDay(event),
      eventId: event.id,
      eventTitle: event.title,
    }

    for (const route of routes) {
      const list = map.get(route.code) ?? []
      list.push(binding)
      map.set(route.code, list)
    }
  }

  return map
}

const routeBindings = buildRouteBindings()

function lookupBindings(routeKey: string): FestivalRouteBinding[] | undefined {
  const direct = routeBindings.get(routeKey) ?? routeBindings.get(routeKey.toUpperCase())
  return direct?.length ? direct : undefined
}

function routeAvailabilityKeys(route: BusRoute): string[] {
  return [route.id, route.number, ...getListedRouteIdsForRoute(route)]
}

function bindingToActiveWindow(
  today: string,
  binding: FestivalRouteBinding,
): SeasonalAvailabilityWindow | null {
  const todayMd = monthDayFromDate(today)
  if (!isMonthDayInWindow(todayMd, binding.startMonthDay, binding.endMonthDay)) {
    return null
  }

  const resolved = resolveOccurrenceDates(today, binding.startMonthDay, binding.endMonthDay)
  if (!resolved) return null

  return {
    start: resolved.start,
    end: resolved.end,
    eventId: binding.eventId,
    eventTitle: binding.eventTitle,
    promoteBelowDailyChallenge: binding.eventId === 'ft-anniversary' ? true : undefined,
  }
}

function bindingToNextWindow(
  today: string,
  binding: FestivalRouteBinding,
): SeasonalAvailabilityWindow {
  const nextStart = getNextOccurrenceStart(today, binding.startMonthDay, binding.endMonthDay)
  const resolved = resolveOccurrenceDatesFromStart(
    nextStart,
    binding.startMonthDay,
    binding.displayEndMonthDay,
  )

  return {
    start: resolved.start,
    end: resolved.end,
    eventId: binding.eventId,
    eventTitle: binding.eventTitle,
    promoteBelowDailyChallenge: binding.eventId === 'ft-anniversary' ? true : undefined,
  }
}

function findBestBindingWindow(
  route: BusRoute,
  today: string,
  mode: 'active' | 'next',
): SeasonalAvailabilityWindow | null {
  const keys = new Set<string>(routeAvailabilityKeys(route))
  let best: SeasonalAvailabilityWindow | null = null

  for (const key of keys) {
    const bindings = lookupBindings(key)
    if (!bindings) continue

    for (const binding of bindings) {
      const window =
        mode === 'active' ? bindingToActiveWindow(today, binding) : bindingToNextWindow(today, binding)
      if (!window) continue
      if (!best || window.start < best.start) best = window
    }
  }

  return best
}

/** 季节限定线路是否已到开放期（HKT 游戏日） */
export function isSeasonalRouteUnlocked(route: BusRoute, now = new Date()): boolean {
  return getSeasonalRouteActiveWindow(route, now) != null
}

/** 当前 HKT 游戏日命中的开放窗口。 */
export function getSeasonalRouteActiveWindow(
  route: BusRoute,
  now = new Date(),
): SeasonalAvailabilityWindow | null {
  const today = todayHktDateString(now)
  return findBestBindingWindow(route, today, 'active')
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

const EN_MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/** 游戏内路线列表日期样式，如「10月 11」 */
export function formatSeasonalGameDayInGame(date: string, locale: Locale): string {
  const [, month, day] = date.split('-').map(Number)
  if (locale === 'en') {
    return `${EN_MONTH_SHORT[month - 1] ?? month} ${day}`
  }
  return `${month}月 ${day}`
}

export function formatSeasonalAvailabilityRangeInGame(
  window: SeasonalAvailabilityWindow,
  locale: Locale,
): string {
  const start = formatSeasonalGameDayInGame(window.start, locale)
  if (!window.end) return start
  const end = formatSeasonalGameDayInGame(window.end, locale)
  return `${start} - ${end}`
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
  if (ms <= 0) return '00:00:00'
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  if (days > 0) {
    return `${String(days).padStart(2, '0')}d ${time}`
  }
  return time
}

export interface SeasonalAvailabilityLabels {
  range: string
  unavailableFrom: string | null
}

export function getSeasonalAvailabilityLabels(
  window: SeasonalAvailabilityWindow,
  locale: Locale,
  t: (key: 'seasonalAvailabilityUnavailableFrom', params: Record<string, string>) => string,
): SeasonalAvailabilityLabels {
  const range = formatSeasonalAvailabilityRangeInGame(window, locale)
  const unavailableFromDate = getSeasonalUnavailableFromDate(window)
  const unavailableFrom = unavailableFromDate
    ? t('seasonalAvailabilityUnavailableFrom', {
        date: formatSeasonalGameDayInGame(unavailableFromDate, locale),
      })
    : null
  return { range, unavailableFrom }
}

export function getSeasonalRouteDisplayWindow(
  route: BusRoute,
  now = new Date(),
): SeasonalAvailabilityWindow | null {
  const today = todayHktDateString(now)
  return (
    findBestBindingWindow(route, today, 'active') ?? findBestBindingWindow(route, today, 'next')
  )
}

export function shouldPromoteSeasonalRouteBelowDailyChallenge(
  route: BusRoute,
  now = new Date(),
): boolean {
  const window = getSeasonalRouteActiveWindow(route, now)
  if (!window) return false
  if (window.promoteBelowDailyChallenge === false) return false
  return true
}
