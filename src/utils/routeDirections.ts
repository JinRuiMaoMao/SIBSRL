import { getOptionalText, getPrimaryText } from '../i18n/displayText'
import { extractKmDisplay } from './routeDisplay'
import { buildDirectionLengthKmMap } from './routeLength'
import type { MessageKey } from '../i18n/messages'
import type { Locale } from '../i18n/types'
import { isChineseLocale } from '../i18n/types'
import type { BilingualText, BusRoute } from '../types/route'
import { formatRouteEndpoints } from './routeDisplay'

/** Toggle order: north before south, west before east. */
const DIRECTION_SORT_ORDER: Record<string, number> = {
  N: 0,
  W: 1,
  E: 2,
  S: 3,
}

export function routeHasDirectionVariants(route: BusRoute): boolean {
  return (route.stops?.length ?? 0) > 1
}

export function getRouteDirectionCount(route: BusRoute): number {
  return route.stops?.length ?? 0
}

export function getSortedDirectionDataIndices(route: BusRoute): number[] {
  const count = getRouteDirectionCount(route)
  const indices = Array.from({ length: count }, (_, i) => i)
  if (count <= 1) return indices

  return indices.sort((a, b) => {
    const ka = getDirectionKey(route, a) ?? `~${a}`
    const kb = getDirectionKey(route, b) ?? `~${b}`
    const pa = DIRECTION_SORT_ORDER[ka] ?? 50
    const pb = DIRECTION_SORT_ORDER[kb] ?? 50
    if (pa !== pb) return pa - pb
    return a - b
  })
}

/** UI direction index (sorted) → index in `route.stops`. */
export function getDirectionDataIndex(route: BusRoute, sortedIndex: number): number {
  const sorted = getSortedDirectionDataIndices(route)
  return sorted[sortedIndex] ?? 0
}

function inferDirectionKey(direction: BilingualText): string | null {
  const zh = direction.zh
  const en = direction.en.toLowerCase()
  if (zh.startsWith('南行') || en.includes('southbound')) return 'S'
  if (zh.startsWith('北行') || en.includes('northbound')) return 'N'
  if (zh.startsWith('东行') || en.includes('eastbound')) return 'E'
  if (zh.startsWith('西行') || en.includes('westbound')) return 'W'
  return null
}

const DIRECTION_MESSAGE_KEYS: Record<string, MessageKey> = {
  N: 'directionNorth',
  S: 'directionSouth',
  E: 'directionEast',
  W: 'directionWest',
}

export function getDirectionKey(route: BusRoute, dataIndex: number): string | null {
  const group = route.stops?.[dataIndex]
  if (!group) return null
  return group.directionKey ?? inferDirectionKey(group.direction)
}

export function getDirectionShortLabel(
  route: BusRoute,
  sortedIndex: number,
  t: (key: MessageKey) => string,
  locale: Locale,
): string {
  const dataIndex = getDirectionDataIndex(route, sortedIndex)
  const key = getDirectionKey(route, dataIndex)
  if (key) {
    const msgKey = DIRECTION_MESSAGE_KEYS[key]
    if (msgKey) return t(msgKey)
  }
  const group = route.stops?.[dataIndex]
  if (!group) return String(sortedIndex + 1)
  if (isChineseLocale(locale)) {
    const match = group.direction.zh.match(/^([^（(]+)/)
    return match?.[1]?.trim() ?? group.direction.zh
  }
  const en = group.direction.en
  if (/southbound/i.test(en)) return 'S'
  if (/northbound/i.test(en)) return 'N'
  if (/eastbound/i.test(en)) return 'E'
  if (/westbound/i.test(en)) return 'W'
  return key ?? String(sortedIndex + 1)
}

export function formatDirectionEndpoints(
  route: BusRoute,
  sortedIndex: number,
  locale: Locale,
): string {
  const dataIndex = getDirectionDataIndex(route, sortedIndex)
  const group = route.stops?.[dataIndex]
  if (!group?.list.length) return formatRouteEndpoints(route, locale)
  const first = getPrimaryText(group.list[0].name, locale)
  const last = getPrimaryText(group.list[group.list.length - 1].name, locale)
  return `${first} → ${last}`
}

export function getDirectionEndpointNames(
  route: BusRoute,
  sortedIndex: number,
  locale: Locale,
): { origin: string; destination: string } | null {
  const dataIndex = getDirectionDataIndex(route, sortedIndex)
  const group = route.stops?.[dataIndex]
  if (!group?.list.length) return null
  return {
    origin: getPrimaryText(group.list[0].name, locale),
    destination: getPrimaryText(group.list[group.list.length - 1].name, locale),
  }
}

/** Service hours for the active direction only (from `stops[].serviceTime`). */
export function getDirectionServiceTime(
  route: BusRoute,
  sortedIndex: number,
  locale: Locale,
): string | null {
  if (routeHasDirectionVariants(route)) {
    const dataIndex = getDirectionDataIndex(route, sortedIndex)
    const group = route.stops?.[dataIndex]
    if (group?.serviceTime) return getPrimaryText(group.serviceTime, locale)
    return null
  }
  if (!route.serviceTime) return null
  return getPrimaryText(route.serviceTime, locale)
}

export function clampDirectionIndex(route: BusRoute, sortedIndex: number): number {
  const count = getRouteDirectionCount(route)
  if (count <= 1) return 0
  return Math.max(0, Math.min(sortedIndex, count - 1))
}

/** 卡片 / 详情：当前行车方向的全长 */
export function getDirectionLengthKm(
  route: BusRoute,
  sortedIndex: number,
  locale: Locale,
): string | null {
  const dataIndex = getDirectionDataIndex(route, sortedIndex)
  const map = buildDirectionLengthKmMap(route, locale)
  if (map.has(dataIndex)) return map.get(dataIndex)!

  const routeLength = getOptionalText(route.length, locale)
  if (!routeLength) return null
  return extractKmDisplay(routeLength)
}
