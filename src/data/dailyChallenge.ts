import { routes } from './routes'
import {
  findScheduledDailyChallenge,
  type DailyChallengeScheduleDay,
} from './dailyChallengeSchedule'
import { getPrimaryText } from '../i18n/displayText'
import type { Locale } from '../i18n/types'
import type { BilingualText, BusRoute, RouteFilters } from '../types/route'
import {
  DISPLAY_ONLY_RENAMES,
  getMergeDirectionKey,
  mergeRoutesByBaseNumber,
  toMergeBaseRouteNumber,
} from '../utils/routeMerge'
import { formatRouteOperators } from '../utils/routeDisplay'
import {
  getDirectionKey,
  getSortedDirectionDataIndices,
} from '../utils/routeDirectionCore'
import { routeMatchesTypeFilter } from '../utils/routeTypes'
import {
  challengeRouteNumberMatchesQuery,
  matchesRouteSearchQuery,
} from '../utils/routeSearchQuery'
import { parseStructuredSearchQuery } from '../utils/structuredSearchQuery'

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
  /** Private Hire 当日随机站序（来自日程记录） */
  privateHireStops?: readonly BilingualText[]
  /** 打开关联线路详情时预选的方向 */
  directionKey?: 'N' | 'S' | 'E' | 'W'
  /** 当日挑战简介 */
  intro?: DailyChallengeIntro
  /** 无日程或未公布当日挑战 */
  isAvailable: boolean
  /** 旧占位数据（已弃用，保留字段兼容） */
  isPlaceholder: boolean
  /** 来自 data/daily-challenge-schedule-*.json */
  fromSchedule?: boolean
  race?: boolean
}

export const DAILY_CHALLENGE_CARD_ID = 'daily-challenge-today'

const PRIVATE_HIRE_WIKI_URL =
  'https://sunshine-islands-roblox.fandom.com/wiki/Private_Hire'

const GAME_DAY_OFFSET_MS = 8 * 60 * 60 * 1000

/** In-game daily challenges reset at 08:00 HKT. */
export function todayHktDateString(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong' }).format(
    new Date(now.getTime() - GAME_DAY_OFFSET_MS),
  )
}

/** 距下次 HKT 08:00 更换的毫秒数 */
export function getMsUntilNextDailyChallengeReset(now = new Date()): number {
  const gameDay = todayHktDateString(now)
  const [year, month, day] = gameDay.split('-').map(Number)
  const nextResetUtc = Date.UTC(year!, month! - 1, day! + 1, 0, 0, 0, 0)
  return Math.max(0, nextResetUtc - now.getTime())
}

export function formatDailyChallengeCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function isPrivateHireChallengeRoute(routeNumber?: string): boolean {
  return !!routeNumber && /^PH/i.test(routeNumber.trim())
}

export function resolveDailyChallengeRouteLookup(routeCode: string): {
  lookupNumber: string
  directionKey?: 'N' | 'S' | 'E' | 'W'
} {
  const trimmed = routeCode.trim()
  if (!trimmed || isPrivateHireChallengeRoute(trimmed)) {
    return { lookupNumber: trimmed }
  }
  const base = toMergeBaseRouteNumber(trimmed)
  const lookupNumber = DISPLAY_ONLY_RENAMES[base] ?? base
  const dir = getMergeDirectionKey(trimmed)
  return { lookupNumber, directionKey: dir ?? undefined }
}

export function findRouteForDailyChallenge(routeNumberOrCode: string): BusRoute | null {
  const { lookupNumber } = resolveDailyChallengeRouteLookup(routeNumberOrCode)
  const key = lookupNumber.trim().toLowerCase()
  if (!key || isPrivateHireChallengeRoute(key)) return null
  const display = mergeRoutesByBaseNumber(routes)
  return (
    display.find(
      (r) => r.number.toLowerCase() === key || r.id.toLowerCase() === key,
    ) ?? null
  )
}

