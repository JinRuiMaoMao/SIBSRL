import type { RouteCategory, RouteTypeFilter } from '../types/route'
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
}

const STRUCTURED_TOKEN =
  /(?:^|\s)(zone|z|operator|op|type|cat|level|lv|lvl|from|to|起|终)[：:]([^\s]+)|(?:^|\s)-(express|night|inner|inter|special|centralaxis|circular|axis|loop|peakexpress)\b/gi

const STOP_PAIR_ARROW = /^(.+?)\s*(?:→|->)\s*(.+)$/

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

export function parseStructuredSearchQuery(query: string): ParsedStructuredSearchQuery {
  const parsed: ParsedStructuredSearchQuery = {
    text: query,
    excludeTypes: [],
    excludeCategories: [],
  }

  let text = query
  const arrowMatch = text.match(STOP_PAIR_ARROW)
  if (arrowMatch) {
    parsed.from = arrowMatch[1]?.trim()
    parsed.to = arrowMatch[2]?.trim()
    text = ''
  }

  const matches = [...query.matchAll(STRUCTURED_TOKEN)]
  for (const match of matches) {
    text = text.replace(match[0], ' ')
    const key = match[1]?.toLowerCase()
    const value = match[2]?.trim()
    const exclude = match[3]

    if (exclude) {
      const type = normalizeTypeToken(exclude)
      if (type && !parsed.excludeTypes.includes(type)) {
        parsed.excludeTypes.push(type)
        continue
      }
      const category = normalizeCategoryToken(exclude)
      if (category && !parsed.excludeCategories.includes(category)) {
        parsed.excludeCategories.push(category)
      }
      continue
    }

    if (!key || !value) continue

    if (key === 'from' || key === '起') {
      parsed.from = value
      continue
    }

    if (key === 'to' || key === '终') {
      parsed.to = value
      continue
    }

    if (key === 'zone' || key === 'z') {
      const zone = Number.parseInt(value, 10)
      if (Number.isFinite(zone)) parsed.zone = zone
      continue
    }

    if (key === 'operator' || key === 'op') {
      parsed.operator = value.toUpperCase()
      continue
    }

    if (key === 'type' || key === 'cat') {
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
      const level = Number.parseInt(value, 10)
      if (Number.isFinite(level)) parsed.level = level
    }
  }

  parsed.text = text.replace(/\s+/g, ' ').trim()
  return parsed
}
