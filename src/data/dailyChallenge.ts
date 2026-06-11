import { routes } from './routes'
import { getPrimaryText } from '../i18n/displayText'
import type { Locale } from '../i18n/types'
import type { BilingualText, BusRoute, RouteFilters } from '../types/route'
import { mergeRoutesByBaseNumber } from '../utils/routeMerge'
import { formatRouteOperators } from '../utils/routeDisplay'
import { getDirectionKey, getSortedDirectionDataIndices } from '../utils/routeDirectionCore'
import { routeMatchesTypeFilter } from '../utils/routeTypes'

export interface DailyChallengeIntro {
  body: BilingualText
  objective: BilingualText
  closing: BilingualText
}

export interface DailyChallengeInfo {
  /** YYYY-MM-DD (HKT, aligned with in-game 08:00 reset) */
  date: string
  event: BilingualText
  routeNumber?: string
  /** 挑战方向摘要，如「货柜岛 → 北顿」 */
  endpoints?: BilingualText
  /** 打开关联线路详情时预选的方向 */
  directionKey?: 'N' | 'S' | 'E' | 'W'
  /** 当日挑战简介 */
  intro?: DailyChallengeIntro
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
const PLACEHOLDER_DAILY_CHALLENGE: Pick<
  DailyChallengeInfo,
  'event' | 'routeNumber' | 'endpoints' | 'directionKey' | 'intro'
> = {
  event: { zh: '浓雾天气（Heavy Fog）', en: 'Heavy Fog weather' },
  routeNumber: '141P',
  endpoints: { zh: '货柜码头岛 → 北顿市中心', en: "Container's Island Bus Terminus → Norton Town Center" },
  directionKey: 'E',
  intro: {
    body: {
      zh: '浓雾笼罩阳光群岛，能见度极低，难以辨认道路、站点与前方交通。请谨慎驾驶，保持准点，安全穿越大雾完成线路。',
      en: 'Dense fog has covered the Sunshine Islands. Visibility is severely reduced, making it difficult to identify roads, stops, and traffic ahead. Drive carefully, stay on schedule, and complete your route safely through the fog.',
    },
    objective: {
      zh: '目标：在浓雾天气（Heavy Fog）下完成指定线路，且不得跳站。',
      en: 'Objective: Complete the assigned route without missing stops while driving in Heavy Fog weather conditions.',
    },
    closing: {
      zh: '🌫️ 祝你好运，驾驶员。乘客们正指望着你。 🚌',
      en: '🌫️ Good luck, driver. The passengers are counting on you. 🚌',
    },
  },
}

export function findDailyChallengeDirectionIndex(
  route: BusRoute,
  directionKey?: string,
): number | null {
  if (!directionKey) return null
  const key = directionKey.toUpperCase()
  const sorted = getSortedDirectionDataIndices(route)
  for (let sortedIndex = 0; sortedIndex < sorted.length; sortedIndex++) {
    const dataIndex = sorted[sortedIndex]!
    if (getDirectionKey(route, dataIndex)?.toUpperCase() === key) return sortedIndex
  }
  return null
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

const PRIVATE_HIRE_OPERATOR_LABEL: BilingualText = {
  zh: '私人租用',
  en: 'Private Hire',
}

/** 卡片右下角：普通线路显示运营公司；PH 显示「私人租用」 */
export function getDailyChallengeOperatorsLabel(
  challenge: DailyChallengeInfo,
  locale: Locale,
): string | null {
  if (isPrivateHireChallengeRoute(challenge.routeNumber)) {
    return getPrimaryText(PRIVATE_HIRE_OPERATOR_LABEL, locale)
  }

  const routeNumber = challenge.routeNumber?.trim()
  if (!routeNumber) return null

  const route = findRouteForDailyChallenge(routeNumber)
  if (!route || route.operators.length === 0) return null

  return formatRouteOperators(route)
}

function matchesDailyChallengeQuery(challenge: DailyChallengeInfo, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const haystack = [
    challenge.routeNumber,
    challenge.event.zh,
    challenge.event.en,
    challenge.endpoints?.zh,
    challenge.endpoints?.en,
    challenge.intro?.body.zh,
    challenge.intro?.body.en,
    challenge.intro?.objective.zh,
    challenge.intro?.objective.en,
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
