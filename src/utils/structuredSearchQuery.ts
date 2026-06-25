import type { RouteCategory, RouteFilters, RouteTypeFilter } from '../types/route'
import { TYPE_FILTER_ORDER } from '../i18n/routeTypes'

export interface ParsedStructuredSearchQuery {
  text: string
  from?: string
  to?: string
  zone?: number
  operator?: string
  type?: RouteTypeFilter
  category?: RouteCategory
  level?: number
  excludeTypes: RouteTypeFilter[]
  excludeCategories: RouteCategory[]
  excludeZones: number[]
  excludeOperators: string[]
}

const STRUCTURED_COLON_TOKEN =
  /(?:^|\s)(-)?(zone|z|operator|op|type|cat|level|lv|lvl)[：:]([^\s]+)/gi

const STRUCTURED_EXCLUDE_SHORTHAND =
  /(?:^|\s)-(express|night|inner|inter|special|centralaxis|circular|axis|loop|peakexpress)\b/gi

function normalizeCategoryToken(raw: string): RouteCategory | null {
  const value = raw.trim().toLowerCase()
  const map: Record<string, RouteCategory> = {
    inner: 'inner',
    inter: 'inter',
    express: 'express',
    night: 'night',
    special: 'special',
    centralaxis: 'centralAxis',
    'central-axis': 'centralAxis',
    axis: 'centralAxis',
  }
  return map[value] ?? null
}

function normalizeTypeToken(raw: string): RouteTypeFilter | null {
  const value = raw.trim().toLowerCase()
  if (value === 'centralaxis' || value === 'central-axis' || value === 'axis') {
    return 'centralAxis'
  }
  if (value === 'circular') return 'loop'
  if (value === 'peakexpress' || value === 'peak-express') return 'peakExpress'
  if (value === 'special') return 'specialDeparture'
  return TYPE_FILTER_ORDER.find((item) => item.toLowerCase() === value) ?? null
}

function categoryToTypeChip(category: RouteCategory): RouteTypeFilter | null {
  if (category === 'centralAxis') return 'centralAxis'
  if (category === 'night') return 'night'
  return null
}

function pushExcludeType(parsed: ParsedStructuredSearchQuery, type: RouteTypeFilter) {
  if (!parsed.excludeTypes.includes(type)) parsed.excludeTypes.push(type)
}

function pushExcludeCategory(parsed: ParsedStructuredSearchQuery, category: RouteCategory) {
  if (!parsed.excludeCategories.includes(category)) parsed.excludeCategories.push(category)
}

function applyTypeExcludeToken(parsed: ParsedStructuredSearchQuery, raw: string) {
  const type = normalizeTypeToken(raw)
  if (type) {
    pushExcludeType(parsed, type)
    return
  }
  const category = normalizeCategoryToken(raw)
  if (category) pushExcludeCategory(parsed, category)
}

function parseStopPairFromText(text: string): { from?: string; to?: string; rest: string } {
  const dashIndex = text.indexOf('--')
  if (dashIndex <= 0) return { rest: text }

  const from = text.slice(0, dashIndex).trim()
  const to = text.slice(dashIndex + 2).trim()
  if (!from || !to) return { rest: text }

  return { from, to, rest: '' }
}

function removeStructuredTokens(
  query: string,
  shouldRemove: (
    negated: boolean,
    key: string | undefined,
    value: string | undefined,
    shorthand: string | undefined,
  ) => boolean,
): string {
  let text = query
  for (const match of [...query.matchAll(STRUCTURED_COLON_TOKEN)]) {
    if (shouldRemove(!!match[1], match[2]?.toLowerCase(), match[3]?.trim(), undefined)) {
      text = text.replace(match[0], ' ')
    }
  }
  for (const match of [...query.matchAll(STRUCTURED_EXCLUDE_SHORTHAND)]) {
    if (shouldRemove(true, undefined, undefined, match[1]?.toLowerCase())) {
      text = text.replace(match[0], ' ')
    }
  }
  return text.replace(/\s+/g, ' ').trim()
}

