import { dailyChallengeRouteCodeMatchesQuery } from '../data/dailyChallenge'
import type { DailyChallengeSchedule, DailyChallengeScheduleDay } from '../data/dailyChallengeSchedule'

export interface DailyChallengeRouteSearchHit {
  date: string
  day: DailyChallengeScheduleDay
}

export function collectScheduleDays(schedules: DailyChallengeSchedule[]): DailyChallengeScheduleDay[] {
  const byDate = new Map<string, DailyChallengeScheduleDay>()
  for (const schedule of schedules) {
    for (const day of schedule.days) {
      byDate.set(day.date, day)
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/** 按线路代号搜索历史每日挑战（新→旧）。 */
export function searchDailyChallengeDaysByRoute(
  schedules: DailyChallengeSchedule[],
  query: string,
): DailyChallengeRouteSearchHit[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const hits: DailyChallengeRouteSearchHit[] = []
  for (const day of collectScheduleDays(schedules)) {
    if (!day.routeCode?.trim()) continue
    if (!dailyChallengeRouteCodeMatchesQuery(day.routeCode, trimmed)) continue
    hits.push({ date: day.date, day })
  }

  return hits.sort((a, b) => b.date.localeCompare(a.date))
}
