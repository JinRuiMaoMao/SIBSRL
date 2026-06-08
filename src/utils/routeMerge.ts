import type { BusRoute } from '../types/route'
import { compareRouteNumber } from './routeSort'

export type DirectionKey = 'N' | 'S' | 'E' | 'W'

export const EXCLUDED_ROUTE_NUMBERS = new Set([
  '476EX', '476M', '476XE', '47A', '48A', '41AN', '41AS', '42AN', '42AS',
  '49AN', '49AS', '74AN', '74AS', '673A', '141PE', '141PW', '370BW', '370BE',
  '475AW', '475PW', 'C401AW', 'C401AE', '75PS',
])

/** ?????? N/S/E/W ???????????? 73S?376S? */
const STANDALONE_ROUTE_NUMBERS = new Set([
  '21A', '73A', '73S', '76S', '25Y', '140P', '141P', '475P', '376S',
  '476SA', 'F469A', 'N76A', '246XA', 'S1A', 'S2A', '77X', '77XA', 'U47*',
])

type MergeTarget = { base: string; directionKey?: DirectionKey }

const EXACT_MERGE: Record<string, MergeTarget> = {
  '47A': { base: '47', directionKey: 'N' },
  '48A': { base: '47', directionKey: 'S' },
  '673A': { base: '73A' },
  '146W': { base: '246X', directionKey: 'W' },
  '246PE': { base: '246X', directionKey: 'E' },
  '476W2': { base: '476*' },
  '476W3': { base: '476#' },
  '76S2': { base: '76#' },
  'U47N2': { base: 'U47*', directionKey: 'N' },
  'U47S2': { base: 'U47*', directionKey: 'S' },
  '140PW': { base: '140P', directionKey: 'W' },
  '140PE': { base: '140P', directionKey: 'E' },
  'N171WM': { base: 'N271', directionKey: 'W' },
  'N171EM': { base: 'N271', directionKey: 'E' },
  '73SN': { base: '73S', directionKey: 'N' },
  '73SS': { base: '73S', directionKey: 'S' },
  '76SN': { base: '76S', directionKey: 'N' },
  '76SS': { base: '76S', directionKey: 'S' },
  '376SE': { base: '376S', directionKey: 'E' },
  '376SW': { base: '376S', directionKey: 'W' },
}

function directionTextByKey(key: DirectionKey): { zh: string; en: string } {
  if (key === 'N') return { zh: '\u5317\u884c', en: 'Northbound' }
  if (key === 'S') return { zh: '\u5357\u884c', en: 'Southbound' }
  if (key === 'E') return { zh: '\u4e1c\u884c', en: 'Eastbound' }
  return { zh: '\u897f\u884c', en: 'Westbound' }
}

function placeholderStopsByDirection(key: DirectionKey) {
  if (key === 'N') {
    return [
      { name: { zh: '\u5357\u7aef\u603b\u7ad9\uff08\u5f85\u8865\u5145\uff09', en: 'South Terminus (pending)' } },
      { name: { zh: '\u4e2d\u9014\u7ad9\uff08\u5f85\u8865\u5145\uff09', en: 'Intermediate Stop (pending)' } },
      { name: { zh: '\u5317\u7aef\u603b\u7ad9\uff08\u5f85\u8865\u5145\uff09', en: 'North Terminus (pending)' } },
    ]
  }
  if (key === 'S') {
    return [
      { name: { zh: '\u5317\u7aef\u603b\u7ad9\uff08\u5f85\u8865\u5145\uff09', en: 'North Terminus (pending)' } },
      { name: { zh: '\u4e2d\u9014\u7ad9\uff08\u5f85\u8865\u5145\uff09', en: 'Intermediate Stop (pending)' } },
      { name: { zh: '\u5357\u7aef\u603b\u7ad9\uff08\u5f85\u8865\u5145\uff09', en: 'South Terminus (pending)' } },
    ]
  }
  if (key === 'E') {
    return [
      { name: { zh: '\u897f\u7aef\u603b\u7ad9\uff08\u5f85\u8865\u5145\uff09', en: 'West Terminus (pending)' } },
      { name: { zh: '\u4e2d\u9014\u7ad9\uff08\u5f85\u8865\u5145\uff09', en: 'Intermediate Stop (pending)' } },
      { name: { zh: '\u4e1c\u7aef\u603b\u7ad9\uff08\u5f85\u8865\u5145\uff09', en: 'East Terminus (pending)' } },
    ]
  }
  return [
    { name: { zh: '\u4e1c\u7aef\u603b\u7ad9\uff08\u5f85\u8865\u5145\uff09', en: 'East Terminus (pending)' } },
    { name: { zh: '\u4e2d\u9014\u7ad9\uff08\u5f85\u8865\u5145\uff09', en: 'Intermediate Stop (pending)' } },
    { name: { zh: '\u897f\u7aef\u603b\u7ad9\uff08\u5f85\u8865\u5145\uff09', en: 'West Terminus (pending)' } },
  ]
}

