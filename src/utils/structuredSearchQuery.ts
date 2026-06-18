import type { RouteTypeFilter } from '../types/route'
import { TYPE_FILTER_ORDER } from '../i18n/routeTypes'

export interface ParsedStructuredSearchQuery {
  text: string
  zone?: number
  operator?: string
  type?: RouteTypeFilter
  excludeTypes: RouteTypeFilter[]
}

const STRUCTURED_TOKEN =
  /(?:^|\s)(zone|z|operator|op|type|cat):([^\s]+)|(?:^|\s)-(express|night|inner|inter|special|centralaxis|circular)\b/gi

function normalizeTypeToken(raw: string): RouteTypeFilter | null {
  const value = raw.trim().toLowerCase()
  if (value === 'centralaxis' || value === 'central-axis' || value === 'axis') {
    return 'centralAxis'
  }
  return TYPE_FILTER_ORDER.find((item) => item.toLowerCase() === value) ?? null
}

export function parseStructuredSearchQuery(query: string): ParsedStructuredSearchQuery {
  const parsed: ParsedStructuredSearchQuery = {
    text: query,
    excludeTypes: [],
  }

  let text = query
  const matches = [...query.matchAll(STRUCTURED_TOKEN)]
  for (const match of matches) {
    text = text.replace(match[0], ' ')
    const key = match[1]?.toLowerCase()
    const value = match[2]?.trim()
    const exclude = match[3]

    if (exclude) {
      const type = normalizeTypeToken(exclude)
      if (type && !parsed.excludeTypes.includes(type)) parsed.excludeTypes.push(type)
      continue
    }

    if (!key || !value) continue

    if (key === 'zone' || key === 'z') {
      const zone = Number.parseInt(value, 10)
      if (Number.isFinite(zone)) parsed.zone = zone
      continue
    }

    if (key === 'operator' || key === 'op') {
      parsed.operator = value
      continue
    }

    if (key === 'type' || key === 'cat') {
      const type = normalizeTypeToken(value)
      if (type) parsed.type = type
    }
  }

  parsed.text = text.replace(/\s+/g, ' ').trim()
  return parsed
}
