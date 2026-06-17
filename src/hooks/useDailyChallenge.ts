import { useEffect, useState } from 'react'
import {
  getMsUntilNextDailyChallengeReset,
  getTodaysDailyChallenge,
  type DailyChallengeInfo,
} from '../data/dailyChallenge'
import {
  fetchLiveDailyChallenge,
  getDailyChallengeApiUrl,
  getDailyChallengePollIntervalMs,
} from '../data/liveDailyChallenge'

export function useDailyChallenge(): DailyChallengeInfo {
  const [challenge, setChallenge] = useState<DailyChallengeInfo>(() =>
    getTodaysDailyChallenge(),
  )

  useEffect(() => {
    let cancelled = false
    let pollTimer: number | undefined
    let resetTimer: number | undefined
    let activeController: AbortController | null = null

    const refresh = async () => {
      activeController?.abort()
      const controller = new AbortController()
      activeController = controller
      const fallback = getTodaysDailyChallenge()

      try {
        const live = await fetchLiveDailyChallenge(controller.signal)
        if (!cancelled) setChallenge(live ?? fallback)
      } catch {
        if (controller.signal.aborted) return
        if (!cancelled) setChallenge(fallback)
      } finally {
        if (activeController === controller) activeController = null
      }
    }

    const scheduleResetRefresh = () => {
      resetTimer = window.setTimeout(() => {
        void refresh()
        scheduleResetRefresh()
      }, getMsUntilNextDailyChallengeReset() + 1000)
    }

    void refresh()
    scheduleResetRefresh()

    if (getDailyChallengeApiUrl()) {
      pollTimer = window.setInterval(() => void refresh(), getDailyChallengePollIntervalMs())
    }

    return () => {
      cancelled = true
      activeController?.abort()
      if (pollTimer != null) window.clearInterval(pollTimer)
      if (resetTimer != null) window.clearTimeout(resetTimer)
    }
  }, [])

  return challenge
}
