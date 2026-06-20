import { useEffect, useMemo, useState } from 'react'
import {
  DAILY_CHALLENGE_SCHEDULES,
  mergeScheduleWithLiveDays,
  type DailyChallengeSchedule,
} from '../data/dailyChallengeSchedule'
import { fetchDailyChallengeHistory } from '../data/liveDailyChallenge'

export function useCalendarSchedules(): {
  schedules: DailyChallengeSchedule[]
  hasLiveOverlay: boolean
} {
  const [liveDays, setLiveDays] = useState<Awaited<ReturnType<typeof fetchDailyChallengeHistory>>>([])

  useEffect(() => {
    const controller = new AbortController()
    void fetchDailyChallengeHistory(controller.signal).then((days) => {
      if (!controller.signal.aborted) setLiveDays(days)
    })
    return () => controller.abort()
  }, [])

  const schedules = useMemo(
    () => DAILY_CHALLENGE_SCHEDULES.map((schedule) => mergeScheduleWithLiveDays(schedule, liveDays)),
    [liveDays],
  )

  return { schedules, hasLiveOverlay: liveDays.length > 0 }
}