const EVENT_ZH: Record<string, string> = {
  'Free Ride Day': '免费乘车日',
  'Safety First': '安全第一',
  'Private Hire': '私人租用',
  'Rare Appearance x Private Hire': '罕见外观 × 私人租用',
  'Rare Appearance': '罕见外观',
  'E-Payment Outage': '电子支付故障',
  'E-Payment': '电子支付故障',
  'Friendly Day': '友善日',
  'Lazy Passengers': '懒惰乘客',
  'Slow Passengers': '慢速乘客',
  'Sponsored Route': '赞助线路',
  'Concert Aftermath': '演唱会散场',
  'Concert Overrun': '演唱会超时',
  'Concert Crowd Dispersal': '演唱会人潮疏散',
  'Sightseeing Launch': '观光线路上线',
  'Street light outage': '街灯停电',
  'Street Light Outage': '街灯停电',
  'Street Light Outage x Safety First': '街灯停电 × 安全第一',
  'Marathon Road Closure': '马拉松封路',
  'Marathon Road Closure (N)': '马拉松封路（北行）',
  'Marathon Road Closure at Night': '夜间马拉松封路',
  'Rush Hour': '繁忙时间',
  'Foggy Day': '浓雾天气',
  'Daily Challenge': '每日挑战',
  'Urban Odyssey': '城市漫游',
  'Safety First x Urban Odyssey': '安全第一 × 城市漫游',
  'Marathon Shuttle': '马拉松接驳',
  'Bridge Closure': '桥梁封闭',
  'Grumble Day': '抱怨日',
  'Lazy Passengers x Safety First': '懒惰乘客 × 安全第一',
}

function toEventLabel(eventEn: string, race: boolean): BilingualText {
  const zh = EVENT_ZH[eventEn] ?? eventEn
  if (race) {
    return { zh: `[竞速] ${zh}`, en: `[Race] ${eventEn}` }
  }
  return { zh, en: eventEn }
}

