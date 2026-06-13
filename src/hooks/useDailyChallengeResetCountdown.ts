import { useEffect, useState } from 'react'
import {
  formatDailyChallengeCountdown,
  getMsUntilNextDailyChallengeReset,
} from '../data/dailyChallenge'

export function useDailyChallengeResetCountdown(): string {
  const [countdown, setCountdown] = useState(() =>
    formatDailyChallengeCountdown(getMsUntilNextDailyChallengeReset()),
  )

  useEffect(() => {
    const tick = () => {
      setCountdown(formatDailyChallengeCountdown(getMsUntilNextDailyChallengeReset()))
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  return countdown
}
