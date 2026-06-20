import { getOptionalText, getPrimaryText } from '../i18n/displayText'
import { pickKmForDirection, resolveLengthKmForDataIndex, splitLengthSegments } from './routeLength'
import {
  clampDirectionIndex,
  getDirectionDataIndex,
  getDirectionKey,
  getRouteDirectionCount,
  getSortedDirectionCount,
  getSortedDirectionDataIndices,
  getSortedDirectionIndexFromDataIndex,
  routeHasDirectionVariants,
} from './routeDirectionCore'
import { resolveServiceTimeForDataIndex } from './routeSchedule'
import type { MessageKey } from '../i18n/messages'
import type { Locale } from '../i18n/types'
import { isChineseLocale } from '../i18n/types'
import type { BusRoute } from '../types/route'
import { formatRouteEndpoints, formatStopsEndpoints } from './routeDisplay'

export {
  clampDirectionIndex,
  getDirectionDataIndex,
  getDirectionKey,
  getRouteDirectionCount,
  getSortedDirectionCount,
  getSortedDirectionDataIndices,
  getSortedDirectionIndexFromDataIndex,
  routeHasDirectionVariants,
}

const DIRECTION_MESSAGE_KEYS: Record<string, MessageKey> = {
  N: 'directionNorth',
  S: 'directionSouth',
  E: 'directionEast',
  W: 'directionWest',
}

const DIRECTION_COMPACT_MESSAGE_KEYS: Record<string, MessageKey> = {
  N: 'directionNorthCompact',
  S: 'directionSouthCompact',
  E: 'directionEastCompact',
  W: 'directionWestCompact',
}

const ZH_DIRECTION_HEAD =
  /^(北行|南行|东行|西行|环线|循环|循环方向|方向\d+)/

function directionLabelKey(
  key: string,
  compact: boolean,
  locale: Locale,
): MessageKey {
  if (compact && !isChineseLocale(locale)) {
    return DIRECTION_COMPACT_MESSAGE_KEYS[key] ?? DIRECTION_MESSAGE_KEYS[key]
  }
  return DIRECTION_MESSAGE_KEYS[key]
}

/** 方向切换按钮：仅显示「北行/南行」等，不显示起终点全文 */
export function getDirectionShortLabel(
  route: BusRoute,
  sortedIndex: number,
  t: (key: MessageKey) => string,
  locale: Locale,
  compact = false,
): string {
  const dataIndex = getDirectionDataIndex(route, sortedIndex)
  const key = getDirectionKey(route, dataIndex)
  if (key && DIRECTION_MESSAGE_KEYS[key]) {
    return t(directionLabelKey(key, compact, locale))
  }
  const group = route.stops?.[dataIndex]
  if (!group) return String(sortedIndex + 1)

  if (isChineseLocale(locale)) {
    const head = group.direction.zh.match(ZH_DIRECTION_HEAD)?.[1]
    if (head) {
      if (head === '环线' || head.startsWith('循环')) return t('serviceTypeLoop')
      if (head.startsWith('方向')) return head
      return head
    }
    if (/→|↔/.test(group.direction.zh)) {
      return key && DIRECTION_MESSAGE_KEYS[key]
        ? t(directionLabelKey(key, compact, locale))
        : String(sortedIndex + 1)
    }
    const short = group.direction.zh.match(/^([^（(→↔]+)/)?.[1]?.trim()
    if (short && short.length <= 8) return short
    return String(sortedIndex + 1)
  }

  const en = group.direction.en
  if (/southbound/i.test(en)) return t(directionLabelKey('S', compact, locale))
  if (/northbound/i.test(en)) return t(directionLabelKey('N', compact, locale))
  if (/eastbound/i.test(en)) return t(directionLabelKey('E', compact, locale))
  if (/westbound/i.test(en)) return t(directionLabelKey('W', compact, locale))
  if (/→|↔/.test(en)) {
    return key && DIRECTION_MESSAGE_KEYS[key]
      ? t(directionLabelKey(key, compact, locale))
      : String(sortedIndex + 1)
  }
  if (key && DIRECTION_MESSAGE_KEYS[key]) return t(directionLabelKey(key, compact, locale))
  return String(sortedIndex + 1)
}

export function formatDirectionEndpoints(
  route: BusRoute,
  sortedIndex: number,
  locale: Locale,
): string {
  const dataIndex = getDirectionDataIndex(route, sortedIndex)
  const group = route.stops?.[dataIndex]
  if (!group?.list.length) return formatRouteEndpoints(route, locale)
  return formatStopsEndpoints(route, group, locale)
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

/** Service hours for the active direction only (from `stops[].serviceTime` or route-level split). */
export function getDirectionServiceTime(
  route: BusRoute,
  sortedIndex: number,
  locale: Locale,
): string | null {
  const dataIndex = routeHasDirectionVariants(route)
    ? getDirectionDataIndex(route, sortedIndex)
    : 0
  return resolveServiceTimeForDataIndex(route, dataIndex, locale)
}

/** 卡片 / 详情：当前行车方向的全长 */
export function getDirectionLengthKm(
  route: BusRoute,
  sortedIndex: number,
  locale: Locale,
): string | null {
  const dataIndex = getDirectionDataIndex(route, sortedIndex)
  const routeLength = getOptionalText(route.length, locale)
  if (routeLength && routeHasDirectionVariants(route)) {
    const segments = splitLengthSegments(routeLength)
    if (segments.length > 1) {
      const km = pickKmForDirection(routeLength, route, dataIndex, locale)
      if (km) return km
    }
  }
  return resolveLengthKmForDataIndex(route, dataIndex, locale)
}
