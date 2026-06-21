import { useEffect, useState } from 'react'
import {
  formatSeasonalAvailabilityCountdown,
  getMsUntilSeasonalWindowEnds,
  type SeasonalAvailabilityWindow,
} from '../data/seasonalRouteAvailability'

export function useSeasonalAvailabilityCountdown(
  window: SeasonalAvailabilityWindow | null,
): string {
  const [countdown, setCountdown] = useState(() => {
    if (!window) return '00d 00h'
    const ms = getMsUntilSeasonalWindowEnds(window)
    return ms == null ? '00d 00h' : formatSeasonalAvailabilityCountdown(ms)
  })

  useEffect(() => {
    if (!window) {
      setCountdown('00d 00h')
      return
    }

    const tick = () => {
      const ms = getMsUntilSeasonalWindowEnds(window)
      setCountdown(ms == null ? '00d 00h' : formatSeasonalAvailabilityCountdown(ms))
    }

    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [window])

  return countdown
}
