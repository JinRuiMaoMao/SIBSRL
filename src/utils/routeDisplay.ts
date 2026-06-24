import { stripTurningPointSuffix } from './stopTurningPoint'
import { getPrimaryText, localizeChinese } from '../i18n/displayText'
import type { Locale } from '../i18n/types'
import { isChineseLocale } from '../i18n/types'
import type { BilingualText, BusRoute, RoutePattern } from '../types/route'

type StopGroup = NonNullable<BusRoute['stops']>[number]

/** 起讫之间的方向符号：双向/环线用左右箭头，单程用右箭头 */
export function getRouteArrow(pattern: RoutePattern): string {
  if (pattern === 'oneway') return '→'
  return '↔'
}

/** 单行起终点（环线同站只显示站名一次） */
export function formatEndpointLine(
  origin: string,
  destination: string,
  pattern: RoutePattern,
): string {
  if (origin === destination) {
    return pattern === 'circular' ? origin : `${origin} ${getRouteArrow(pattern)} ${destination}`
  }
  return `${origin} → ${destination}`
}

function directionTextForLocale(direction: BilingualText, locale: Locale): string {
  if (isChineseLocale(locale)) return localizeChinese(direction.zh, locale)
  return direction.en.trim() || direction.zh
}

/** 从「环线（A ↺ B）」类方向说明提取折返点 */
function extractLoopTurnLabel(direction: BilingualText, locale: Locale): string | null {
  const text = directionTextForLocale(direction, locale)
  const m = text.match(/↺\s*([^）)\n]+)/)
  const label = m?.[1]?.trim()
  if (!label || label.length > 48) return null
  return stripTurningPointSuffix(label).main || null
}

function pickLoopTurnFromStops(group: StopGroup, locale: Locale, hub: string): string | null {
  if (group.list.length < 3) return null
  const inner = group.list.slice(1, -1)
  const mid = inner[Math.floor(inner.length / 2)] ?? inner[0]
  const name = getPrimaryText(mid.name, locale)
  return name && name !== hub ? name : null
}

/** 按站序与方向说明格式化起终点（环线显示折返点） */
export function formatStopsEndpoints(
  route: BusRoute,
  group: StopGroup,
  locale: Locale,
): string {
  if (!group.list.length) {
    const origin = getPrimaryText(route.origin, locale)
    const destination = getPrimaryText(route.destination, locale)
    return formatEndpointLine(origin, destination, route.pattern)
  }

  const first = getPrimaryText(group.list[0].name, locale)
  const last = getPrimaryText(group.list[group.list.length - 1].name, locale)

  if (route.pattern === 'circular' && first === last) {
    const turn =
      extractLoopTurnLabel(group.direction, locale) ?? pickLoopTurnFromStops(group, locale, first)
    if (turn) return `${first} ↺ ${turn}`
    return `${first}（环线）`
  }

  return formatEndpointLine(first, last, route.pattern)
}

export function formatRouteEndpoints(route: BusRoute, locale: Locale): string {
  const group = route.stops?.[0]
  if (group?.list.length) return formatStopsEndpoints(route, group, locale)

  const origin = getPrimaryText(route.origin, locale)
  const destination = getPrimaryText(route.destination, locale)

  if (route.pattern === 'circular' && origin === destination) {
    const dir = route.stops?.[0]?.direction
    const turn = dir ? extractLoopTurnLabel(dir, locale) : null
    if (turn) return `${origin} ↺ ${turn}`
    return `${origin}（环线）`
  }

  return formatEndpointLine(origin, destination, route.pattern)
}

/** 从任意长度文案提取「19 km」 */
export function extractKmDisplay(text: string): string | null {
  const match = text.match(/([\d.]+)\s*km/i)
  if (match) return `${match[1]} km`
  return null
}

export function formatRouteOperators(route: BusRoute): string {
  return route.operators.join(' & ')
}
