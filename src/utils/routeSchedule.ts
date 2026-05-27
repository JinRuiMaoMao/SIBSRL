import { getOptionalText, getPrimaryText } from '../i18n/displayText'
import type { Locale } from '../i18n/types'
import type { BusRoute } from '../types/route'
import {
  getRouteDirectionCount,
  getSortedDirectionDataIndices,
  routeHasDirectionVariants,
} from './routeDirectionCore'

/** 拆分路线级或方向级「A / B」服务时间 */
export function splitServiceTimeSegments(text: string): string[] {
  const parts = text
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length ? parts : [text.trim()].filter(Boolean)
}

function pickServiceTimeBySortedPosition(
  route: BusRoute,
  dataIndex: number,
  segments: string[],
): string | null {
  const sorted = getSortedDirectionDataIndices(route)
  const pos = sorted.indexOf(dataIndex)
  if (pos < 0 || pos >= segments.length) return null
  return segments[pos] ?? null
}

/** 从合并的服务时间文案中选取当前方向 */
export function pickServiceTimeForDirection(
  serviceTimeText: string,
  route: BusRoute,
  dataIndex: number,
): string | null {
  const segments = splitServiceTimeSegments(serviceTimeText)
  if (!segments.length) return null
  if (segments.length === 1) return segments[0]

  const dirCount = getRouteDirectionCount(route)
  if (segments.length === dirCount) {
    return pickServiceTimeBySortedPosition(route, dataIndex, segments)
  }

  return pickServiceTimeBySortedPosition(route, dataIndex, segments) ?? segments[0]
}

/** 将路线级「方向 A / 方向 B」服务时间写入缺失的 stops[].serviceTime */
export function enrichDirectionServiceTimes(route: BusRoute): BusRoute {
  if (!route.stops?.length || !route.serviceTime) return route

  const zhSegments = splitServiceTimeSegments(route.serviceTime.zh)
  const enSegments = splitServiceTimeSegments(route.serviceTime.en)
  const dirCount = getRouteDirectionCount(route)
  if (zhSegments.length < 2 || zhSegments.length !== dirCount) return route

  const missing = route.stops.some((g) => !g.serviceTime)
  if (!missing) return route

  let changed = false
  const stops = route.stops.map((group, di) => {
    if (group.serviceTime) return group
    const zh = pickServiceTimeBySortedPosition(route, di, zhSegments)
    const en = pickServiceTimeBySortedPosition(route, di, enSegments)
    if (!zh && !en) return group
    changed = true
    return {
      ...group,
      serviceTime: { zh: zh ?? en ?? '', en: en ?? zh ?? '' },
    }
  })

  return changed ? { ...route, stops } : route
}

export function resolveServiceTimeForDataIndex(
  route: BusRoute,
  dataIndex: number,
  locale: Locale,
): string | null {
  const group = route.stops?.[dataIndex]
  if (group?.serviceTime) {
    return getPrimaryText(group.serviceTime, locale)
  }

  const routeLevel = getOptionalText(route.serviceTime, locale)
  if (!routeLevel) return null

  if (routeHasDirectionVariants(route)) {
    const picked = pickServiceTimeForDirection(routeLevel, route, dataIndex)
    if (picked) return picked
  }

  return routeLevel
}
