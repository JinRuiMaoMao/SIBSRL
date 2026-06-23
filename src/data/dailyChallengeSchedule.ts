import type { Locale } from '../i18n/types'
import { isChineseLocale } from '../i18n/types'
import schedule2024JuneJson from '../../data/daily-challenge-schedule-2024-06.json'
import schedule2024JulyJson from '../../data/daily-challenge-schedule-2024-07.json'
import schedule2024AugustJson from '../../data/daily-challenge-schedule-2024-08.json'
import schedule2024SeptemberJson from '../../data/daily-challenge-schedule-2024-09.json'
import schedule2024DecemberJson from '../../data/daily-challenge-schedule-2024-12.json'
import schedule2025AugustJson from '../../data/daily-challenge-schedule-2025-08.json'
import schedule2025SeptemberJson from '../../data/daily-challenge-schedule-2025-09.json'
import schedule2025OctoberJson from '../../data/daily-challenge-schedule-2025-10.json'
import schedule2025NovemberJson from '../../data/daily-challenge-schedule-2025-11.json'
import schedule2025DecemberJson from '../../data/daily-challenge-schedule-2025-12.json'
import scheduleJanuaryJson from '../../data/daily-challenge-schedule-2026-01.json'
import scheduleFebruaryJson from '../../data/daily-challenge-schedule-2026-02.json'
import scheduleMarchJson from '../../data/daily-challenge-schedule-2026-03.json'
import scheduleAprilJson from '../../data/daily-challenge-schedule-2026-04.json'
import scheduleMayJson from '../../data/daily-challenge-schedule-2026-05.json'
import scheduleJuneJson from '../../data/daily-challenge-schedule-2026-06.json'
import scheduleJulyJson from '../../data/daily-challenge-schedule-2026-07.json'

export interface DailyChallengeScheduleDay {
  date: string
  event: string | null
  routeCode: string | null
  race: boolean
}

export interface DailyChallengeSchedule {
  month: string
  timezone: string
  resetHour: number
  days: DailyChallengeScheduleDay[]
}

export const DAILY_CHALLENGE_SCHEDULES: DailyChallengeSchedule[] = [
  schedule2024JuneJson as DailyChallengeSchedule,
  schedule2024JulyJson as DailyChallengeSchedule,
  schedule2024AugustJson as DailyChallengeSchedule,
  schedule2024SeptemberJson as DailyChallengeSchedule,
  schedule2024DecemberJson as DailyChallengeSchedule,
  schedule2025AugustJson as DailyChallengeSchedule,
  schedule2025SeptemberJson as DailyChallengeSchedule,
  schedule2025OctoberJson as DailyChallengeSchedule,
  schedule2025NovemberJson as DailyChallengeSchedule,
  schedule2025DecemberJson as DailyChallengeSchedule,
  scheduleJanuaryJson as DailyChallengeSchedule,
  scheduleFebruaryJson as DailyChallengeSchedule,
  scheduleMarchJson as DailyChallengeSchedule,
  scheduleAprilJson as DailyChallengeSchedule,
  scheduleMayJson as DailyChallengeSchedule,
  scheduleJuneJson as DailyChallengeSchedule,
  scheduleJulyJson as DailyChallengeSchedule,
]

const dayByDate = new Map<string, DailyChallengeScheduleDay>()

for (const schedule of DAILY_CHALLENGE_SCHEDULES) {
  for (const day of schedule.days) {
    dayByDate.set(day.date, day)
  }
}

export function findScheduledDailyChallenge(date: string): DailyChallengeScheduleDay | null {
  return dayByDate.get(date) ?? null
}

export interface DailyChallengeCalendarCell {
  date: string | null
  day: DailyChallengeScheduleDay | null
}

export function buildMonthCalendarCells(schedule: DailyChallengeSchedule): DailyChallengeCalendarCell[] {
  const [year, month] = schedule.month.split('-').map(Number)
  if (!year || !month) return []

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const mondayFirstOffset = (firstWeekday + 6) % 7
  const dayByDate = new Map(schedule.days.map((entry) => [entry.date, entry]))
  const cells: DailyChallengeCalendarCell[] = []

  for (let i = 0; i < mondayFirstOffset; i++) {
    cells.push({ date: null, day: null })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ date, day: dayByDate.get(date) ?? null })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null })
  }

  return cells
}

