import type { BusRoute } from '../types/route'
import type { ServiceWindow } from '../types/routeTimetableData'
import type { RouteLeg, TransferPlan } from '../types/transferPlan'
import { pickServiceTimeForDirection, resolveServiceTimeForDataIndex } from './routeSchedule'
import { routeHasDirectionVariants } from './routeDirectionCore'
import type { MatchedStop } from './routeStopLookup'
import { stopKey } from './routeBetweenStops'
import { resolveStructuredLegSchedule } from './structuredRouteTimetable'

export const MIN_TRANSFER_MINUTES = 4

export interface TimetableFeasibilityOptions {
  weekday?: number
  /** HKT 当日分钟数 0–1439；设置后按出发时刻校验 */
  departureMinutes?: number | null
}

/** 解析 HH:MM 为当日分钟数 */
export function parseDepartureTimeInput(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

export function formatDepartureTimeInput(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export type DepartureTimePeriod = 'am' | 'pm'

export interface DepartureTimeParts {
  hour12: number
  minute: number
  period: DepartureTimePeriod
}

/** 将 HH:MM（24 小时）拆为 12 小时制片段 */
export function parseDepartureTimeParts(value: string): DepartureTimeParts | null {
  const totalMinutes = parseDepartureTimeInput(value)
  if (totalMinutes == null) return null
  const hour24 = Math.floor(totalMinutes / 60) % 24
  const minute = totalMinutes % 60
  const period: DepartureTimePeriod = hour24 < 12 ? 'am' : 'pm'
  let hour12 = hour24 % 12
  if (hour12 === 0) hour12 = 12
  return { hour12, minute, period }
}

/** 由 12 小时制片段合成 HH:MM（24 小时） */
export function buildDepartureTimeInput(parts: DepartureTimeParts): string {
  const { hour12, minute, period } = parts
  if (hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) {
    throw new Error('Invalid departure time parts')
  }
  let hour24 = hour12 % 12
  if (period === 'pm') hour24 += 12
  return formatDepartureTimeInput(hour24 * 60 + minute)
}

/** 无法解析班次间隔时的保守最大等车时间（分钟） */
const DEFAULT_MAX_HEADWAY_MINUTES = 30

/** 无全程行车时间时，每站估算分钟数 */
const MINUTES_PER_STOP_FALLBACK = 2.5

const UNSCHEDULED_PATTERN =
  /固定班次|fixed departure|视客量|视乘客|depend(s)? on (ridership|passenger|actual)|按活动|per event|major events only|marathon only|selected departures|待定|\btba\b|school days only|上课日|special service only/i

function getHktWeekday(now = new Date()): number {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Hong_Kong',
    weekday: 'short',
  }).format(now)
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[label] ?? 0
}

function parseClockToMinutes(text: string): number | null {
  const match = text.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function normalizeTimeRange(start: number, end: number): ServiceWindow {
  if (end <= start) return { start, end: end + 24 * 60 }
  return { start, end }
}

function dayMatchesPrefix(text: string, weekday: number): boolean {
  const lower = text.toLowerCase()

  const checks: Array<{ pattern: RegExp; days: number[] }> = [
    { pattern: /mon\s*[–-]\s*fri|周一至五|平日(?!及)/i, days: [1, 2, 3, 4, 5] },
    { pattern: /mon\s*[–-]\s*sat|平日及周六|周一至六/i, days: [1, 2, 3, 4, 5, 6] },
    { pattern: /sat(?:urday)?|周六|星期六/i, days: [6] },
    { pattern: /sun(?:day)?|周日|星期日/i, days: [0] },
    { pattern: /weekend|周末/i, days: [0, 6] },
    { pattern: /\bmonday\b|\bmon\b|周一/i, days: [1] },
    { pattern: /\btuesday\b|\btue\b|周二/i, days: [2] },
    { pattern: /\bwednesday\b|\bwed\b|周三/i, days: [3] },
    { pattern: /\bthursday\b|\bthu\b|周四/i, days: [4] },
    { pattern: /\bfriday\b|\bfri\b|周五/i, days: [5] },
  ]

  for (const { pattern, days } of checks) {
    if (pattern.test(lower) || pattern.test(text)) {
      return days.includes(weekday)
    }
  }

  return true
}

/** 从服务时间文案解析当日运营窗口 */
export function parseServiceWindows(text: string, weekday = getHktWeekday()): ServiceWindow[] {
  const raw = text.trim()
  if (!raw || UNSCHEDULED_PATTERN.test(raw)) return []

  const rangeMatch = raw.match(/(\d{1,2}:\d{2})\s*[–\-—~至到]\s*(\d{1,2}:\d{2})/)
  if (rangeMatch) {
    const start = parseClockToMinutes(rangeMatch[1]!)
    const end = parseClockToMinutes(rangeMatch[2]!)
    if (start == null || end == null) return []
    if (!dayMatchesPrefix(raw, weekday)) return []
    return [normalizeTimeRange(start, end)]
  }

  const spotTimes = [...raw.matchAll(/\d{1,2}:\d{2}/g)]
    .map((m) => parseClockToMinutes(m[0]!))
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b)

  if (spotTimes.length >= 2 && dayMatchesPrefix(raw, weekday)) {
    const start = spotTimes[0]!
    const end = spotTimes[spotTimes.length - 1]!
    return [normalizeTimeRange(start, end)]
  }

  return []
}

