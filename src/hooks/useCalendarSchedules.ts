import { useEffect, useMemo, useState } from 'react'
import {
  DAILY_CHALLENGE_SCHEDULES,
  mergeScheduleWithLiveDays,
  type DailyChallengeSchedule,
} from '../data/dailyChallengeSchedule'
import {
  fetchDailyChallengeHistory,
  getDailyChallengeApiUrl,
  getDailyChallengePollIntervalMs,
} from '../data/liveDailyChallenge'

export function useCalendarSchedules(): {
  schedules: DailyChallengeSchedule[]
  hasLiveOverlay: boolean
} {
  const [liveDays, setLiveDays] = useState<Awaited<ReturnType<typeof fetchDailyChallengeHistory>>>([])

  useEffect(() => {
    let cancelled = false
    let pollTimer: number | undefined
    let activeController: AbortController | null = null

    const refresh = async () => {
      activeController?.abort()
      const controller = new AbortController()
      activeController = controller
      try {
        const days = await fetchDailyChallengeHistory(controller.signal)
        if (!cancelled) setLiveDays(days)
      } catch {
        if (controller.signal.aborted) return
      } finally {
        if (activeController === controller) activeController = null
      }
    }

    void refresh()
    if (getDailyChallengeApiUrl()) {
      pollTimer = window.setInterval(() => void refresh(), getDailyChallengePollIntervalMs())
    }

    return () => {
      cancelled = true
      activeController?.abort()
      if (pollTimer != null) window.clearInterval(pollTimer)
    }
  }, [])

  const schedules = useMemo(
    () => DAILY_CHALLENGE_SCHEDULES.map((schedule) => mergeScheduleWithLiveDays(schedule, liveDays)),
    [liveDays],
  )

  return { schedules, hasLiveOverlay: liveDays.length > 0 }
}
