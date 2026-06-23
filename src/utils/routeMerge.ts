import type { BusRoute } from '../types/route'
import { compareRouteNumber } from './routeSort'

export type DirectionKey = 'N' | 'S' | 'E' | 'W'

export const EXCLUDED_ROUTE_NUMBERS = new Set([
  '476EX', '476M', '476XE', '47A', '48A', '41AN', '41AS', '42AN', '42AS',
  '49AN', '49AS', '74AN', '74AS', '673A', '141PE', '141PW', '370AW', '370AE',
  '370BW', '370BE', '475AW', '475PW', 'C401AW', 'C401AE', '75PS',
])

/** ?????? N/S/E/W ???????????? 73S?376S? */
const STANDALONE_ROUTE_NUMBERS = new Set([
  '73A', '73S', '76S', '25Y', '140P', '141P', '475P', '376S', '242A', '248A',
  '476SA', 'F469A', 'N76A', '246XA', 'S1A', 'S2A', '77XA', 'U47*', '473A', '370AEM', 'N146A', 'Y370A',
  '21A', '240A',
])

/** 仅简化展示编号与搜索别名，不参与多线路合并分组 */
export const DISPLAY_ONLY_RENAMES: Record<string, string> = {
  '21A': '21',
  '240A': '240',
  '242A': '242',
  '248A': '248',
  '473A': '473',
  '476SA': '476S',
  'F469A': 'F469',
  'N146A': 'N146',
  'N76A': 'N76',
  'S1A': 'S1',
  'S2A': 'S2',
  'Y370A': 'Y370',
  '370AEM': '270A',
  '77XA': '77X',
}

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
  '74AN': { base: '74A', directionKey: 'N' },
  '74AS': { base: '74A', directionKey: 'S' },
  '49AN': { base: '49A', directionKey: 'N' },
  '49AS': { base: '49A', directionKey: 'S' },
  '41AN': { base: '41A', directionKey: 'N' },
  '41AS': { base: '41A', directionKey: 'S' },
  '42AN': { base: '42', directionKey: 'N' },
  '42AS': { base: '42', directionKey: 'S' },
  '471S': { base: '471', directionKey: 'S' },
  '75PS': { base: '75P' },
  '141PE': { base: '141P', directionKey: 'E' },
  '141PW': { base: '141P', directionKey: 'W' },
  '246XA': { base: '246X' },
  '370AW': { base: '370A', directionKey: 'W' },
  '370AE': { base: '370A', directionKey: 'E' },
  '370BW': { base: '370B', directionKey: 'W' },
  '370BE': { base: '370B', directionKey: 'E' },
  '475AW': { base: '475P', directionKey: 'W' },
  '475PW': { base: '475P', directionKey: 'W' },
  '476E2': { base: '476*', directionKey: 'E' },
  '476PW': { base: '476P', directionKey: 'W' },
  '476W4': { base: '476*' },
  '476XE': { base: '476X', directionKey: 'E' },
  'C401AW': { base: 'C401A', directionKey: 'W' },
  'C401AE': { base: 'C401A', directionKey: 'E' },
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

const STUB_NOTES_RE = /站点与服务资料待补充|Stops and service details pending/i

/** 合并时优先选用资料完整的主线，避免占位线路覆盖已录入数据 */
function routeMergeDataScore(route: BusRoute): number {
  let score = 0
  const stopCount = route.stops?.flatMap((g) => g.list).length ?? 0
  if (stopCount > 0) score += 1000 + stopCount
  if (route.origin.zh !== '待补充' && route.origin.en !== 'To be added') score += 200
  if (route.fare) score += 100
  if (route.journeyTime) score += 80
  if (route.interval) score += 60
  if (route.length) score += 40
  const notes = `${route.notes?.zh ?? ''} ${route.notes?.en ?? ''}`
  if (STUB_NOTES_RE.test(notes)) score -= 500
  return score
}

function displayRenameConflicts(route: BusRoute, peers: BusRoute[]): boolean {
  const displayNumber = DISPLAY_ONLY_RENAMES[route.id] ?? DISPLAY_ONLY_RENAMES[route.number]
  if (!displayNumber) return false
  return peers.some(
    (other) =>
      other.id !== route.id &&
      !DISPLAY_ONLY_RENAMES[other.id] &&
      (other.id === displayNumber || other.number === displayNumber),
  )
}

function applyDisplayRenames(routes: BusRoute[]): BusRoute[] {
  return routes.map((route) => {
    const displayNumber =
      DISPLAY_ONLY_RENAMES[route.id] ?? DISPLAY_ONLY_RENAMES[route.number]
    if (!displayNumber) return route
    if (displayRenameConflicts(route, routes)) {
      return { ...route, number: displayNumber }
    }
    return { ...route, id: displayNumber, number: displayNumber }
  })
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
      merged.push(
        only.id === baseNumber && only.number === baseNumber
          ? only
          : { ...only, id: baseNumber, number: baseNumber },
      )
      continue
    }

    const sorted = [...list].sort((a, b) => {
      const scoreDiff = routeMergeDataScore(b) - routeMergeDataScore(a)
      if (scoreDiff !== 0) return scoreDiff
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

  return applyDisplayRenames(merged).sort((a, b) =>
    compareRouteNumber(a.number, b.number),
  )
}

/** 合并后线路的其它编号（用于搜索） */
export function getRouteNumberAliases(routeNumber: string): string[] {
  const fromDisplay = Object.entries(DISPLAY_ONLY_RENAMES)
    .filter(([, display]) => display === routeNumber)
    .map(([alias]) => alias)
  const fromMerge = Object.entries(EXACT_MERGE)
    .filter(([, target]) => target.base === routeNumber && !target.directionKey)
    .map(([alias]) => alias)
  return [...new Set([...fromDisplay, ...fromMerge])]
}

/** 在展示线路列表中按编号或别名查找 */
export function findDisplayRouteByQuery(
  displayRoutes: BusRoute[],
  queryId: string,
): BusRoute | undefined {
  const q = queryId.trim()
  if (!q) return undefined

  const byId = displayRoutes.find((route) => route.id === q)
  if (byId) return byId

  if (DISPLAY_ONLY_RENAMES[q]) {
    const byAlias = displayRoutes.find((route) => route.id === q)
    if (byAlias) return byAlias
    const display = DISPLAY_ONLY_RENAMES[q]
    const byDisplay = displayRoutes.filter((route) => route.number === display)
    if (byDisplay.length === 1) return byDisplay[0]
  }

  const byNumber = displayRoutes.filter((route) => route.number === q)
  if (byNumber.length === 1) return byNumber[0]

  return undefined
}
