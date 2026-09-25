import { useEffect, useState } from 'react'

/** 每秒刷新，以便 HKT 08:00 活动开始时推广卡与锁定区列表同步切换。 */
export function useSeasonalPromotionClock(enabled = true): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!enabled) return
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [enabled])

  return now
}
