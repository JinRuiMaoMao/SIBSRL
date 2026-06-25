import { OPERATORS, routes } from '../data/routes'
import { getListedRouteIdsForRoute } from '../data/routeDisplayGroups'
import type { MessageKey } from '../i18n/messages'
import { TYPE_FILTER_KEYS, TYPE_FILTER_ORDER } from '../i18n/routeTypes'
import type { RouteCategory, RouteTypeFilter } from '../types/route'
import { getFilterTokenAliases, localizedExcludeMatchesToken } from './filterTokenAliases'
import { mergeRoutesByBaseNumber } from './routeMerge'
import { compareRouteNumber } from './routeSort'
import { parseRouteNumberPatternQuery, ROUTE_NUMBER_TOKEN } from './routeSearchQuery'

export type SearchCompletionKind = 'route' | 'route-pattern' | 'filter'

export interface SearchCompletion {
  replacement: string
  kind: SearchCompletionKind
  descriptionKey?: MessageKey
  descriptionVars?: Record<string, string | number>
}

const CATEGORY_LABEL_KEYS: Record<RouteCategory, MessageKey> = {
  inner: 'categoryInner',
  inter: 'categoryInter',
  express: 'categoryExpress',
  night: 'categoryNight',
  special: 'categorySpecial',
  centralAxis: 'categoryCentralAxis',
}

function aliasNameKey(alias: ReturnType<typeof getFilterTokenAliases>[number]): MessageKey | null {
  if (alias.category) return CATEGORY_LABEL_KEYS[alias.category]
  if (alias.type) return TYPE_FILTER_KEYS[alias.type]
  return null
}

export function getCompletionContext(query: string): {
  prefix: string
  token: string
  tokenStart: number
} {
  const trimmed = query.trimEnd()
  if (!trimmed) {
    return { prefix: '', token: '', tokenStart: 0 }
  }

  const lastSpace = trimmed.lastIndexOf(' ')
  const tokenStart = lastSpace < 0 ? 0 : lastSpace + 1
  return {
    prefix: trimmed.slice(0, tokenStart),
    token: trimmed.slice(tokenStart),
    tokenStart,
  }
}

export function applySearchCompletion(query: string, completion: SearchCompletion): string {
  const { tokenStart } = getCompletionContext(query)
  return query.slice(0, tokenStart) + completion.replacement
}

let zonesCache: number[] | null = null
let routeNumbersCache: string[] | null = null
let levelsCache: number[] | null = null
let filterCompletionCache: SearchCompletion[] | null = null

function getZones(): number[] {
  if (zonesCache) return zonesCache
  const set = new Set<number>()
  mergeRoutesByBaseNumber(routes).forEach((route) => {
    route.zones.forEach((zone) => set.add(zone))
  })
  zonesCache = [...set].sort((a, b) => a - b)
  return zonesCache
}

function getRouteNumbers(): string[] {
  if (routeNumbersCache) return routeNumbersCache
  const set = new Set<string>()
  for (const route of mergeRoutesByBaseNumber(routes)) {
    set.add(route.number)
    set.add(route.id)
    getListedRouteIdsForRoute(route).forEach((id) => set.add(id))
  }
  routeNumbersCache = [...set].sort(compareRouteNumber)
  return routeNumbersCache
}

function getLevels(): number[] {
  if (levelsCache) return levelsCache
  const set = new Set<number>()
  mergeRoutesByBaseNumber(routes).forEach((route) => {
    if (route.levelRequired != null) set.add(route.levelRequired)
  })
  levelsCache = [...set].sort((a, b) => a - b)
  return levelsCache
}

function serviceTypeToken(type: RouteTypeFilter): string {
  if (type === 'peakExpress') return 'peakexpress'
  if (type === 'specialDeparture') return 'special'
  if (type === 'staffShuttle') return 'staffshuttle'
  return type
}