function inferDirectionSuffix(routeNumber: string): DirectionKey | null {
  const exact = EXACT_MERGE[routeNumber]
  if (exact?.directionKey) return exact.directionKey
  const m = routeNumber.match(/(?<=[0-9Y])([NSEW])$/i)
  return m ? (m[1]!.toUpperCase() as DirectionKey) : null
}

export function toMergeBaseRouteNumber(routeNumber: string): string {
  const exact = EXACT_MERGE[routeNumber]
  if (exact) return exact.base
  if (STANDALONE_ROUTE_NUMBERS.has(routeNumber)) return routeNumber
  if (/(?<=[0-9Y])[NSEW]$/i.test(routeNumber)) return routeNumber.slice(0, -1)
  return routeNumber
}

export function getMergeDirectionKey(routeNumber: string): DirectionKey | null {
  return inferDirectionSuffix(routeNumber)
}

function sortSuffixPriority(routeNumber: string): number {
  const suffix = getMergeDirectionKey(routeNumber)
  if (suffix === 'N') return 0
  if (suffix === 'W') return 1
  if (suffix === 'E') return 2
  if (suffix === 'S') return 3
  return 9
}

export function mergeRoutesByBaseNumber(all: BusRoute[]): BusRoute[] {
  const groups = new Map<string, BusRoute[]>()
  for (const route of all) {
    if (EXCLUDED_ROUTE_NUMBERS.has(route.number)) continue
    const base = toMergeBaseRouteNumber(route.number)
    const list = groups.get(base)
    if (list) list.push(route)
    else groups.set(base, [route])
  }

  const merged: BusRoute[] = []
  for (const [baseNumber, list] of groups) {
    if (list.length === 1) {
      const only = list[0]!
      merged.push(only.id === only.number ? only : { ...only, id: baseNumber, number: baseNumber })
      continue
    }

    const sorted = [...list].sort((a, b) => {
      const pa = sortSuffixPriority(a.number)
      const pb = sortSuffixPriority(b.number)
      if (pa !== pb) return pa - pb
      return compareRouteNumber(a.number, b.number)
    })
    const primary = sorted[0]!

    const mergedStops = sorted.flatMap((route) => {
      const dir = getMergeDirectionKey(route.number)
      if (!route.stops?.length) return []
      return route.stops.map((group) => ({ ...group, directionKey: group.directionKey ?? dir ?? undefined }))
    })

    const synthesizedStops =
      mergedStops.length > 0
        ? []
        : sorted
            .map((route) => getMergeDirectionKey(route.number))
            .filter((s): s is DirectionKey => Boolean(s))
            .filter((s, i, arr) => arr.indexOf(s) === i)
            .map((key) => ({
              direction: directionTextByKey(key),
              directionKey: key,
              list: placeholderStopsByDirection(key),
            }))

    const finalStops = mergedStops.length > 0 ? mergedStops : synthesizedStops.length > 1 ? synthesizedStops : primary.stops

    const firstGroup = finalStops?.[0]
    const firstStop = firstGroup?.list?.[0]?.name
    const lastStop = firstGroup?.list?.[firstGroup.list.length - 1]?.name
    const viaStop = firstGroup?.list?.[1]?.name

    merged.push({
      ...primary,
      id: baseNumber,
      number: baseNumber,
      operators: [...new Set(sorted.flatMap((r) => r.operators))],
      zones: [...new Set(sorted.flatMap((r) => r.zones))].sort((a, b) => a - b),
      serviceTypes: [...new Set(sorted.flatMap((r) => r.serviceTypes ?? []))],
      origin: firstStop ?? primary.origin,
      destination: lastStop ?? primary.destination,
      via: viaStop ?? primary.via ?? { zh: '\u7ecf\u505c\u7ad9\uff08\u5f85\u8865\u5145\uff09', en: 'Via stops (pending)' },
      stops: finalStops,
      pattern: (mergedStops.length > 1 || synthesizedStops.length > 1) && primary.pattern !== 'circular' ? 'bidirectional' : primary.pattern,
    })
  }

  return merged.sort((a, b) => compareRouteNumber(a.number, b.number))
}
