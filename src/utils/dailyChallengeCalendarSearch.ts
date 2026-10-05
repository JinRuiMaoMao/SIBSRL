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

/** 统计匹配数量（不分配 hit 数组）。 */
export function countDailyChallengeSearchMatches(
  days: DailyChallengeScheduleDay[],
  query: string,
): number {
  const trimmed = query.trim()
  if (!trimmed) return 0

  let count = 0
  for (const day of days) {
    if (dailyChallengeDayMatchesSearchQuery(day, trimmed)) count++
  }
  return count
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
