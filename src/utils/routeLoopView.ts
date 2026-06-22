import type { Locale } from '../i18n/types'
import { getOptionalText } from '../i18n/displayText'
import type { BusRoute, RouteStop } from '../types/route'
import { extractKmDisplay, formatStopsEndpoints } from './routeDisplay'
import {
  getDirectionDataIndex,
  getSortedDirectionDataIndices,
  routeHasDirectionVariants,
} from './routeDirectionCore'

type StopGroup = NonNullable<BusRoute['stops']>[number]

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

/** 环线且分站序按走向拆分（如 246X 西行／东行） */
export function routeHasLoopDirectionLayout(route: BusRoute): boolean {
  return route.pattern === 'circular' && routeHasDirectionVariants(route)
}

export function mergeLoopDirectionStops(route: BusRoute): StopGroup | null {
  const groups = route.stops
  if (!groups?.length || groups.length < 2) return null

  const lists = getSortedDirectionDataIndices(route).map((index) => groups[index]?.list ?? [])
  const list = mergeStopLists(lists.filter((entry) => entry.length > 0))
  if (!list.length) return null

  const primary = groups[getDirectionDataIndex(route, 0)] ?? groups[0]!
  return {
    direction: { zh: '环线', en: 'Loop' },
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
  return extractKmDisplay(text) ?? text
}
