import { convertToSimplified } from '../i18n/convert'
import { getOptionalText, getPrimaryText } from '../i18n/displayText'
import type { Locale } from '../i18n/types'
import type { BusRoute } from '../types/route'
import { resolvePlaceName, resolvePlaceZh } from './placeNames'
import { extractKmDisplay } from './routeDisplay'
import {
  getRouteDirectionCount,
  getSortedDirectionDataIndices,
  routeHasDirectionVariants,
} from './routeDirections'

function normalizePlaceToken(text: string): string {
  const raw = convertToSimplified(text)
  return raw
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(
      /(ferry pier|bus terminus|shopping center|shopping centre|estate complex|waterfront|promenade|interchange|roundabout|hospital|station|road|street|lane|pier|plaza|square|centre|center|码头|广场|中心|邨|海傍|大街|车厂)/gi,
      '',
    )
    .replace(/\s+/g, '')
    .trim()
}

function canonicalPlaceToken(text: string, alt?: string): string {
  const zh = resolvePlaceZh(text, alt ?? '')
  return normalizePlaceToken(zh || text)
}

function extractLengthHints(segment: string): { zh?: string; en?: string } {
  const zhTo = segment.match(/往([^0-9·/]+?)(?=\s*[\d.]|\/|$)/)
  const enTo = segment.match(/To\s+([^0-9·/]+?)(?=\s*[\d.]|\/|$)/i)
  return {
    zh: zhTo?.[1]?.trim(),
    en: enTo?.[1]?.trim(),
  }
}

function namesFromDirectionLabel(direction: { zh: string; en: string }): string[] {
  const names: string[] = []
  for (const text of [direction.zh, direction.en]) {
    const arrow = text.match(/[→→]\s*([^）)]+)/)
    if (arrow?.[1]) names.push(arrow[1].trim())
    const paren = text.match(/\([^→→]+→\s*([^）)]+)/)
    if (paren?.[1]) names.push(paren[1].trim())
  }
  return names
}

function tokenMatchScore(a: string, b: string): number {
  const ta = normalizePlaceToken(a)
  const tb = normalizePlaceToken(b)
  if (!ta || !tb) return 0
  if (ta === tb) return 100
  if (ta.includes(tb) || tb.includes(ta)) return 80
  if (ta.slice(0, 3) === tb.slice(0, 3) && ta.length >= 3) return 40
  return 0
}

function scoreSegmentForDirection(
  segment: string,
  route: BusRoute,
  dataIndex: number,
  locale: Locale,
): number {
  const group = route.stops?.[dataIndex]
  if (!group?.list.length) return 0

  const last = group.list[group.list.length - 1]
  const first = group.list[0]
  const destResolved = resolvePlaceName(last.name.zh, last.name.en)
  const destZh = destResolved.zh
  const destEn = destResolved.en
  const destPrimary = getPrimaryText(last.name, locale)
  const originPrimary = getPrimaryText(first.name, locale)
  const seg = segment.trim()
  const segLower = seg.toLowerCase()
  let score = 0

  if (seg.includes(destZh) || destZh.includes(seg)) score = Math.max(score, 90)
  if (segLower.includes(destEn.toLowerCase()) || destEn.toLowerCase().includes(segLower)) {
    score = Math.max(score, 90)
  }
  score = Math.max(score, tokenMatchScore(seg, destPrimary))
  score = Math.max(score, tokenMatchScore(seg, destZh))
  score = Math.max(score, tokenMatchScore(seg, destEn))
  score = Math.max(
    score,
    tokenMatchScore(canonicalPlaceToken(seg), canonicalPlaceToken(destZh, destEn)),
  )

  const hints = extractLengthHints(segment)
  if (hints.zh) {
    score = Math.max(score, tokenMatchScore(hints.zh, destZh))
    score = Math.max(score, tokenMatchScore(hints.zh, destPrimary))
  }
  if (hints.en) {
    score = Math.max(score, tokenMatchScore(hints.en, destEn))
    score = Math.max(score, tokenMatchScore(hints.en, destPrimary))
  }

  for (const labelDest of namesFromDirectionLabel(group.direction)) {
    score = Math.max(score, tokenMatchScore(segment, labelDest))
    if (hints.zh) score = Math.max(score, tokenMatchScore(hints.zh, labelDest))
    if (hints.en) score = Math.max(score, tokenMatchScore(hints.en, labelDest))
  }

  // 较低权重：与起点匹配（避免误配）
  score = Math.max(score, tokenMatchScore(segment, originPrimary) * 0.5)

  return score
}

