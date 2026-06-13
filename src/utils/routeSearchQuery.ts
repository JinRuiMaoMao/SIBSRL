import { routes } from '../data/routes'
import { getListedRouteIdsForRoute } from '../data/routeDisplayGroups'
import type { BusRoute } from '../types/route'
import {
  DISPLAY_ONLY_RENAMES,
  EXCLUDED_ROUTE_NUMBERS,
  getRouteNumberAliases,
  mergeRoutesByBaseNumber,
  toMergeBaseRouteNumber,
} from './routeMerge'

/** 线路编号可用字符（含 476#、U47* 等） */
const ROUTE_NUMBER_TOKEN = /^[0-9A-Za-z#*%]+$/

export type RouteNumberPattern =
  | { kind: 'prefix'; value: string }
  | { kind: 'suffix'; value: string }

let searchTokensByRouteId: Map<string, string[]> | null = null

function resolveDisplayRouteId(raw: BusRoute): string {
  const base = toMergeBaseRouteNumber(raw.number)
  return (DISPLAY_ONLY_RENAMES[base] ?? base).toLowerCase()
}

function buildSearchTokensByRouteId(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  const displayRoutes = mergeRoutesByBaseNumber(routes)

  for (const route of displayRoutes) {
    map.set(route.id.toLowerCase(), [
      route.id,
      route.number,
      ...getRouteNumberAliases(route.number),
      ...getListedRouteIdsForRoute(route),
    ])
  }

  for (const raw of routes) {
    if (EXCLUDED_ROUTE_NUMBERS.has(raw.number)) continue
    const displayKey = resolveDisplayRouteId(raw)
    const tokens = map.get(displayKey)
    if (!tokens) continue
    tokens.push(raw.id, raw.number)
  }

  for (const tokens of map.values()) {
    const deduped = [...new Set(tokens.filter(Boolean))]
    tokens.length = 0
    tokens.push(...deduped)
  }

  return map
}

function getRouteSearchNumberTokens(route: BusRoute): string[] {
  if (!searchTokensByRouteId) {
    searchTokensByRouteId = buildSearchTokensByRouteId()
  }
  return searchTokensByRouteId.get(route.id.toLowerCase()) ?? [route.id, route.number]
}

export function parseRouteNumberPatternQuery(query: string): RouteNumberPattern | null {
  const q = query.trim()
  if (!q) return null

  if (q.endsWith('...')) {
    const prefix = q.slice(0, -3)
    if (prefix && ROUTE_NUMBER_TOKEN.test(prefix)) {
      return { kind: 'prefix', value: prefix }
    }
  }

  if (q.startsWith('...')) {
    const suffix = q.slice(3)
    if (suffix && ROUTE_NUMBER_TOKEN.test(suffix)) {
      return { kind: 'suffix', value: suffix }
    }
  }

  return null
}

export function routeNumbersMatchPattern(numbers: string[], pattern: RouteNumberPattern): boolean {
  const value = pattern.value.toLowerCase()
  return numbers.some((number) => {
    const n = number.toLowerCase()
    return pattern.kind === 'prefix' ? n.startsWith(value) : n.endsWith(value)
  })
}

export function routeMatchesNumberPattern(route: BusRoute, pattern: RouteNumberPattern): boolean {
  return routeNumbersMatchPattern(getRouteSearchNumberTokens(route), pattern)
}

export function matchesRouteSearchQuery(route: BusRoute, query: string): boolean {
  const q = query.trim()
  if (!q) return true

  const pattern = parseRouteNumberPatternQuery(q)
  if (pattern) return routeMatchesNumberPattern(route, pattern)

  const searchNumbers = getRouteSearchNumberTokens(route)
  const qLower = q.toLowerCase()

  const directionQuery = q.match(/^(.+)([nsew])$/i)
  if (directionQuery) {
    const base = directionQuery[1]!.toLowerCase()
    const dir = directionQuery[2]!.toUpperCase()
    const hasDirection =
      route.stops?.some((s) => (s.directionKey ?? '').toUpperCase() === dir) ?? false
    if (searchNumbers.some((number) => number.toLowerCase() === base) && hasDirection) return true
  }

  if (searchNumbers.some((number) => number.toLowerCase().startsWith(qLower))) return true

  const haystack = [
    ...searchNumbers,
    route.origin.zh,
    route.origin.en,
    route.destination.zh,
    route.destination.en,
    route.via?.zh,
    route.via?.en,
    ...route.operators,
    ...route.stops?.flatMap((s) => s.list.flatMap((stop) => [stop.name.zh, stop.name.en])) ?? [],
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(qLower)
}

/** 输入尚未形成完整模式时，给出可点击的编号前缀/后缀建议 */
export function getRouteSearchSuggestions(query: string): string[] {
  const q = query.trim()
  if (!q || parseRouteNumberPatternQuery(q)) return []

  if (!ROUTE_NUMBER_TOKEN.test(q)) return []

  const suggestions = [`${q}...`, `...${q}`]
  return suggestions.filter((item, index, all) => all.indexOf(item) === index)
}

export function isRouteSearchSuggestionActive(suggestion: string, query: string): boolean {
  return suggestion.trim() === query.trim()
}

export function challengeRouteNumberMatchesQuery(routeNumber: string | undefined, query: string): boolean {
  const code = routeNumber?.trim()
  if (!code) return false

  const pattern = parseRouteNumberPatternQuery(query)
  if (pattern) return routeNumbersMatchPattern([code], pattern)

  const qLower = query.trim().toLowerCase()
  return code.toLowerCase().includes(qLower) || code.toLowerCase().startsWith(qLower)
}
