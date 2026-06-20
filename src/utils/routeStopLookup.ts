import type { BusRoute } from '../types/route'
import { resolvePlaceZh } from './placeNames'
import { canonicalStopKey } from './stopIdentity'
import {
  findRoutesForCanonicalStop,
  getCanonicalStopIndex,
  resolveCanonicalStop,
  type MatchedStop,
} from './stopCanonicalIndex'

export type { MatchedStop }

function scoreStopMatch(query: string, stop: MatchedStop, canonical: string): number {
  const raw = query.trim()
  const q = raw.toLowerCase()
  const normalizedZh = resolvePlaceZh(raw, raw).toLowerCase()

  if (stop.zh === raw || stop.en.toLowerCase() === q) return 100
  if (canonical === normalizedZh) return 95
  if (stop.zh.startsWith(raw) || stop.en.toLowerCase().startsWith(q)) return 80
  if (stop.zh.toLowerCase().includes(q) || stop.en.toLowerCase().includes(q)) return 70
  if (
    normalizedZh.length >= 2 &&
    (canonical === normalizedZh ||
      canonical.includes(normalizedZh) ||
      normalizedZh.includes(canonical))
  ) {
    return 60
  }
  return -1
}

export function findStopsMatchingQuery(query: string): MatchedStop[] {
  const raw = query.trim()
  if (raw.length < 2) return []

  const bestByCanonical = new Map<string, { stop: MatchedStop; score: number }>()

  for (const entry of getCanonicalStopIndex().values()) {
    for (const variant of entry.variants) {
      const score = scoreStopMatch(raw, variant, entry.key)
      if (score < 0) continue

      const existing = bestByCanonical.get(entry.key)
      if (!existing || score > existing.score) {
        bestByCanonical.set(entry.key, { stop: entry.representative, score })
        continue
      }
      if (score === existing.score) {
        bestByCanonical.set(entry.key, { stop: entry.representative, score })
      }
    }
  }

  return [...bestByCanonical.values()]
    .sort((a, b) => b.score - a.score || a.stop.zh.localeCompare(b.stop.zh, 'zh-Hans'))
    .map((item) => item.stop)
}

export function findRoutesPassingStop(stop: MatchedStop, displayRoutes: BusRoute[]): BusRoute[] {
  return findRoutesForCanonicalStop(stop, displayRoutes)
}

export function routePassesStopQuery(route: BusRoute, query: string): boolean {
  const matches = findStopsMatchingQuery(query)
  if (matches.length === 0) return false

  const keys = new Set(matches.map((stop) => canonicalStopKey(stop.zh, stop.en)))
  return (
    route.stops?.some((direction) =>
      direction.list.some((stop) => keys.has(canonicalStopKey(stop.name.zh, stop.name.en))),
    ) ?? false
  )
}

export { resolveCanonicalStop }
