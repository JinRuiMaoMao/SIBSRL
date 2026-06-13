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