export function stripZoneTokens(query: string): string {
  return removeStructuredTokens(
    query,
    (negated, key) => key === 'zone' || key === 'z',
  )
}

export function stripOperatorTokens(query: string): string {
  return removeStructuredTokens(
    query,
    (_negated, key) => key === 'operator' || key === 'op',
  )
}

export function stripTypeFilterTokens(query: string): string {
  return removeStructuredTokens(query, (negated, key, _value, shorthand) => {
    if (shorthand) return true
    return key === 'type' || key === 'cat'
  })
}

export interface FilterChipView {
  zone: number | 'all'
  operator: string | 'all'
  type: RouteTypeFilter | 'all'
  excludedZones: number[]
  excludedOperators: string[]
  excludedTypes: RouteTypeFilter[]
}

export function getFilterChipView(
  query: string,
  filters: Pick<RouteFilters, 'zone' | 'operator' | 'type'>,
): FilterChipView {
  const structured = parseStructuredSearchQuery(query)
  const categoryType = structured.category ? categoryToTypeChip(structured.category) : null
  const excludedTypes = [...structured.excludeTypes]
  for (const category of structured.excludeCategories) {
    const chip = categoryToTypeChip(category)
    if (chip && !excludedTypes.includes(chip)) excludedTypes.push(chip)
  }

  return {
    zone: structured.zone ?? filters.zone,
    operator: structured.operator ?? filters.operator,
    type: structured.type ?? categoryType ?? filters.type,
    excludedZones: structured.excludeZones,
    excludedOperators: structured.excludeOperators,
    excludedTypes,
  }
}

export function parseStructuredSearchQuery(query: string): ParsedStructuredSearchQuery {
  const parsed: ParsedStructuredSearchQuery = {
    text: query,
    excludeTypes: [],
    excludeCategories: [],
    excludeZones: [],
    excludeOperators: [],
  }

  let text = query

  for (const match of [...query.matchAll(STRUCTURED_COLON_TOKEN)]) {
    text = text.replace(match[0], ' ')
    const negated = !!match[1]
    const key = match[2]?.toLowerCase()
    const value = match[3]?.trim()
    if (!key || !value) continue

    if (key === 'zone' || key === 'z') {
      const zone = Number.parseInt(value, 10)
      if (!Number.isFinite(zone)) continue
      if (negated) {
        if (!parsed.excludeZones.includes(zone)) parsed.excludeZones.push(zone)
      } else {
        parsed.zone = zone
      }
      continue
    }

    if (key === 'operator' || key === 'op') {
      const operator = value.toUpperCase()
      if (negated) {
        if (!parsed.excludeOperators.includes(operator)) parsed.excludeOperators.push(operator)
      } else {
        parsed.operator = operator
      }
      continue
    }

    if (key === 'type' || key === 'cat') {
      if (negated) {
        applyTypeExcludeToken(parsed, value)
        continue
      }
      const category = normalizeCategoryToken(value)
      if (category) {
        parsed.category = category
        continue
      }
      const type = normalizeTypeToken(value)
      if (type) parsed.type = type
      continue
    }

    if (key === 'level' || key === 'lv' || key === 'lvl') {
      if (negated) continue
      const level = Number.parseInt(value, 10)
      if (Number.isFinite(level)) parsed.level = level
    }
  }

  for (const match of [...query.matchAll(STRUCTURED_EXCLUDE_SHORTHAND)]) {
    text = text.replace(match[0], ' ')
    const exclude = match[1]
    if (exclude) applyTypeExcludeToken(parsed, exclude)
  }

  text = text.replace(/\s+/g, ' ').trim()
  const stopPair = parseStopPairFromText(text)
  if (stopPair.from && stopPair.to) {
    parsed.from = stopPair.from
    parsed.to = stopPair.to
    text = stopPair.rest
  }

  parsed.text = text
  return parsed
}
