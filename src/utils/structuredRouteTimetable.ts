import { convertToSimplified } from '../i18n/convert'
import {
  getGameRouteTimetableRecord,
  resolveGameRouteTimetableKey,
} from '../data/routeTimetables'
import type { BusRoute } from '../types/route'
import type { RouteLeg } from '../types/transferPlan'
import type { GameRouteTimetableRecord, TimetableScheduleEntry } from '../types/routeTimetableData'
import type { ServiceWindow } from '../types/routeTimetableData'
import { stopKey } from './routeBetweenStops'

const DEFAULT_SHIFT = 'normal'

function normalizeStopToken(text: string): string {
  return convertToSimplified(text)
    .replace(/\^\^/g, '')
    .trim()
    .toLowerCase()
}

function stopTokens(zh: string, en: string): string[] {
  const tokens = [normalizeStopToken(zh), normalizeStopToken(en)].filter(Boolean)
  return [...new Set(tokens)]
}

function gameStopTokens(stop: { nameCn: string; nameEn: string }): string[] {
  return stopTokens(stop.nameCn, stop.nameEn)
}

function legOriginTokens(leg: RouteLeg): string[] {
  return stopTokens(leg.from.zh, leg.from.en)
}

function resolveBoundForDirection(
  route: BusRoute,
  directionIndex: number,
  record: GameRouteTimetableRecord,
): string | null {
  const bounds = Object.keys(record.timetable).sort()
  if (!bounds.length) return null
  if (bounds.length === 1) return bounds[0]!

  const list = route.stops?.[directionIndex]?.list
  const legTokens = list?.[0]
    ? stopTokens(list[0].name.zh, list[0].name.en)
    : []

  for (const bound of bounds) {
    const first = record.stops?.[bound]?.[0]
    if (!first || !legTokens.length) continue
    const gameTokens = gameStopTokens(first)
    if (legTokens.some((t) => gameTokens.some((g) => g === t || g.includes(t) || t.includes(g)))) {
      return bound
    }
  }

  return bounds[Math.min(directionIndex, bounds.length - 1)] ?? bounds[0]!
}

function matchesServiceDays(serviceDays: string, weekday: number): boolean {
  switch (serviceDays) {
    case 'weekday':
      return weekday >= 1 && weekday <= 5
    case 'saturday':
      return weekday === 6
    case 'holiday':
      return weekday === 0
    case 'weekend_holiday':
      return weekday === 0 || weekday === 6
    case 'custom':
      return false
    default:
      return false
  }
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

function parseMinuteValues(text: string): number[] {
  const values: number[] = []
  for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:-|–|—|~|至|到)\s*(\d+(?:\.\d+)?)/g)) {
    const a = Number(match[1])
    const b = Number(match[2])
    if (Number.isFinite(a) && Number.isFinite(b)) values.push(a, b)
  }
  for (const match of text.matchAll(/(\d+(?:\.\d+)?)/g)) {
    const value = Number(match[1])
    if (Number.isFinite(value)) values.push(value)
  }
  return values
}

function parseSpotDepartureMinutes(text: string): number[] {
  return [...text.matchAll(/\d{1,2}:\d{2}/g)]
    .map((m) => parseClockToMinutes(m[0]!))
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b)
}

function maxHeadwayFromScheduleEntry(entry: TimetableScheduleEntry): number {
  const bands = entry.interval ?? []
  let maxHeadway = 0

  for (const band of bands) {
    if (band.interval === '0') {
      const spots = parseSpotDepartureMinutes(band.time)
      for (let i = 1; i < spots.length; i++) {
        maxHeadway = Math.max(maxHeadway, spots[i]! - spots[i - 1]!)
      }
      continue
    }
    const values = parseMinuteValues(band.interval)
    if (values.length) maxHeadway = Math.max(maxHeadway, Math.max(...values))
  }

  return Math.max(1, Math.round(maxHeadway))
}

function windowFromScheduleEntry(entry: TimetableScheduleEntry): ServiceWindow | null {
  if (!entry.firstTime || !entry.lastTime) return null
  const start = parseClockToMinutes(entry.firstTime)
  const end = parseClockToMinutes(entry.lastTime)
  if (start == null || end == null) return null
  return normalizeTimeRange(start, end)
}

function pickScheduleEntry(
  record: GameRouteTimetableRecord,
  bound: string,
  weekday: number,
  shift = DEFAULT_SHIFT,
): TimetableScheduleEntry | null {
  const entries = record.timetable[bound]?.[shift]
  if (!entries?.length) return null

  for (const entry of entries) {
    if (matchesServiceDays(entry.serviceDays, weekday)) {
      return entry
    }
  }
  return null
}

export interface ResolvedStructuredLegSchedule {
  windows: ServiceWindow[]
  maxHeadwayMinutes: number
  routeKey: string
  bound: string
}

const structuredLegScheduleCache = new Map<string, ResolvedStructuredLegSchedule | null>()

function legScheduleCacheKey(leg: RouteLeg, weekday: number): string {
  return [
    leg.route.id,
    leg.directionIndex,
    stopKey(leg.from.zh, leg.from.en),
    stopKey(leg.to.zh, leg.to.en),
    weekday,
  ].join('\0')
}

function resolveStructuredLegScheduleUncached(
  leg: RouteLeg,
  weekday: number,
): ResolvedStructuredLegSchedule | null {
  const routeKey = resolveGameRouteTimetableKey(leg.route)
  if (!routeKey) return null

  const record = getGameRouteTimetableRecord(routeKey)
  if (!record) return null

  const bound = resolveBoundForDirection(leg.route, leg.directionIndex, record)
  if (!bound) return null

  const entry = pickScheduleEntry(record, bound, weekday)
  if (!entry) return null

  const window = windowFromScheduleEntry(entry)
  if (!window) return null

  return {
    windows: [window],
    maxHeadwayMinutes: maxHeadwayFromScheduleEntry(entry),
    routeKey,
    bound,
  }
}

export function resolveStructuredLegSchedule(
  leg: RouteLeg,
  weekday: number,
): ResolvedStructuredLegSchedule | null {
  const cacheKey = legScheduleCacheKey(leg, weekday)
  if (structuredLegScheduleCache.has(cacheKey)) {
    return structuredLegScheduleCache.get(cacheKey) ?? null
  }

  const resolved = resolveStructuredLegScheduleUncached(leg, weekday)
  structuredLegScheduleCache.set(cacheKey, resolved)
  return resolved
}

export function legUsesStructuredTimetable(leg: RouteLeg): boolean {
  return resolveGameRouteTimetableKey(leg.route) != null
}
