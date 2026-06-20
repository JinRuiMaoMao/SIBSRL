import type { BusRoute } from '../types/route'
import { compareRouteNumber } from './routeSort'
import { findStopsMatchingQuery, type MatchedStop } from './routeStopLookup'

export interface DirectRouteBetweenStops {
  route: BusRoute
  directionIndex: number
}

function stopKey(zh: string, en: string): string {
  return `${zh.trim().toLowerCase()}|${en.trim().toLowerCase()}`
}

/** 将搜索片段解析为唯一站点（精确 > 唯一 > 前缀 > 首个） */
export function resolveStopByQuery(query: string): MatchedStop | null {
  const q = query.trim()
  if (q.length < 1) return null

  const matches = findStopsMatchingQuery(q)
  if (matches.length === 0) return null

  const lower = q.toLowerCase()
  const exact = matches.find(
    (stop) => stop.zh === q || stop.en.toLowerCase() === lower,
  )
  if (exact) return exact

  if (matches.length === 1) return matches[0]!

  const prefix = matches.find(
    (stop) => stop.zh.startsWith(q) || stop.en.toLowerCase().startsWith(lower),
  )
  return prefix ?? matches[0]!
}

/** 同一条线同一方向内，起点站在终点站之前（直达，不含换乘） */
export function findDirectRoutesBetweenStops(
  from: MatchedStop,
  to: MatchedStop,
  displayRoutes: BusRoute[],
): DirectRouteBetweenStops[] {
  const fromKey = stopKey(from.zh, from.en)
  const toKey = stopKey(to.zh, to.en)
  if (fromKey === toKey) return []

  const results: DirectRouteBetweenStops[] = []

  for (const route of displayRoutes) {
    for (let directionIndex = 0; directionIndex < (route.stops?.length ?? 0); directionIndex++) {
      const list = route.stops?.[directionIndex]?.list
      if (!list?.length) continue

      let fromIndex = -1
      let toIndex = -1
      for (let i = 0; i < list.length; i++) {
        const stop = list[i]!
        const key = stopKey(stop.name.zh, stop.name.en)
        if (key === fromKey) fromIndex = i
        if (key === toKey) toIndex = i
      }

      if (fromIndex >= 0 && toIndex > fromIndex) {
        results.push({ route, directionIndex })
        break
      }
    }
  }

  return results.sort((a, b) => compareRouteNumber(a.route.number, b.route.number))
}