function resolveScheduleText(route: BusRoute, directionIndex: number): string | null {
  return resolveServiceTimeForDataIndex(route, directionIndex, 'en')
}

function resolveJourneyTimeText(route: BusRoute, directionIndex: number): string | null {
  const text = route.journeyTime?.en ?? route.journeyTime?.zh
  if (!text) return null
  if (routeHasDirectionVariants(route)) {
    return pickServiceTimeForDirection(text, route, directionIndex)
  }
  return text
}

function parseMinuteValues(text: string): number[] {
  const values: number[] = []
  for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:-|–|—|~|至|到)\s*(\d+(?:\.\d+)?)/g)) {
    const a = Number(match[1])
    const b = Number(match[2])
    if (Number.isFinite(a) && Number.isFinite(b)) values.push((a + b) / 2)
  }
  for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:mins?|minutes?|分钟)/gi)) {
    const value = Number(match[1])
    if (Number.isFinite(value)) values.push(value)
  }
  return values
}

export function parseJourneyMinutes(text: string | null | undefined): number | null {
  if (!text) return null
  if (/待定|\btba\b/i.test(text)) return null
  const values = parseMinuteValues(text)
  if (!values.length) return null
  return Math.max(1, Math.round(values.reduce((sum, v) => sum + v, 0) / values.length))
}

export function parseMaxHeadwayMinutes(text: string | null | undefined): number {
  if (!text) return DEFAULT_MAX_HEADWAY_MINUTES
  if (/fixed departure|固定班次/i.test(text)) return 60
  const values = parseMinuteValues(text)
  if (!values.length) return DEFAULT_MAX_HEADWAY_MINUTES
  return Math.max(1, Math.round(Math.max(...values)))
}

function countLegStopSpan(leg: RouteLeg): { segmentStops: number; totalStops: number } {
  const list = leg.route.stops?.[leg.directionIndex]?.list
  if (!list?.length) return { segmentStops: 1, totalStops: 1 }

  const fromKey = stopKey(leg.from.zh, leg.from.en)
  const toKey = stopKey(leg.to.zh, leg.to.en)
  let fromIndex = -1
  let toIndex = -1

  for (let i = 0; i < list.length; i++) {
    const stop = list[i]!
    const key = stopKey(stop.name.zh, stop.name.en)
    if (key === fromKey) fromIndex = i
    if (key === toKey) toIndex = i
  }

  if (fromIndex < 0 || toIndex < fromIndex) return { segmentStops: 1, totalStops: 1 }

  return {
    segmentStops: Math.max(1, toIndex - fromIndex),
    totalStops: Math.max(1, list.length - 1),
  }
}

export function getLegServiceWindows(leg: RouteLeg, weekday = getHktWeekday()): ServiceWindow[] {
  const structured = resolveStructuredLegSchedule(leg, weekday)
  if (structured?.windows.length) return structured.windows

  const text = resolveScheduleText(leg.route, leg.directionIndex)
  if (!text) return []
  return parseServiceWindows(text, weekday)
}

function getLegHeadwayMinutes(leg: RouteLeg, weekday = getHktWeekday()): number {
  const structured = resolveStructuredLegSchedule(leg, weekday)
  if (structured) return structured.maxHeadwayMinutes
  return parseMaxHeadwayMinutes(leg.route.interval?.en ?? leg.route.interval?.zh)
}

export function estimateLegHeadwayMinutes(leg: RouteLeg, weekday = getHktWeekday()): number {
  return getLegHeadwayMinutes(leg, weekday)
}

export function estimateLegTravelMinutes(leg: RouteLeg): number {
  const { segmentStops, totalStops } = countLegStopSpan(leg)

  const journeyText = resolveJourneyTimeText(leg.route, leg.directionIndex)
  const fullJourney = parseJourneyMinutes(journeyText)
  if (fullJourney != null) {
    const ratio = segmentStops / totalStops
    return Math.max(1, Math.round(fullJourney * ratio))
  }

  return Math.max(1, Math.round(segmentStops * MINUTES_PER_STOP_FALLBACK))
}

