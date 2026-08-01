import type { Locale } from '../i18n/types'
import { getOptionalText } from '../i18n/displayText'
import type { BusRoute, RouteStop } from '../types/route'
import { extractKmDisplay, formatStopsEndpoints } from './routeDisplay'
import { splitLengthSegments } from './routeLength'
import {
  getDirectionDataIndex,
  getSortedDirectionDataIndices,
  routeHasDirectionVariants,
} from './routeDirectionCore'

type StopGroup = NonNullable<BusRoute['stops']>[number]

/** 246XA 东行段结束后折返至东锦葵海傍路的站序 */
const ROUTE_246X_LOOP_RETURN: RouteStop[] = [
  { name: { zh: '中环桥', en: 'Central Bridge' }, zone: 4 },
  { name: { zh: '东锦葵大街', en: 'Eastmallow Main Street' }, zone: 4 },
  { name: { zh: '东锦葵海傍路', en: 'Eastmallow Praya Road' }, zone: 4 },
]

function stopKey(stop: RouteStop): string {
  return `${stop.name.zh}\0${stop.name.en}`
}

function mergeStopLists(lists: RouteStop[][]): RouteStop[] {
  const merged: RouteStop[] = []
  for (const list of lists) {
    if (!merged.length) {
      merged.push(...list)
      continue
    }
    const lastKey = stopKey(merged[merged.length - 1]!)
    const startIdx = list.length > 0 && stopKey(list[0]!) === lastKey ? 1 : 0
    merged.push(...list.slice(startIdx))
  }
  return merged
}

function append246XLoopReturn(route: BusRoute, list: RouteStop[]): RouteStop[] {
  if (route.id !== '246X' || !list.length) return list
  const result = [...list]
  for (const stop of ROUTE_246X_LOOP_RETURN) {
    const last = result[result.length - 1]
    if (last && stopKey(last) === stopKey(stop)) continue
    result.push(stop)
  }
  return result
}

/** 环线且分站序按走向拆分（如 246X 西行／东行） */
export function routeHasLoopDirectionLayout(route: BusRoute): boolean {
  return route.pattern === 'circular' && routeHasDirectionVariants(route)
}

export function mergeLoopDirectionStops(route: BusRoute): StopGroup | null {
  const groups = route.stops
  if (!groups?.length || groups.length < 2) return null

  const lists = getSortedDirectionDataIndices(route).map((index) => groups[index]?.list ?? [])
  let list = mergeStopLists(lists.filter((entry) => entry.length > 0))
  list = append246XLoopReturn(route, list)
  if (!list.length) return null

  const primary = groups[getDirectionDataIndex(route, 0)] ?? groups[0]!
  const loopDirection =
    route.id === '246X'
      ? {
          zh: '环线（东锦葵海傍路 ↺ 时间廊）',
          en: 'Loop (Eastmallow Praya Road ↺ Timelapse Mall)',
        }
      : { zh: '环线', en: 'Loop' }
  return {
    direction: loopDirection,
    directionKey: 'loop',
    serviceTime: primary.serviceTime,
    length: route.length,
    list,
  }
}

export function resolveActiveStopGroup(
  route: BusRoute,
  directionIndex: number,
  loopView: boolean,
): StopGroup | undefined {
  if (loopView && routeHasLoopDirectionLayout(route)) {
    return mergeLoopDirectionStops(route) ?? undefined
  }
  return route.stops?.[getDirectionDataIndex(route, directionIndex)]
}

export function formatLoopViewEndpoints(route: BusRoute, locale: Locale): string | null {
  const group = mergeLoopDirectionStops(route)
  if (!group) return null
  return formatStopsEndpoints(route, group, locale)
}

export function getLoopViewLengthKm(route: BusRoute, locale: Locale): string | null {
  const text = getOptionalText(route.length, locale)
  if (!text) return null
  const segments = splitLengthSegments(text)
  if (segments.length > 1) {
    for (const segment of segments) {
      if (/环线|loop/i.test(segment)) {
        const km = extractKmDisplay(segment)
        if (km) return km
      }
    }
  }
  return extractKmDisplay(text) ?? text
}
