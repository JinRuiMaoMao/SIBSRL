import type { Locale } from '../i18n/types'
import { isChineseLocale } from '../i18n/types'
import scheduleJson from '../../data/daily-challenge-schedule-2026-06.json'

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
  scheduleJson as DailyChallengeSchedule,
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
