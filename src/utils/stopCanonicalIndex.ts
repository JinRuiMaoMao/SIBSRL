import type { BilingualText, BusRoute } from '../types/route'
import { routes } from '../data/routes'
import { mergeRoutesByBaseNumber } from './routeMerge'
import { canonicalStopKey } from './stopIdentity'

export interface MatchedStop {
  zh: string
  en: string
  nameSub?: BilingualText
  turningPoint?: boolean
}

export interface CanonicalStopEntry {
  key: string
  representative: MatchedStop
  routeIds: Set<string>
  variants: MatchedStop[]
}

let canonicalIndex: Map<string, CanonicalStopEntry> | null = null

function literalKey(stop: MatchedStop): string {
  return `${stop.zh}|${stop.en}`
}

function pickRepresentative(
  variants: Map<string, { stop: MatchedStop; routeCount: number }>,
): MatchedStop {
  const ranked = [...variants.values()].sort((a, b) => {
    const aHasSub = a.stop.nameSub ? 1 : 0
    const bHasSub = b.stop.nameSub ? 1 : 0
    if (bHasSub !== aHasSub) return bHasSub - aHasSub
    if (b.routeCount !== a.routeCount) return b.routeCount - a.routeCount
    if (a.stop.zh.length !== b.stop.zh.length) return a.stop.zh.length - b.stop.zh.length
    return a.stop.zh.localeCompare(b.stop.zh, 'zh-Hans')
  })
  return ranked[0]!.stop
}

function buildCanonicalStopIndex(): Map<string, CanonicalStopEntry> {
  const map = new Map<string, CanonicalStopEntry>()
  const variantCounts = new Map<string, Map<string, { stop: MatchedStop; routeCount: number }>>()
  const displayRoutes = mergeRoutesByBaseNumber(routes)

  for (const route of displayRoutes) {
    for (const group of route.stops ?? []) {
      for (const stop of group.list) {
        const key = canonicalStopKey(stop.name.zh, stop.name.en)
        const matched: MatchedStop = {
          zh: stop.name.zh,
          en: stop.name.en,
          ...(stop.nameSub ? { nameSub: stop.nameSub } : {}),
          ...(stop.turningPoint ? { turningPoint: stop.turningPoint } : {}),
        }
        const literal = literalKey(matched)

        let entry = map.get(key)
        if (!entry) {
          entry = {
            key,
            representative: matched,
            routeIds: new Set<string>(),
            variants: [],
          }
          map.set(key, entry)
          variantCounts.set(key, new Map())
        }

        entry.routeIds.add(route.id)
        const counts = variantCounts.get(key)!
        const existing = counts.get(literal)
        if (existing) existing.routeCount++
        else counts.set(literal, { stop: matched, routeCount: 1 })
      }
    }
  }

  for (const [key, entry] of map) {
    const counts = variantCounts.get(key)!
    entry.variants = [...counts.values()].map((item) => item.stop)
    entry.representative = pickRepresentative(counts)
  }

  return map
}

export function getCanonicalStopIndex(): Map<string, CanonicalStopEntry> {
  if (!canonicalIndex) canonicalIndex = buildCanonicalStopIndex()
  return canonicalIndex
}

export function resolveCanonicalStop(stop: MatchedStop): MatchedStop {
  const key = canonicalStopKey(stop.zh, stop.en)
  return getCanonicalStopIndex().get(key)?.representative ?? stop
}

export function findCanonicalEntryForStop(stop: MatchedStop): CanonicalStopEntry | null {
  return getCanonicalStopIndex().get(canonicalStopKey(stop.zh, stop.en)) ?? null
}

export function findRoutesForCanonicalStop(
  stop: MatchedStop,
  displayRoutes: BusRoute[],
): BusRoute[] {
  const entry = findCanonicalEntryForStop(stop)
  if (!entry) return []

  const byId = new Map(displayRoutes.map((route) => [route.id, route]))
  return [...entry.routeIds]
    .map((id) => byId.get(id))
    .filter((route): route is BusRoute => route != null)
}
