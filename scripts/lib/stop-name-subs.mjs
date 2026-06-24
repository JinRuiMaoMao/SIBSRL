import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const rulesPath = resolve(root, 'src/data/stopNameSubs.ts')

function loadRulesFromSource() {
  const source = readFileSync(rulesPath, 'utf8')
  const rules = []
  const blockRe =
    /\{\s*canonicalName:\s*\{\s*zh:\s*'((?:\\'|[^'])*)',\s*en:\s*'((?:\\'|[^'])*)'\s*\},\s*matchEn:\s*\[([^\]]+)\](?:,\s*matchZh:\s*\[([^\]]+)\])?,\s*nameSub:\s*\{\s*zh:\s*'((?:\\'|[^'])*)',\s*en:\s*'((?:\\'|[^'])*)'\s*\}\s*,?\s*\}/g

  for (const match of source.matchAll(blockRe)) {
    const matchEn = [...match[3].matchAll(/'((?:\\'|[^'])*)'/g)].map((m) => m[1].replace(/\\'/g, "'"))
    const matchZh = match[4]
      ? [...match[4].matchAll(/'((?:\\'|[^'])*)'/g)].map((m) => m[1].replace(/\\'/g, "'"))
      : []
    rules.push({
      canonicalName: {
        zh: match[1].replace(/\\'/g, "'"),
        en: match[2].replace(/\\'/g, "'"),
      },
      matchEn,
      matchZh,
      nameSub: {
        zh: match[5].replace(/\\'/g, "'"),
        en: match[6].replace(/\\'/g, "'"),
      },
    })
  }

  if (!rules.length) {
    throw new Error('Failed to parse STOP_NAME_SUB_RULES from stopNameSubs.ts')
  }

  return rules
}

const RULES = loadRulesFromSource()
const ZONE7_CANONICAL_EN = 'Zone 7 Interchange'

function stripParentheticalSuffix(text) {
  return text.replace(/\s*[（(][^）)]*[）)]\s*$/, '').trim()
}

function normalizeEnKey(en) {
  return stripParentheticalSuffix(en).toLowerCase()
}

function normalizeZhKey(zh) {
  return stripParentheticalSuffix(zh)
}

export function lookupStopNameSubRule(name) {
  if (!name?.en) return undefined
  const enKey = normalizeEnKey(name.en)
  const zhKey = normalizeZhKey(name.zh ?? '')

  for (const rule of RULES) {
    if (rule.matchEn.some((candidate) => normalizeEnKey(candidate) === enKey)) {
      return rule
    }
    if (rule.matchZh?.some((candidate) => normalizeZhKey(candidate) === zhKey)) {
      return rule
    }
  }

  return undefined
}

export function applyStopNameSubToStop(stop) {
  if (!stop?.name || stop.turningPoint) return stop
  const rule = lookupStopNameSubRule(stop.name)
  if (!rule) return stop
  return {
    ...stop,
    name: { ...rule.canonicalName },
    nameSub: stop.nameSub ?? rule.nameSub,
  }
}

function isZone7InterchangeStop(name) {
  const rule = lookupStopNameSubRule(name)
  return rule?.canonicalName.en === ZONE7_CANONICAL_EN
}

export function mergeConsecutiveZone7InterchangeStops(list) {
  const merged = []

  for (const stop of list) {
    const prev = merged[merged.length - 1]
    if (prev && isZone7InterchangeStop(prev.name) && isZone7InterchangeStop(stop.name)) {
      merged[merged.length - 1] = applyStopNameSubToStop(prev)
      continue
    }
    merged.push(stop)
  }

  return merged
}

export function applyStopNameSubsToRoute(route) {
  if (!route?.stops?.length) return route
  return {
    ...route,
    stops: route.stops.map((group) => ({
      ...group,
      list: mergeConsecutiveZone7InterchangeStops(
        group.list.map(applyStopNameSubToStop),
      ),
    })),
  }
}
