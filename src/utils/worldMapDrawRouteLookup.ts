import { routes } from '../data/routes'
import type { RouteStop } from '../types/route'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapCatalogStop } from './worldMapStopCatalog'
import { fixLaneStopChinese } from '../i18n/convert'
import { resolveCatalogNameCandidates } from './mapDrawCatalogNameResolve'
import { stopsMatch } from './stopIdentity'
import { DISPLAY_ONLY_RENAMES, findDisplayRouteByQuery, mergeRoutesByBaseNumber } from './routeMerge'
import { findStopsMatchingQuery } from './routeStopLookup'

export function findBusRouteForDraw(routeQuery: string) {
  const displayRoutes = mergeRoutesByBaseNumber(routes)
  const query = routeQuery.trim()
  if (!query) return undefined

  const direct = findDisplayRouteByQuery(displayRoutes, query)
  if (direct) return direct

  const byDisplayNumber = displayRoutes.find((entry) => {
    const display = DISPLAY_ONLY_RENAMES[entry.id] ?? DISPLAY_ONLY_RENAMES[entry.number]
    return display === query
  })
  if (byDisplayNumber) return byDisplayNumber

  const knownAliases: Record<string, string> = { '21': '21A' }
  const aliasedId = knownAliases[query]
  if (aliasedId) {
    return displayRoutes.find((entry) => entry.id === aliasedId)
  }

  return undefined
}

export function getDrawRouteStops(routeQuery: string, directionIndex: number): readonly RouteStop[] {
  const route = findBusRouteForDraw(routeQuery)
  return route?.stops?.[directionIndex]?.list ?? route?.stops?.[0]?.list ?? []
}

/** Detail-page stop sequence (1-based) for a stop name on the active route direction. */
export function findDrawRouteStopSeq(
  routeQuery: string,
  directionIndex: number,
  zh: string,
  en: string,
): number | null {
  const routeStops = getDrawRouteStops(routeQuery, directionIndex)
  const queryZh = zh.trim()
  const queryEn = en.trim()
  if (!queryZh && !queryEn) return null

  for (let index = 0; index < routeStops.length; index += 1) {
    const stop = routeStops[index]!
    const stopZh = stop.name.zh.trim()
    const stopEn = (stop.name.en || stop.name.zh).trim()
    const subZh = stop.nameSub?.zh?.trim() ?? ''
    const subEn = stop.nameSub?.en?.trim() ?? ''
    if (queryZh && stopZh && queryZh === stopZh) return index + 1
    if (queryEn && stopEn && queryEn.toLowerCase() === stopEn.toLowerCase()) return index + 1
    if (queryZh && stopEn && queryZh === stopEn) return index + 1
    if (queryEn && stopZh && queryEn === stopZh) return index + 1
    if (subZh || subEn) {
      for (const candidate of resolveCatalogNameCandidates(queryZh, queryEn)) {
        if (candidate.zh === stopZh || candidate.en.toLowerCase() === stopEn.toLowerCase()) {
          return index + 1
        }
      }
      if (queryZh && subZh.includes(queryZh)) return index + 1
      if (queryEn && subEn.toLowerCase().includes(queryEn.toLowerCase())) return index + 1
    }
  }
  return null
}

export interface DrawStopSuggestion {
  zh: string
  en: string
  fromRouteDetail: boolean
  fromCatalog?: boolean
  point?: WorldMapPoint
  /** Detail-page stop sequence (1-based) when fromRouteDetail. */
  seq?: number
}

function suggestionKey(zh: string, en: string): string {
  return `${zh}|${en || zh}`
}

function scoreNameMatch(query: string, zh: string, en: string): number {
  const raw = query.trim()
  if (!raw) return -1
  const q = raw.toLowerCase()
  if (zh === raw || en.toLowerCase() === q) return 100
  if (zh.startsWith(raw) || en.toLowerCase().startsWith(q)) return 80
  if (zh.includes(raw) || en.toLowerCase().includes(q)) return 70
  return -1
}