function findDirectionIndexOnRoute(
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

function buildEndpointsFromRoute(
  route: BusRoute,
  directionKey?: string,
): BilingualText | undefined {
  const sortedIndex = findDirectionIndexOnRoute(route, directionKey) ?? 0
  const dataIndex = getSortedDirectionDataIndices(route)[sortedIndex]
  const group = dataIndex != null ? route.stops?.[dataIndex] : undefined
  if (group?.list.length) {
    const first = group.list[0]!.name
    const last = group.list[group.list.length - 1]!.name
    return { zh: `${first.zh} → ${last.zh}`, en: `${first.en} → ${last.en}` }
  }
  if (route.origin && route.destination) {
    return {
      zh: `${route.origin.zh} → ${route.destination.zh}`,
      en: `${route.origin.en} → ${route.destination.en}`,
    }
  }
  return undefined
}

function normalizePrivateHireStops(
  stops: DailyChallengeScheduleDay['privateHireStops'],
): BilingualText[] | undefined {
  if (!stops?.length) return undefined
  return stops.map((stop) => ({
    zh: stop.name.zh.trim() || stop.name.en.trim(),
    en: stop.name.en.trim() || stop.name.zh.trim(),
  }))
}

function buildEndpointsFromPrivateHireStops(stops: readonly BilingualText[]): BilingualText {
  const first = stops[0]!
  const last = stops[stops.length - 1]!
  return { zh: `${first.zh} → ${last.zh}`, en: `${first.en} → ${last.en}` }
}

function buildIntro(
  event: BilingualText,
  routeCode: string | null,
  race: boolean,
): DailyChallengeIntro {
  const routeSuffixZh = routeCode ? `（${routeCode}）` : ''
  const routeSuffixEn = routeCode ? ` (${routeCode})` : ''
  const raceLeadZh = race ? '竞速挑战：' : ''
  const raceLeadEn = race ? 'Racing challenge: ' : ''

  if (event.en === 'Foggy Day' || event.zh.includes('浓雾')) {
    return {
      body: {
        zh: '浓雾笼罩阳光群岛，能见度极低，难以辨认道路、站点与前方交通。请谨慎驾驶，保持准点，安全穿越大雾完成线路。',
        en: 'Dense fog has covered the Sunshine Islands. Visibility is severely reduced, making it difficult to identify roads, stops, and traffic ahead. Drive carefully, stay on schedule, and complete your route safely through the fog.',
      },
      objective: {
        zh: `目标：在浓雾天气下完成指定线路${routeSuffixZh}，且不得跳站。`,
        en: `Objective: Complete the assigned route${routeSuffixEn} without missing stops in foggy conditions.`,
      },
      closing: {
        zh: '🌫️ 祝你好运，驾驶员。乘客们正指望着你。 🚌',
        en: '🌫️ Good luck, driver. The passengers are counting on you. 🚌',
      },
    }
  }

  if (event.en === 'Marathon Road Closure at Night') {
    return {
      body: {
        zh: '夜间马拉松封路生效，N271 改按封路安排行驶，由彩虹中心开往长岛码头，经中西桥一带。请把游戏时间设为 03:30，并按夜间道路环境小心驾驶。',
        en: 'Night marathon road closures are in effect. Operate N271 from Rainbow Estate Complex to Long Island Ferry Pier via the Central Western Bridge area. Set the in-game time to 03:30 and drive carefully in overnight conditions.',
      },
      objective: {
        zh: '目标：使用任意 HK Special 巴士、CSB 或 FT 巴士完成 N271 南行挑战，不得跳站。',
        en: 'Objective: Complete the southbound N271 challenge with any HK Special bus, CSB bus, or FT bus without skipping stops.',
      },
      closing: {
        zh: '🌙 祝你好运，驾驶员。保持准点，安全通过封路区。',
        en: '🌙 Good luck, driver. Keep time and pass the closure safely.',
      },
    }
  }

  return {
    body: {
      zh: `今日挑战：${event.zh}${routeSuffixZh}。`,
      en: `Today's challenge: ${event.en}${routeSuffixEn}.`,
    },
    objective: {
      zh: `${raceLeadZh}请按要求完成指定线路，不得跳站。`,
      en: `${raceLeadEn}Complete the assigned route without skipping stops as required.`,
    },
    closing: {
      zh: '🚌 祝你好运，驾驶员。',
      en: '🚌 Good luck, driver.',
    },
  }
}

export function buildDailyChallengeFromScheduleDay(
  entry: DailyChallengeScheduleDay,
): DailyChallengeInfo {
  if (!entry.event) {
    return {
      date: entry.date,
      event: { zh: '', en: '' },
      isAvailable: false,
      isPlaceholder: false,
      fromSchedule: true,
    }
  }

  const event = toEventLabel(entry.event, entry.race)
  const routeNumber = entry.routeCode ?? undefined
  const privateHireStops = normalizePrivateHireStops(entry.privateHireStops)
  let directionKey: 'N' | 'S' | 'E' | 'W' | undefined
  let endpoints: BilingualText | undefined

  if (routeNumber && isPrivateHireChallengeRoute(routeNumber) && privateHireStops?.length) {
    endpoints = buildEndpointsFromPrivateHireStops(privateHireStops)
  } else if (routeNumber && !isPrivateHireChallengeRoute(routeNumber)) {
    const resolved = resolveDailyChallengeRouteLookup(routeNumber)
    directionKey = resolved.directionKey
    const linked = findRouteForDailyChallenge(routeNumber)
    if (linked) {
      endpoints = buildEndpointsFromRoute(linked, directionKey)
    }
  }

  if (entry.event === 'Marathon Road Closure at Night' && routeNumber?.startsWith('N271')) {
    endpoints = {
      zh: '彩虹中心 → 长岛码头',
      en: 'Rainbow Estate Complex → Long Island Ferry Pier',
    }
  }

  const isEpayment472West =
    routeNumber === '472W' &&
    (entry.event === 'E-Payment Outage' || entry.event === 'E-Payment')
  if (isEpayment472West) {
    directionKey = 'W'
    endpoints = {
      zh: '仙貝 → 北頓',
      en: 'Senpai → Norton',
    }
  }

  let intro = buildIntro(event, entry.routeCode, entry.race)
  if (isEpayment472West) {
    intro = {
      body: {
        zh: '电子支付系统故障，乘客须以现金支付车费。',
        en: 'Electronic payment is unavailable; passengers must pay fares in cash.',
      },
      objective: {
        zh: '目标：使用任意 HZ、CSB 或 HK Special 巴士完成 472 West（仙貝 → 北頓），不得跳站。',
        en: 'Objective: Complete 472 West (Senpai → Norton) with any HZ, CSB, or HK Special bus without skipping stops.',
      },
      closing: {
        zh: '🚌 祝你好运，驾驶员。',
        en: '🚌 Good luck, driver.',
      },
    }
  }

  return {
    date: entry.date,
    event,
    routeNumber,
    endpoints,
    directionKey,
    intro,
    privateHireStops,
    isAvailable: true,
    isPlaceholder: false,
    fromSchedule: true,
    race: entry.race,
  }
}

function buildFromSchedule(date: string): DailyChallengeInfo {
  const entry = findScheduledDailyChallenge(date)
  if (!entry) {
    return {
      date,
      event: { zh: '', en: '' },
      isAvailable: false,
      isPlaceholder: false,
      fromSchedule: true,
    }
  }

  return buildDailyChallengeFromScheduleDay(entry)
}

const EMPTY_CHALLENGE: DailyChallengeInfo = {
  date: '',
  event: { zh: '', en: '' },
  isAvailable: false,
  isPlaceholder: false,
}

export function findDailyChallengeDirectionIndex(
  route: BusRoute,
  directionKey?: string,
): number | null {
  return findDirectionIndexOnRoute(route, directionKey)
}

/** 当日挑战线路编号（可含方向后缀，如 41AS）；无有效线路时返回 null */
export function getDailyChallengeListedRouteId(challenge: DailyChallengeInfo): string | null {
  const code = challenge.routeNumber?.trim()
  if (!code || !challenge.isAvailable || isPrivateHireChallengeRoute(code)) return null
  if (!findRouteForDailyChallenge(code)) return null
  return code
}

export function isDailyChallengeAvailable(challenge: DailyChallengeInfo): boolean {
  return challenge.isAvailable && !!challenge.event.en
}

export function getTodaysDailyChallenge(now = new Date()): DailyChallengeInfo {
  const date = todayHktDateString(now)
  const scheduled = buildFromSchedule(date)
  if (scheduled.isAvailable) return scheduled

  return { ...EMPTY_CHALLENGE, date }
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
  if (
    routeNumber === '472W' &&
    (challenge.event.en.includes('E-Payment') || challenge.event.zh.includes('电子支付'))
  ) {
    return locale === 'zh' ? 'HZ / CSB / HK' : 'HZ / CSB / HK'
  }

  if (!route || route.operators.length === 0) return null

  return formatRouteOperators(route)
}

function matchesDailyChallengeQuery(challenge: DailyChallengeInfo, query: string): boolean {
  const q = parseStructuredSearchQuery(query).text.trim()
  if (!q) return true

  const routeNumber = challenge.routeNumber?.trim()
  const linkedRoute =
    routeNumber && !isPrivateHireChallengeRoute(routeNumber)
      ? findRouteForDailyChallenge(routeNumber)
      : null

  if (linkedRoute && matchesRouteSearchQuery(linkedRoute, q)) return true
  if (challengeRouteNumberMatchesQuery(routeNumber, q)) return true

  const haystack = [
    challenge.routeNumber,
    challenge.event.zh,
    challenge.event.en,
    challenge.endpoints?.zh,
    challenge.endpoints?.en,
    ...(challenge.privateHireStops?.flatMap((stop) => [stop.zh, stop.en]) ?? []),
    challenge.intro?.body.zh,
    challenge.intro?.body.en,
    challenge.intro?.objective.zh,
    challenge.intro?.objective.en,
    '每日挑战',
    'daily challenge',
    '私人租用',
    'private hire',
    '竞速',
    'race',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(q.toLowerCase())
}

/** 与线路列表共用同一套筛选/搜索规则 */
export function dailyChallengeMatchesFilters(
  challenge: DailyChallengeInfo,
  filters: RouteFilters,
): boolean {
  if (!isDailyChallengeAvailable(challenge)) return false
  if (!matchesDailyChallengeQuery(challenge, filters.query)) return false

  const structured = parseStructuredSearchQuery(filters.query)
  const routeNumber = challenge.routeNumber
  const linkedRoute =
    routeNumber && !isPrivateHireChallengeRoute(routeNumber)
      ? findRouteForDailyChallenge(routeNumber)
      : null

  const zone = structured.zone ?? (filters.zone !== 'all' ? filters.zone : 'all')
  if (zone !== 'all') {
    if (!linkedRoute?.zones.includes(zone)) return false
  }

  const operator = structured.operator ?? filters.operator
  if (operator !== 'all') {
    if (!linkedRoute?.operators.some((o) => o.toLowerCase() === operator.toLowerCase())) {
      return false
    }
  }

  const type = structured.type ?? filters.type
  if (type !== 'all') {
    if (linkedRoute) {
      if (!routeMatchesTypeFilter(linkedRoute, type)) return false
    } else if (type !== 'event') {
      return false
    }
  }

  if (structured.category) {
    if (linkedRoute?.category !== structured.category) return false
  }

  for (const excluded of structured.excludeCategories) {
    if (linkedRoute?.category === excluded) return false
  }

  for (const excluded of structured.excludeTypes) {
    if (linkedRoute && routeMatchesTypeFilter(linkedRoute, excluded)) return false
  }

  for (const excludedZone of structured.excludeZones) {
    if (linkedRoute?.zones.includes(excludedZone)) return false
  }

  for (const excludedOperator of structured.excludeOperators) {
    if (
      linkedRoute?.operators.some((o) => o.toLowerCase() === excludedOperator.toLowerCase())
    ) {
      return false
    }
  }

  if (structured.level != null) {
    if (linkedRoute?.levelRequired !== structured.level) return false
  }

  return true
}
