import { convertToTraditional } from '../i18n/convert'
import { getMessages } from '../i18n/messages'
import type { MessageKey } from '../i18n/messages'
import { TYPE_FILTER_KEYS, TYPE_FILTER_ORDER } from '../i18n/routeTypes'
import type { RouteCategory, RouteTypeFilter } from '../types/route'

export interface FilterTokenAlias {
  labels: string[]
  category?: RouteCategory
  type?: RouteTypeFilter
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function labelsFor(key: MessageKey, extra?: string[]): string[] {
  const zh = getMessages('zh-Hans')
  const zhHant = getMessages('zh-Hant')
  const en = getMessages('en')
  const set = new Set<string>([zh[key], zhHant[key], en[key]])
  extra?.forEach((item) => set.add(item))
  return [...set]
}

function serviceTypeEnglishToken(serviceType: RouteTypeFilter): string {
  if (serviceType === 'peakExpress') return 'peakexpress'
  if (serviceType === 'specialDeparture') return 'special'
  if (serviceType === 'staffShuttle') return 'staffshuttle'
  return serviceType
}

function buildFilterTokenAliases(): FilterTokenAlias[] {
  const aliases: FilterTokenAlias[] = [
    {
      labels: labelsFor('categoryInner', ['inner']),
      category: 'inner',
    },
    {
      labels: labelsFor('categoryInter', ['inter']),
      category: 'inter',
    },
    {
      labels: labelsFor('categoryExpress', ['express']),
      category: 'express',
      type: 'peakExpress',
    },
    {
      labels: labelsFor('categoryNight', ['night']),
      category: 'night',
      type: 'night',
    },
    {
      labels: labelsFor('categorySpecial', ['special']),
      category: 'special',
    },
    {
      labels: labelsFor('categoryCentralAxis', ['centralaxis', 'axis', 'central-axis']),
      category: 'centralAxis',
      type: 'centralAxis',
    },
  ]

  for (const serviceType of TYPE_FILTER_ORDER) {
    if (serviceType === 'centralAxis' || serviceType === 'night' || serviceType === 'peakExpress') {
      continue
    }
    aliases.push({
      labels: labelsFor(TYPE_FILTER_KEYS[serviceType], [serviceTypeEnglishToken(serviceType)]),
      type: serviceType,
    })
  }

  return aliases
}

let filterTokenAliasesCache: FilterTokenAlias[] | null = null

export function getFilterTokenAliases(): FilterTokenAlias[] {
  if (!filterTokenAliasesCache) {
    filterTokenAliasesCache = buildFilterTokenAliases()
  }
  return filterTokenAliasesCache
}

let localizedExcludeLabelsCache: string[] | null = null

export function getLocalizedExcludeLabels(): string[] {
  if (!localizedExcludeLabelsCache) {
    localizedExcludeLabelsCache = [
      ...new Set(
        getFilterTokenAliases()
          .flatMap((alias) => alias.labels)
          .sort((a, b) => b.length - a.length),
      ),
    ]
  }
  return localizedExcludeLabelsCache
}

export function resolveFilterTokenAlias(raw: string): FilterTokenAlias | null {
  const value = raw.trim()
  if (!value) return null
  const lower = value.toLowerCase()

  for (const alias of getFilterTokenAliases()) {
    if (alias.labels.some((label) => label === value || label.toLowerCase() === lower)) {
      return alias
    }
  }

  return null
}

export function applyFilterTokenAlias(
  parsed: {
    category?: RouteCategory
    type?: RouteTypeFilter
    excludeTypes: RouteTypeFilter[]
    excludeCategories: RouteCategory[]
  },
  alias: FilterTokenAlias,
  mode: 'include' | 'exclude',
) {
  if (mode === 'include') {
    if (alias.category) parsed.category = alias.category
    if (alias.type) parsed.type = alias.type
    return
  }

  if (alias.type && !parsed.excludeTypes.includes(alias.type)) {
    parsed.excludeTypes.push(alias.type)
  }
  if (alias.category && !parsed.excludeCategories.includes(alias.category)) {
    parsed.excludeCategories.push(alias.category)
  }
}

export function stripLocalizedExcludeTokens(query: string): string {
  let text = query
  for (const label of getLocalizedExcludeLabels()) {
    const pattern = new RegExp(`(?:^|\\s)-${escapeRegExp(label)}(?=\\s|$)`, 'gi')
    text = text.replace(pattern, ' ')
  }
  return text.replace(/\s+/g, ' ').trim()
}

export function parseLocalizedExcludeTokens(
  query: string,
  onMatch: (alias: FilterTokenAlias) => void,
): string {
  let text = query
  for (const label of getLocalizedExcludeLabels()) {
    const pattern = new RegExp(`(?:^|\\s)-${escapeRegExp(label)}(?=\\s|$)`, 'gi')
    for (const match of [...text.matchAll(pattern)]) {
      const alias = resolveFilterTokenAlias(label)
      if (!alias) continue
      onMatch(alias)
      text = text.replace(match[0], ' ')
    }
  }
  return text.replace(/\s+/g, ' ').trim()
}

export function localizedExcludeMatchesToken(label: string, token: string): boolean {
  const query = token.trim()
  if (!query) return false
  if (label.startsWith(query) || query.startsWith(`-${label}`)) return true
  if (`-${label}`.startsWith(query)) return true
  return false
}

// Traditional-form helper for callers that build labels manually.
export function toTraditionalLabel(label: string): string {
  return convertToTraditional(label)
}