function matchesStopQuery(query: string, zh: string, en: string): boolean {
  return scoreNameMatch(query, zh, en) >= 0
}

function findCatalogStopSuggestions(
  query: string,
  catalog: readonly WorldMapCatalogStop[] | null | undefined,
): DrawStopSuggestion[] {
  if (!catalog?.length) return []
  const raw = query.trim()
  if (!raw) return []

  const scored: Array<{ suggestion: DrawStopSuggestion; score: number }> = []
  for (const stop of catalog) {
    const zh = stop.name.zh.trim()
    const en = (stop.name.en || stop.name.zh).trim()
    let score = scoreNameMatch(raw, zh, en)
    if (score < 0) {
      const aliasHit = resolveCatalogNameCandidates(raw, raw).some(
        (candidate) =>
          candidate.zh === zh || candidate.en.toLowerCase() === en.toLowerCase(),
      )
      if (aliasHit) score = 90
    }
    if (score < 0) continue
    scored.push({
      score,
      suggestion: {
        zh,
        en,
        fromRouteDetail: false,
        fromCatalog: true,
        point: [stop.point[0], stop.point[1]],
      },
    })
  }

  return scored
    .sort((a, b) => b.score - a.score || a.suggestion.zh.localeCompare(b.suggestion.zh, 'zh-Hans'))
    .slice(0, 8)
    .map((entry) => entry.suggestion)
}

/** Prefer stop names from the route detail page when drawing a route. */
export function findDrawStopSuggestions(
  query: string,
  routeQuery: string,
  directionIndex: number,
  addedStopKeys: ReadonlySet<string>,
): DrawStopSuggestion[] {
  const routeStops = getDrawRouteStops(routeQuery, directionIndex)
  const routeSuggestions: DrawStopSuggestion[] = []

  for (let index = 0; index < routeStops.length; index += 1) {
    const stop = routeStops[index]!
    const zh = stop.name.zh.trim()
    const en = (stop.name.en || stop.name.zh).trim()
    const key = suggestionKey(zh, en)
    if (addedStopKeys.has(key)) continue
    if (!matchesStopQuery(query, zh, en)) continue
    routeSuggestions.push({ zh, en, fromRouteDetail: true, seq: index + 1 })
  }

  if (routeSuggestions.length > 0) {
    return routeSuggestions.slice(0, 8)
  }

  if (query.trim().length < 2) return []

  return findStopsMatchingQuery(query)
    .filter((stop) => !addedStopKeys.has(suggestionKey(stop.zh, stop.en)))
    .slice(0, 8)
    .map((stop) => ({ zh: stop.zh, en: stop.en, fromRouteDetail: false }))
}

/** 地图编辑器站名输入：线路站点 → 地图 catalog → 全库站点 */
export function findMapDrawStopNameSuggestions(
  query: string,
  routeQuery: string,
  directionIndex: number,
  catalog?: readonly WorldMapCatalogStop[] | null,
): DrawStopSuggestion[] {
  const raw = query.trim()
  if (!raw) return []

  const merged = new Map<string, DrawStopSuggestion>()
  const insert = (suggestion: DrawStopSuggestion, priority: number) => {
    const key = suggestionKey(suggestion.zh, suggestion.en)
    const existing = merged.get(key)
    if (!existing || priority > rankSuggestion(existing)) {
      merged.set(key, suggestion)
    }
  }

  for (const suggestion of findDrawStopSuggestions(raw, routeQuery, directionIndex, new Set())) {
    insert(suggestion, suggestion.fromRouteDetail ? 3 : 1)
  }
  for (const suggestion of findCatalogStopSuggestions(raw, catalog)) {
    const locations = findMapDrawCatalogLocationsForName(suggestion.zh, suggestion.en, catalog)
    insert(locations.length > 1 ? { ...suggestion, point: undefined } : suggestion, 2)
  }

  return [...merged.values()]
    .sort((a, b) => {
      const scoreDiff = rankSuggestion(b) - rankSuggestion(a)
      if (scoreDiff !== 0) return scoreDiff
      return scoreNameMatch(raw, b.zh, b.en) - scoreNameMatch(raw, a.zh, a.en)
    })
    .slice(0, 8)
}

