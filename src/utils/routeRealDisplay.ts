import { getPrimaryText } from '../i18n/displayText'
import type { Locale } from '../i18n/types'
import type { BilingualText, BusRoute } from '../types/route'

/** 参考游戏界面：从 levelRequired 映射 0–3 星难度 */
export function routeDifficultyStars(levelRequired?: number): number {
  if (levelRequired == null) return 0
  if (levelRequired <= 25) return 1
  if (levelRequired <= 60) return 2
  return 3
}

/** 卡片上显示的简短行车时间 */
export function formatShortJourneyTime(
  journeyTime: BilingualText | undefined,
  locale: Locale,
): string | null {
  if (!journeyTime) return null
  const raw = getPrimaryText(journeyTime, locale).replace(/\s+/g, ' ').trim()
  if (!raw) return null

  const match = raw.match(
    /(?:约\s*)?(\d+\s*(?:[-–]\s*\d+\s*)?(?:mins?|minutes?|分钟|min))/i,
  )
  if (match?.[1]) return match[1].replace(/\s+/g, ' ').trim()
  if (raw.length <= 24) return raw
  return `${raw.slice(0, 21)}…`
}

export function formatRealRouteNumber(route: BusRoute, loopView: boolean): string {
  const base = route.number
  if (loopView && route.pattern === 'circular') return base
  if (route.pattern === 'circular') return `${base}`
  return base
}
