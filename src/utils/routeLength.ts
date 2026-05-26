import { getOptionalText, getPrimaryText } from '../i18n/displayText'
import type { Locale } from '../i18n/types'
import type { BusRoute } from '../types/route'
import { extractKmDisplay } from './routeDisplay'
import {
  getRouteDirectionCount,
  routeHasDirectionVariants,
} from './routeDirections'

function normalizePlaceToken(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(
      /(ferry pier|bus terminus|shopping center|shopping centre|estate complex|waterfront|promenade|interchange|roundabout|hospital|station|road|street|lane|pier|plaza|square|centre|center|码头|广场|中心|邨|海傍|大街)/gi,
      '',
    )
    .replace(/\s+/g, '')
    .trim()
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
  const destZh = last.name.zh
  const destEn = last.name.en
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
      const km = extractKmDisplay(getPrimaryText(group.length, locale))
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

  const segments = routeLength.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean)

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

    if (bestIdx >= 0 && bestScore >= 40) {
      const km = extractKmDisplay(segments[bestIdx])
      if (km) {
        map.set(di, km)
        assignedSegments.add(bestIdx)
      }
    }
  }

  return map
}

/** 启动时把路线级双向 length 写入各方向 stops[].length */
export function enrichRouteDirectionLengths(route: BusRoute): BusRoute {
  if (!route.stops?.length || !route.length) return route

  const zhMap = buildDirectionLengthKmMap(route, 'zh-Hans')
  const enMap = buildDirectionLengthKmMap(route, 'en')
  if (zhMap.size === 0 && enMap.size === 0) return route

  let changed = false
  const stops = route.stops.map((group, di) => {
    if (group.length) return group
    const zh = zhMap.get(di)
    const en = enMap.get(di)
    if (!zh && !en) return group
    changed = true
    return {
      ...group,
      length: { zh: zh ?? en ?? '', en: en ?? zh ?? '' },
    }
  })

  return changed ? { ...route, stops } : route
}