function rankSuggestion(suggestion: DrawStopSuggestion): number {
  if (suggestion.fromRouteDetail) return 3
  if (suggestion.fromCatalog) return 2
  return 1
}

function catalogStopNameMatches(zh: string, en: string, stop: WorldMapCatalogStop): boolean {
  for (const candidate of resolveCatalogNameCandidates(zh, en)) {
    const queryZh = fixLaneStopChinese(candidate.zh.trim(), candidate.en.trim() || undefined)
    const queryEn = candidate.en.trim()
    const stopZh = fixLaneStopChinese(stop.name.zh.trim(), stop.name.en.trim() || undefined)
    const stopEn = (stop.name.en || stop.name.zh).trim()
    if (stopsMatch({ zh: queryZh, en: queryEn }, { zh: stopZh, en: stopEn })) return true

    const queryEnLower = queryEn.toLowerCase()
    const stopEnLower = stopEn.toLowerCase()
    if (queryZh && (stopZh === queryZh || stopEn === queryZh)) return true
    if (queryEn && (stopEnLower === queryEnLower || stopZh === queryEn)) return true
  }
  return false
}

/** When a stop name matches exactly one catalog entry, return its map coordinates for auto-placement. */
export function resolveMapDrawAutoPlacePoint(
  zh: string,
  en: string,
  catalog: readonly WorldMapCatalogStop[] | null | undefined,
  hintPoint?: WorldMapPoint,
): WorldMapPoint | null {
  const locations = findMapDrawCatalogLocationsForName(zh, en, catalog)
  if (locations.length > 1) return null
  if (hintPoint) return hintPoint
  return locations.length === 1 ? locations[0]!.point : null
}

/** All catalog entries matching the current stop name (may share a name at different points). */
export function findMapDrawCatalogLocationsForName(
  zh: string,
  en: string,
  catalog: readonly WorldMapCatalogStop[] | null | undefined,
): WorldMapCatalogStop[] {
  if (!catalog?.length) return []
  const matches = catalog.filter((stop) => catalogStopNameMatches(zh, en, stop))
  if (matches.length > 0) return matches

  const query = zh.trim() || en.trim()
  if (query.length < 2) return []

  const seen = new Set<string>()
  const fuzzy: WorldMapCatalogStop[] = []
  for (const suggestion of findCatalogStopSuggestions(query, catalog)) {
    if (!suggestion.point) continue
    const key = `${suggestion.point[0]}|${suggestion.point[1]}`
    if (seen.has(key)) continue
    seen.add(key)
    fuzzy.push({
      name: { zh: suggestion.zh, en: suggestion.en },
      point: suggestion.point,
    })
  }
  return fuzzy
}

export function findCatalogLocationIndexByPoint(
  locations: readonly WorldMapCatalogStop[],
  point: WorldMapPoint | null | undefined,
): number | null {
  if (!point || locations.length === 0) return null
  const exactIndex = locations.findIndex(
    (entry) =>
      Math.abs(entry.point[0] - point[0]) < 0.0005 && Math.abs(entry.point[1] - point[1]) < 0.0005,
  )
  if (exactIndex >= 0) return exactIndex

  let bestIndex: number | null = null
  let bestDistance = Infinity
  for (let index = 0; index < locations.length; index += 1) {
    const entry = locations[index]!
    const distance = Math.hypot(entry.point[0] - point[0], entry.point[1] - point[1])
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }
  return bestDistance < 0.003 ? bestIndex : null
}
