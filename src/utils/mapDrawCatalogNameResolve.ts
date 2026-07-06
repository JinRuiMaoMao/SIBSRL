import { STOP_NAME_SUB_RULES } from '../data/stopNameSubs'
import { resolvePlaceZh } from './placeNames'

export interface CatalogNameCandidate {
  zh: string
  en: string
}

function stripRouteCodePrefix(text: string): string {
  return text.trim().replace(/^A\d+[,\s]*/i, '').trim()
}

function splitAliasParts(text: string): string[] {
  return text
    .split(/[,，、/]/)
    .map(stripRouteCodePrefix)
    .map((part) => part.trim())
    .filter(Boolean)
}

function addCandidate(candidates: CatalogNameCandidate[], seen: Set<string>, zh: string, en: string): void {
  const z = zh.trim()
  const e = en.trim()
  if (!z && !e) return
  const key = `${z.toLowerCase()}|${e.toLowerCase()}`
  if (seen.has(key)) return
  seen.add(key)
  candidates.push({ zh: z || e, en: e || z })
}

function queryMatchesAliasPart(query: string, part: string): boolean {
  const q = query.trim()
  const p = part.trim()
  if (!q || !p) return false
  if (q === p) return true
  if (p.includes(q) || q.includes(p)) return true
  return false
}

function queryMatchesNameSub(queryZh: string, queryEn: string, nameSubZh: string, nameSubEn: string): boolean {
  const zhParts = splitAliasParts(nameSubZh)
  const enParts = splitAliasParts(nameSubEn)
  const fullZh = stripRouteCodePrefix(nameSubZh)
  const fullEn = nameSubEn.trim().toLowerCase()

  if (queryZh) {
    if (zhParts.some((part) => queryMatchesAliasPart(queryZh, part))) return true
    if (queryMatchesAliasPart(queryZh, fullZh)) return true
    return false
  }

  if (queryEn && enParts.some((part) => queryMatchesAliasPart(queryEn.toLowerCase(), part.toLowerCase()))) {
    return true
  }
  if (queryEn && queryMatchesAliasPart(queryEn.toLowerCase(), fullEn)) return true
  return false
}

/** Expand a map-draw stop query to canonical catalog names (handles nameSub / aliases). */
export function resolveCatalogNameCandidates(zh: string, en: string): CatalogNameCandidate[] {
  const candidates: CatalogNameCandidate[] = []
  const seen = new Set<string>()

  const rawZh = zh.trim()
  const rawEn = en.trim()
  addCandidate(candidates, seen, rawZh, rawEn)

  const resolvedZh = resolvePlaceZh(rawZh, rawEn)
  if (resolvedZh !== rawZh) {
    addCandidate(candidates, seen, resolvedZh, rawEn)
  }

  const queryZh = stripRouteCodePrefix(resolvedZh)
  const queryEn = stripRouteCodePrefix(rawEn).toLowerCase()

  for (const rule of STOP_NAME_SUB_RULES) {
    if (queryMatchesNameSub(queryZh, queryEn, rule.nameSub.zh, rule.nameSub.en)) {
      addCandidate(candidates, seen, rule.canonicalName.zh, rule.canonicalName.en)
    }

    if (rule.matchZh?.some((match) => queryMatchesAliasPart(queryZh, match))) {
      addCandidate(candidates, seen, rule.canonicalName.zh, rule.canonicalName.en)
    }
    if (rule.matchEn.some((match) => queryMatchesAliasPart(queryEn, match.toLowerCase()))) {
      addCandidate(candidates, seen, rule.canonicalName.zh, rule.canonicalName.en)
    }
  }

  return candidates
}