function getAllFilterCompletionTemplates(): SearchCompletion[] {
  if (filterCompletionCache) return filterCompletionCache

  const items: SearchCompletion[] = []

  for (const zone of getZones()) {
    items.push({
      replacement: `zone:${zone}`,
      kind: 'filter',
      descriptionKey: 'searchCompletionZone',
      descriptionVars: { n: zone },
    })
    items.push({
      replacement: `z:${zone}`,
      kind: 'filter',
      descriptionKey: 'searchCompletionZone',
      descriptionVars: { n: zone },
    })
    items.push({
      replacement: `-zone ${zone}`,
      kind: 'filter',
      descriptionKey: 'searchCompletionZoneExclude',
      descriptionVars: { n: zone },
    })
    items.push({
      replacement: `-z ${zone}`,
      kind: 'filter',
      descriptionKey: 'searchCompletionZoneExclude',
      descriptionVars: { n: zone },
    })
  }

  for (const op of Object.keys(OPERATORS).sort((a, b) => b.length - a.length)) {
    items.push({
      replacement: `op:${op}`,
      kind: 'filter',
      descriptionKey: 'searchCompletionOperator',
      descriptionVars: { op },
    })
    items.push({
      replacement: `operator:${op}`,
      kind: 'filter',
      descriptionKey: 'searchCompletionOperator',
      descriptionVars: { op },
    })
    items.push({
      replacement: `-${op}`,
      kind: 'filter',
      descriptionKey: 'searchCompletionOperatorExclude',
      descriptionVars: { op },
    })
  }

  const categories = ['inner', 'inter', 'express', 'night', 'special', 'centralaxis'] as const
  for (const category of categories) {
    const nameKey = CATEGORY_LABEL_KEYS[category === 'centralaxis' ? 'centralAxis' : category]!
    items.push({
      replacement: `type:${category}`,
      kind: 'filter',
      descriptionKey: 'searchCompletionCategory',
      descriptionVars: { nameKey },
    })
    items.push({
      replacement: `cat:${category}`,
      kind: 'filter',
      descriptionKey: 'searchCompletionCategory',
      descriptionVars: { nameKey },
    })
    items.push({
      replacement: `-${category}`,
      kind: 'filter',
      descriptionKey: 'searchCompletionCategoryExclude',
      descriptionVars: { nameKey },
    })
  }

  for (const type of TYPE_FILTER_ORDER) {
    const token = serviceTypeToken(type)
    const nameKey = TYPE_FILTER_KEYS[type]
    items.push({
      replacement: `type:${token}`,
      kind: 'filter',
      descriptionKey: 'searchCompletionServiceType',
      descriptionVars: { nameKey },
    })
    items.push({
      replacement: `-${token}`,
      kind: 'filter',
      descriptionKey: 'searchCompletionServiceTypeExclude',
      descriptionVars: { nameKey },
    })
  }

  for (const level of getLevels()) {
    items.push({
      replacement: `lv:${level}`,
      kind: 'filter',
      descriptionKey: 'searchCompletionLevel',
      descriptionVars: { level },
    })
    items.push({
      replacement: `level:${level}`,
      kind: 'filter',
      descriptionKey: 'searchCompletionLevel',
      descriptionVars: { level },
    })
  }

  for (const alias of getFilterTokenAliases()) {
    const nameKey = aliasNameKey(alias)
    if (!nameKey) continue
    for (const label of alias.labels) {
      items.push({
        replacement: `-${label}`,
        kind: 'filter',
        descriptionKey: alias.type ? 'searchCompletionServiceTypeExclude' : 'searchCompletionCategoryExclude',
        descriptionVars: { nameKey },
      })
      items.push({
        replacement: `type:${label}`,
        kind: 'filter',
        descriptionKey: alias.type ? 'searchCompletionServiceType' : 'searchCompletionCategory',
        descriptionVars: { nameKey },
      })
    }
  }

  filterCompletionCache = items
  return items
}