export function formatScheduleMonthLabel(month: string, locale: Locale): string {
  const [year, monthNum] = month.split('-').map(Number)
  if (!year || !monthNum) return month

  if (isChineseLocale(locale)) {
    return `${year}年${monthNum}月`
  }

  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthNum - 1, 1)))
}

export function formatScheduleMonthOption(month: string, locale: Locale): string {
  const [, monthNum] = month.split('-').map(Number)
  if (!monthNum) return month

  if (isChineseLocale(locale)) {
    return `${monthNum}月`
  }

  return new Intl.DateTimeFormat('en', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2020, monthNum - 1, 1)))
}

export function toScheduleMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function parseScheduleMonthKey(monthKey: string): { year: number; month: number } | null {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month || month < 1 || month > 12) return null
  return { year, month }
}

/** 日历可选的最早月份（与现有日程数据一致） */
export const CALENDAR_EARLIEST_MONTH =
  [...DAILY_CHALLENGE_SCHEDULES].map((schedule) => schedule.month).sort()[0] ?? '2026-06'

export function compareScheduleMonthKeys(a: string, b: string): number {
  const parsedA = parseScheduleMonthKey(a)
  const parsedB = parseScheduleMonthKey(b)
  if (!parsedA || !parsedB) return 0
  if (parsedA.year !== parsedB.year) return parsedA.year - parsedB.year
  return parsedA.month - parsedB.month
}

export function clampScheduleMonthKey(
  monthKey: string,
  minKey: string = CALENDAR_EARLIEST_MONTH,
): string {
  return compareScheduleMonthKeys(monthKey, minKey) < 0 ? minKey : monthKey
}

export function listSelectableMonthsForYear(
  year: number,
  earliestMonth: string = CALENDAR_EARLIEST_MONTH,
): number[] {
  const earliest = parseScheduleMonthKey(earliestMonth)
  if (!earliest) return []
  const startMonth = year < earliest.year ? 13 : year === earliest.year ? earliest.month : 1
  if (startMonth > 12) return []
  return Array.from({ length: 12 - startMonth + 1 }, (_, index) => startMonth + index)
}

export function listScheduleYears(schedules: DailyChallengeSchedule[]): number[] {
  const years = new Set<number>()
  const earliest = parseScheduleMonthKey(CALENDAR_EARLIEST_MONTH)
  for (const schedule of schedules) {
    const parsed = parseScheduleMonthKey(schedule.month)
    if (parsed) years.add(parsed.year)
  }
  if (earliest) years.add(earliest.year)
  return [...years]
    .filter((year) => !earliest || year >= earliest.year)
    .sort((a, b) => a - b)
}

export function emptyScheduleForMonth(monthKey: string): DailyChallengeSchedule {
  const fallback = DAILY_CHALLENGE_SCHEDULES[0]
  return {
    month: monthKey,
    timezone: fallback?.timezone ?? 'Asia/Hong_Kong',
    resetHour: fallback?.resetHour ?? 8,
    days: [],
  }
}

export function resolveInitialCalendarMonth(
  todayDate: string,
  schedules: DailyChallengeSchedule[],
): string {
  const todayMonth = todayDate.slice(0, 7)
  if (schedules.some((schedule) => schedule.month === todayMonth)) {
    return clampScheduleMonthKey(todayMonth)
  }

  const sorted = [...schedules].map((schedule) => schedule.month).sort()
  return clampScheduleMonthKey(sorted[sorted.length - 1] ?? todayMonth)
}

/** 用 Discord API 历史覆盖同月静态日程（有 event 的 live 条目优先） */
export function mergeScheduleWithLiveDays(
  schedule: DailyChallengeSchedule,
  liveDays: DailyChallengeScheduleDay[],
): DailyChallengeSchedule {
  const byDate = new Map<string, DailyChallengeScheduleDay>()
  for (const day of schedule.days) {
    byDate.set(day.date, day)
  }

  for (const live of liveDays) {
    if (!live.date.startsWith(schedule.month)) continue
    if (!live.event) continue

    const existing = byDate.get(live.date)
    byDate.set(live.date, {
      date: live.date,
      event: live.event,
      routeCode: live.routeCode ?? existing?.routeCode ?? null,
      race: live.race,
    })
  }

  return {
    ...schedule,
    days: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
  }
}
