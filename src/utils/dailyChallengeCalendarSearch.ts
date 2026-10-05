import {
  dailyChallengeRouteCodeMatchesQuery,
  getScheduleDayEventSearchHaystack,
} from '../data/dailyChallenge'
import type { DailyChallengeSchedule, DailyChallengeScheduleDay } from '../data/dailyChallengeSchedule'

export interface DailyChallengeSearchHit {
  date: string
  day: DailyChallengeScheduleDay
}

/** @deprecated Use DailyChallengeSearchHit */
export type DailyChallengeRouteSearchHit = DailyChallengeSearchHit

export function collectScheduleDays(schedules: DailyChallengeSchedule[]): DailyChallengeScheduleDay[] {
  const byDate = new Map<string, DailyChallengeScheduleDay>()
  for (const schedule of schedules) {
    for (const day of schedule.days) {
      byDate.set(day.date, day)
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase()
}

/** 挑战类型（中/英事件名）是否匹配搜索词。 */
export function dailyChallengeEventMatchesQuery(
  day: DailyChallengeScheduleDay,
  query: string,
): boolean {
  const q = normalizeSearchQuery(query)
  if (!q || !day.event?.trim()) return false

  for (const label of getScheduleDayEventSearchHaystack(day)) {
    if (label.includes(q)) return true
  }

  return false
}

/** 线路或挑战类型是否匹配搜索词。 */
export function dailyChallengeDayMatchesSearchQuery(
  day: DailyChallengeScheduleDay,
  query: string,
): boolean {
  const trimmed = query.trim()
  if (!trimmed) return false

  if (
    day.routeCode?.trim() &&
    dailyChallengeRouteCodeMatchesQuery(day.routeCode, trimmed, day.event)
  ) {
    return true
  }

  return dailyChallengeEventMatchesQuery(day, trimmed)
}

export interface DailyChallengeSearchPeriodCounts {
  total: number
  byYear: Map<number, number>
  byMonthKey: Map<string, number>
}

const EMPTY_PERIOD_COUNTS: DailyChallengeSearchPeriodCounts = {
  total: 0,
  byYear: new Map(),
  byMonthKey: new Map(),
}

/** 统计匹配数量，并按年 / 月分组（供日期选择器展示）。 */
export function countDailyChallengeSearchByPeriod(
  days: DailyChallengeScheduleDay[],
  query: string,
): DailyChallengeSearchPeriodCounts {
  const trimmed = query.trim()
  if (!trimmed) return EMPTY_PERIOD_COUNTS

  const byYear = new Map<number, number>()
  const byMonthKey = new Map<string, number>()
  let total = 0

  for (const day of days) {
    if (!dailyChallengeDayMatchesSearchQuery(day, trimmed)) continue
    total++
    const year = Number(day.date.slice(0, 4))
    const monthKey = day.date.slice(0, 7)
    byYear.set(year, (byYear.get(year) ?? 0) + 1)
    byMonthKey.set(monthKey, (byMonthKey.get(monthKey) ?? 0) + 1)
  }

  return { total, byYear, byMonthKey }
}

/** 统计匹配数量（不分配 hit 数组）。 */
export function countDailyChallengeSearchMatches(
  days: DailyChallengeScheduleDay[],
  query: string,
): number {
  return countDailyChallengeSearchByPeriod(days, query).total
}

/** 当前月日历格子的匹配日期集合（仅 ~31 格，供遮罩用）。 */
export function collectMonthSearchMatchDates(
  days: Array<DailyChallengeScheduleDay | null | undefined>,
  query: string,
): Set<string> {
  const trimmed = query.trim()
  const matches = new Set<string>()
  if (!trimmed) return matches

  for (const day of days) {
    if (day && dailyChallengeDayMatchesSearchQuery(day, trimmed)) {
      matches.add(day.date)
    }
  }
  return matches
}

function monthKeyToOrdinal(monthKey: string): number | null {
  const year = Number(monthKey.slice(0, 4))
  const month = Number(monthKey.slice(5, 7))
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null
  return year * 12 + month
}

/** 当前月无匹配时，找时间上最近的含匹配月份。 */
export function findNearestMonthKeyWithSearchHits(
  currentMonthKey: string,
  byMonthKey: Map<string, number>,
): { monthKey: string; count: number } | null {
  if ((byMonthKey.get(currentMonthKey) ?? 0) > 0) return null

  const currentOrdinal = monthKeyToOrdinal(currentMonthKey)
  if (currentOrdinal == null) return null

  let nearest: { monthKey: string; count: number; distance: number } | null = null
  for (const [monthKey, count] of byMonthKey) {
    if (count <= 0) continue
    const ordinal = monthKeyToOrdinal(monthKey)
    if (ordinal == null) continue
    const distance = Math.abs(ordinal - currentOrdinal)
    if (
      !nearest ||
      distance < nearest.distance ||
      (distance === nearest.distance && monthKey.localeCompare(nearest.monthKey) > 0)
    ) {
      nearest = { monthKey, count, distance }
    }
  }

  return nearest ? { monthKey: nearest.monthKey, count: nearest.count } : null
}

/** 按线路或挑战类型搜索历史每日挑战（新→旧）。 */
export function searchDailyChallengeDays(
  schedules: DailyChallengeSchedule[],
  query: string,
): DailyChallengeSearchHit[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const hits: DailyChallengeSearchHit[] = []
  for (const day of collectScheduleDays(schedules)) {
    if (!dailyChallengeDayMatchesSearchQuery(day, trimmed)) continue
    hits.push({ date: day.date, day })
  }

  return hits.sort((a, b) => b.date.localeCompare(a.date))
}

/** @deprecated Use searchDailyChallengeDays */
export function searchDailyChallengeDaysByRoute(
  schedules: DailyChallengeSchedule[],
  query: string,
): DailyChallengeSearchHit[] {
  return searchDailyChallengeDays(schedules, query)
}
