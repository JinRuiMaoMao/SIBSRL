import { useEffect, useState } from 'react'
import {
  formatSeasonalAvailabilityCountdown,
  getMsUntilSeasonalWindowEnds,
  type SeasonalAvailabilityWindow,
} from '../data/seasonalRouteAvailability'

export function useSeasonalAvailabilityCountdown(
  availabilityWindow: SeasonalAvailabilityWindow | null,
): string {
  const [countdown, setCountdown] = useState(() => {
    if (!availabilityWindow) return '00d 00h'
    const ms = getMsUntilSeasonalWindowEnds(availabilityWindow)
    return ms == null ? '00d 00h' : formatSeasonalAvailabilityCountdown(ms)
  })

  useEffect(() => {
    if (!availabilityWindow) {
      setCountdown('00d 00h')
      return
    }

    const tick = () => {
      const ms = getMsUntilSeasonalWindowEnds(availabilityWindow)
      setCountdown(ms == null ? '00d 00h' : formatSeasonalAvailabilityCountdown(ms))
    }

    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [availabilityWindow])

  return countdown
}