function isLegFeasibleFromDeparture(
  leg: RouteLeg,
  departureMinutes: number,
  weekday = getHktWeekday(),
): boolean {
  const windows = getLegServiceWindows(leg, weekday)
  if (!windows.length) return false

  const travel = estimateLegTravelMinutes(leg)
  const headway = getLegHeadwayMinutes(leg, weekday)

  for (const w of windows) {
    const latestBoard = w.end - travel
    if (latestBoard < w.start) continue
    if (departureMinutes > latestBoard) continue
    const waitUntil = Math.max(departureMinutes, w.start)
    if (waitUntil + travel <= w.end + 1) return true
    if (departureMinutes >= w.start - headway && departureMinutes <= latestBoard) return true
  }

  return false
}

function isTransferPlanFeasibleAtDeparture(
  plan: TransferPlan,
  departureMinutes: number,
  weekday = getHktWeekday(),
): boolean {
  if (!plan.legs.length) return false

  let cursor = departureMinutes
  for (let i = 0; i < plan.legs.length; i++) {
    const leg = plan.legs[i]!
    if (!isLegFeasibleFromDeparture(leg, cursor, weekday)) return false
    cursor += estimateLegTravelMinutes(leg)
    if (i < plan.legs.length - 1) {
      cursor += MIN_TRANSFER_MINUTES
      cursor += Math.round(estimateLegHeadwayMinutes(plan.legs[i + 1]!, weekday) / 2)
    }
  }

  return true
}

function canConnectLegs(leg1: RouteLeg, leg2: RouteLeg, weekday = getHktWeekday()): boolean {
  const windows1 = getLegServiceWindows(leg1, weekday)
  const windows2 = getLegServiceWindows(leg2, weekday)
  if (!windows1.length || !windows2.length) return false

  const travel1 = estimateLegTravelMinutes(leg1)
  const headway2 = getLegHeadwayMinutes(leg2, weekday)

  for (const w1 of windows1) {
    const arrivalMin = w1.start + travel1
    const arrivalMax = w1.end
    if (arrivalMin > arrivalMax) continue

    for (const w2 of windows2) {
      if (arrivalMin + MIN_TRANSFER_MINUTES > w2.end) continue
      if (w2.start > arrivalMax + MIN_TRANSFER_MINUTES + headway2) continue
      return true
    }
  }

  return false
}

/** 单段是否于参考日有运营时间 */
export function isLegServiceAvailableToday(leg: RouteLeg, weekday = getHktWeekday()): boolean {
  const windows = getLegServiceWindows(leg, weekday)
  if (!windows.length) return false
  const travel = estimateLegTravelMinutes(leg)
  return windows.some((w) => w.start + travel <= w.end)
}

/** 转车方案各段服务时间与换乘候车是否可行（基于服务时间 + 班次间隔 + 行车时间估算） */
export function isTransferPlanTimetableFeasible(
  plan: TransferPlan,
  options: TimetableFeasibilityOptions = {},
): boolean {
  const weekday = options.weekday ?? getHktWeekday()
  if (!plan.legs.length) return false

  for (const leg of plan.legs) {
    if (!isLegServiceAvailableToday(leg, weekday)) return false
  }

  for (let i = 0; i < plan.legs.length - 1; i++) {
    if (!canConnectLegs(plan.legs[i]!, plan.legs[i + 1]!, weekday)) return false
  }

  if (options.departureMinutes != null) {
    return isTransferPlanFeasibleAtDeparture(plan, options.departureMinutes, weekday)
  }

  return true
}

/** 直达是否于参考日有可行乘车时段 */
export function isDirectRouteBetweenStopsFeasible(
  from: MatchedStop,
  to: MatchedStop,
  route: BusRoute,
  directionIndex: number,
  options: TimetableFeasibilityOptions = {},
): boolean {
  const weekday = options.weekday ?? getHktWeekday()
  const leg: RouteLeg = { route, directionIndex, from, to }
  if (!isLegServiceAvailableToday(leg, weekday)) return false
  if (options.departureMinutes != null) {
    return isLegFeasibleFromDeparture(leg, options.departureMinutes, weekday)
  }
  return true
}

export function filterTransferPlansByTimetable(
  plans: TransferPlan[],
  options: TimetableFeasibilityOptions = {},
): TransferPlan[] {
  return plans.filter((plan) => isTransferPlanTimetableFeasible(plan, options))
}