function matchesFilterToken(replacement: string, token: string): boolean {
  const value = replacement.toLowerCase()
  const query = token.toLowerCase()
  if (!query) return false
  if (value.startsWith(query)) return true

  const aliasRules: Array<{ prefixes: string[]; match: (token: string) => boolean }> = [
    {
      prefixes: ['zone:', 'z:'],
      match: (t) => t === 'z' || t.startsWith('zone'),
    },
    {
      prefixes: ['-zone ', '-z '],
      match: (t) => t === '-z' || t.startsWith('-zone'),
    },
    {
      prefixes: ['op:', 'operator:'],
      match: (t) => t === 'op' || t.startsWith('operator'),
    },
    {
      prefixes: ['type:', 'cat:'],
      match: (t) => t === 'type' || t === 'cat' || t.startsWith('type') || t.startsWith('cat'),
    },
    {
      prefixes: ['lv:', 'level:', 'lvl:'],
      match: (t) => t === 'lv' || t === 'lvl' || t.startsWith('level'),
    },
  ]

  for (const rule of aliasRules) {
    if (rule.match(query) && rule.prefixes.some((prefix) => value.startsWith(prefix))) {
      return true
    }
  }

  if (query.startsWith('-') && value.startsWith('-')) {
    return value.startsWith(query) || query.length === 1
  }

  if (replacement.startsWith('-')) {
    const label = replacement.slice(1)
    if (localizedExcludeMatchesToken(label, token)) return true
  }

  if (replacement.startsWith('type:') || replacement.startsWith('cat:')) {
    const label = replacement.replace(/^(type|cat):/i, '')
    const bare = query.replace(/^(type|cat):?/i, '')
    if (query === 'type' || query === 'cat' || label.startsWith(bare)) return true
  }

  return false
}

function getRouteCompletions(token: string): SearchCompletion[] {
  if (!token || !ROUTE_NUMBER_TOKEN.test(token)) return []
  if (parseRouteNumberPatternQuery(token)) return []

  const lower = token.toLowerCase()
  const items: SearchCompletion[] = []

  if (!token.includes('...')) {
    items.push({
      replacement: `${token}...`,
      kind: 'route-pattern',
      descriptionKey: 'searchSuggestionPrefix',
      descriptionVars: { value: token },
    })
    items.push({
      replacement: `...${token}`,
      kind: 'route-pattern',
      descriptionKey: 'searchSuggestionSuffix',
      descriptionVars: { value: token },
    })
  }

  let routeCount = 0
  for (const number of getRouteNumbers()) {
    const numberLower = number.toLowerCase()
    if (numberLower === lower) continue
    if (!numberLower.startsWith(lower)) continue
    items.push({
      replacement: number,
      kind: 'route',
      descriptionKey: 'searchCompletionRoute',
      descriptionVars: { number },
    })
    routeCount += 1
    if (routeCount >= 8) break
  }

  return items
}

export function getSearchCompletions(query: string): SearchCompletion[] {
  const trimmed = query.trimEnd()
  if (!trimmed) return []

  const { token } = getCompletionContext(trimmed)
  if (!token) return []

  const seen = new Set<string>()
  const result: SearchCompletion[] = []

  const push = (item: SearchCompletion) => {
    if (seen.has(item.replacement)) return
    seen.add(item.replacement)
    result.push(item)
  }

  for (const item of getRouteCompletions(token)) {
    push(item)
    if (result.length >= 12) return result
  }

  for (const item of getAllFilterCompletionTemplates()) {
    if (!matchesFilterToken(item.replacement, token)) continue
    push(item)
    if (result.length >= 12) return result
  }

  return result
}

export function isSearchCompletionActive(
  completion: SearchCompletion,
  query: string,
  activeIndex: number,
  index: number,
): boolean {
  if (activeIndex >= 0) return activeIndex === index
  return applySearchCompletion(query, completion).trim() === query.trim()
}
