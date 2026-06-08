import { routes } from './routes'
import type { BilingualText, BusRoute, RouteFilters } from '../types/route'
import { mergeRoutesByBaseNumber } from '../utils/routeMerge'
import { routeMatchesTypeFilter } from '../utils/routeTypes'

export interface DailyChallengeInfo {
  /** YYYY-MM-DD (HKT, aligned with in-game 08:00 reset) */
  date: string
  event: BilingualText
  routeNumber?: string
  /** Manually set until a live data source is available */
  isPlaceholder: boolean
}

export const DAILY_CHALLENGE_CARD_ID = 'daily-challenge-today'

const PRIVATE_HIRE_WIKI_URL =
  'https://sunshine-islands-roblox.fandom.com/wiki/Private_Hire'

/** In-game daily challenges reset at 08:00 HKT (00:00 UTC). */
export function todayHktDateString(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong' }).format(now)
}

export function isPrivateHireChallengeRoute(routeNumber?: string): boolean {
  return !!routeNumber && /^PH/i.test(routeNumber.trim())
}

export function findRouteForDailyChallenge(routeNumber: string): BusRoute | null {
  const key = routeNumber.trim().toLowerCase()
  if (!key) return null
  const display = mergeRoutesByBaseNumber(routes)
  return display.find((r) => r.number.toLowerCase() === key) ?? null
}

/**
 * Today's daily challenge. No public API exists yet — placeholder only.
 * Update `PLACEHOLDER_DAILY_CHALLENGE` manually when the real event is known.
 */
const PLACEHOLDER_DAILY_CHALLENGE: Pick<DailyChallengeInfo, 'event' | 'routeNumber'> = {
  event: { zh: 'PH 私人租用', en: 'Private Hire (PH)' },
  routeNumber: 'PH1',
}

export function getTodaysDailyChallenge(now = new Date()): DailyChallengeInfo {
  return {
    date: todayHktDateString(now),
    ...PLACEHOLDER_DAILY_CHALLENGE,
    isPlaceholder: true,
  }
}

export function getPrivateHireWikiUrl(): string {
  return PRIVATE_HIRE_WIKI_URL
}

function matchesDailyChallengeQuery(challenge: DailyChallengeInfo, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const haystack = [
    challenge.routeNumber,
    challenge.event.zh,
    challenge.event.en,
    '每日挑战',
    'daily challenge',
    '私人租用',
    'private hire',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const routeNumber = challenge.routeNumber?.toLowerCase() ?? ''
  return haystack.includes(q) || routeNumber.startsWith(q)
}

/** 与线路列表共用同一套筛选/搜索规则 */
export function dailyChallengeMatchesFilters(
  challenge: DailyChallengeInfo,
  filters: RouteFilters,
): boolean {
  if (filters.routeGroup !== 'all' && filters.routeGroup !== 'daily') return false
  if (!matchesDailyChallengeQuery(challenge, filters.query)) return false

  const routeNumber = challenge.routeNumber
  const linkedRoute =
    routeNumber && !isPrivateHireChallengeRoute(routeNumber)
      ? findRouteForDailyChallenge(routeNumber)
      : null

  if (filters.zone !== 'all') {
    if (!linkedRoute?.zones.includes(filters.zone)) return false
  }

  if (filters.operator !== 'all') {
    if (!linkedRoute?.operators.includes(filters.operator)) return false
  }

  if (filters.type !== 'all') {
    if (linkedRoute) {
      if (!routeMatchesTypeFilter(linkedRoute, filters.type)) return false
    } else if (filters.type !== 'event') {
      return false
    }
  }

  return true
}