const MIN_SEGMENT_MATCH_SCORE = 28

/** 拆分路线级里程文案（支持 / 与 ·，并过滤含 km 的片段） */
export function splitLengthSegments(text: string): string[] {
  const parts = text
    .split(/\s*\/\s*|\s*·\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
  const withKm = parts.filter((p) => /km/i.test(p))
  return withKm.length ? withKm : parts
}

function pickKmBySortedPosition(
  route: BusRoute,
  dataIndex: number,
  segments: string[],
): string | null {
  const sorted = getSortedDirectionDataIndices(route)
  const pos = sorted.indexOf(dataIndex)
  if (pos < 0 || pos >= segments.length) return null
  return extractKmDisplay(segments[pos])
}

/** 从一段里程文案中为指定方向选取公里数 */
export function pickKmForDirection(
  lengthText: string,
  route: BusRoute,
  dataIndex: number,
  locale: Locale,
): string | null {
  const segments = splitLengthSegments(lengthText)
  if (!segments.length) return null
  if (segments.length === 1) return extractKmDisplay(segments[0])

  let bestIdx = -1
  let bestScore = 0
  segments.forEach((segment, idx) => {
    const score = scoreSegmentForDirection(segment, route, dataIndex, locale)
    if (score > bestScore) {
      bestScore = score
      bestIdx = idx
    }
  })

  if (bestIdx >= 0 && bestScore >= MIN_SEGMENT_MATCH_SCORE) {
    return extractKmDisplay(segments[bestIdx])
  }

  const dirCount = getRouteDirectionCount(route)
  if (segments.length === dirCount) {
    return pickKmBySortedPosition(route, dataIndex, segments)
  }

  return pickKmBySortedPosition(route, dataIndex, segments) ?? extractKmDisplay(segments[0])
}

function assignSegmentsToDirections(
  map: Map<number, string>,
  route: BusRoute,
  segments: string[],
  locale: Locale,
  assignedSegments: Set<number>,
  minScore: number,
): void {
  const dirCount = getRouteDirectionCount(route)
  for (let di = 0; di < dirCount; di++) {
    if (map.has(di)) continue

    let bestIdx = -1
    let bestScore = 0
    segments.forEach((segment, idx) => {
      if (assignedSegments.has(idx)) return
      const score = scoreSegmentForDirection(segment, route, di, locale)
      if (score > bestScore) {
        bestScore = score
        bestIdx = idx
      }
    })

    if (bestIdx >= 0 && bestScore >= minScore) {
      const km = extractKmDisplay(segments[bestIdx])
      if (km) {
        map.set(di, km)
        assignedSegments.add(bestIdx)
      }
    }
  }
}

/** 按 dataIndex 解析各方向公里数 */
export function buildDirectionLengthKmMap(
  route: BusRoute,
  locale: Locale,
): Map<number, string> {
  const map = new Map<number, string>()
  const dirCount = getRouteDirectionCount(route)
  if (dirCount === 0) return map

  for (let di = 0; di < dirCount; di++) {
    const group = route.stops?.[di]
    if (group?.length) {
      const km = pickKmForDirection(getPrimaryText(group.length, locale), route, di, locale)
      if (km) map.set(di, km)
    }
  }

  const routeLength = getOptionalText(route.length, locale)
  if (!routeLength) return map

  if (!routeHasDirectionVariants(route)) {
    const km = extractKmDisplay(routeLength)
    if (km && !map.has(0)) map.set(0, km)
    return map
  }

  const segments = splitLengthSegments(routeLength)

  if (segments.length <= 1) {
    const km = extractKmDisplay(routeLength)
    if (km) {
      for (let di = 0; di < dirCount; di++) {
        if (!map.has(di)) map.set(di, km)
      }
    }
    return map
  }

  const assignedSegments = new Set<number>()
  assignSegmentsToDirections(map, route, segments, locale, assignedSegments, MIN_SEGMENT_MATCH_SCORE)
  assignSegmentsToDirections(map, route, segments, locale, assignedSegments, 12)

  if (map.size < dirCount && segments.length === dirCount) {
    const sorted = getSortedDirectionDataIndices(route)
    sorted.forEach((dataIndex, sortedIdx) => {
      if (map.has(dataIndex)) return
      const km = extractKmDisplay(segments[sortedIdx])
      if (km) map.set(dataIndex, km)
    })
  }

  return map
}

/** 卡片 / 详情：指定站序方向的公里数 */
export function resolveLengthKmForDataIndex(
  route: BusRoute,
  dataIndex: number,
  locale: Locale,
): string | null {
  const routeLength = getOptionalText(route.length, locale)
  if (routeLength && routeHasDirectionVariants(route)) {
    const segments = splitLengthSegments(routeLength)
    if (segments.length > 1) {
      const km = pickKmForDirection(routeLength, route, dataIndex, locale)
      if (km) return km
    }
  }

  const map = buildDirectionLengthKmMap(route, locale)
  if (map.has(dataIndex)) return map.get(dataIndex)!

  const group = route.stops?.[dataIndex]
  if (group?.length) {
    const km = pickKmForDirection(getPrimaryText(group.length, locale), route, dataIndex, locale)
    if (km) return km
  }

  if (!routeLength) return null

  if (routeHasDirectionVariants(route)) {
    return pickKmForDirection(routeLength, route, dataIndex, locale)
  }

  return extractKmDisplay(routeLength)
}

/** 无 Wiki 里程时，按站数粗估（约 0.72 km/站间） */
function buildEstimatedRouteLength(route: BusRoute): BusRoute['length'] {
  if (!route.stops?.length) return undefined
  const partsZh: string[] = []
  const partsEn: string[] = []
  for (const group of route.stops) {
    if (group.list.length < 4) continue
    const km = Math.round((group.list.length - 1) * 0.72 * 10) / 10
    const dest = resolvePlaceName(
      group.list[group.list.length - 1].name.zh,
      group.list[group.list.length - 1].name.en,
    )
    partsZh.push(`往${dest.zh} ${km} km`)
    partsEn.push(`To ${dest.en} ${km} km`)
  }
  if (!partsZh.length) return undefined
  return { zh: partsZh.join(' / '), en: partsEn.join(' / ') }
}

/** 启动时把路线级双向 length 写入各方向 stops[].length */
export function enrichRouteDirectionLengths(route: BusRoute): BusRoute {
  let base = route
  if (!route.length && route.stops?.length) {
    const estimated = buildEstimatedRouteLength(route)
    if (estimated) base = { ...route, length: estimated }
  }

  if (!base.stops?.length || !base.length) return base

  const zhMap = buildDirectionLengthKmMap(base, 'zh-Hans')
  const enMap = buildDirectionLengthKmMap(base, 'en')
  if (zhMap.size === 0 && enMap.size === 0) return base

  let changed = false
  const stops = base.stops.map((group, di) => {
    const zh = zhMap.get(di)
    const en = enMap.get(di)
    if (!zh && !en) return group
    const nextLength = { zh: zh ?? en ?? '', en: en ?? zh ?? '' }
    if (group.length?.zh === nextLength.zh && group.length?.en === nextLength.en) return group
    changed = true
    return { ...group, length: nextLength }
  })

  return changed ? { ...base, stops } : base
}
