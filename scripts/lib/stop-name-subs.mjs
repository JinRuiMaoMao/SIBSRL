import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const rulesPath = resolve(root, 'src/data/stopNameSubs.ts')

function loadRulesFromSource() {
  const source = readFileSync(rulesPath, 'utf8')
  const rules = []
  const blockRe =
    /\{\s*matchEn:\s*\[([^\]]+)\](?:,\s*matchZh:\s*\[([^\]]+)\])?,\s*nameSub:\s*\{\s*zh:\s*'((?:\\'|[^'])*)',\s*en:\s*'((?:\\'|[^'])*)'\s*\}\s*,?\s*\}/g

  for (const match of source.matchAll(blockRe)) {
    const matchEn = [...match[1].matchAll(/'((?:\\'|[^'])*)'/g)].map((m) => m[1].replace(/\\'/g, "'"))
    const matchZh = match[2]
      ? [...match[2].matchAll(/'((?:\\'|[^'])*)'/g)].map((m) => m[1].replace(/\\'/g, "'"))
      : []
    rules.push({
      matchEn,
      matchZh,
      nameSub: {
        zh: match[3].replace(/\\'/g, "'"),
        en: match[4].replace(/\\'/g, "'"),
      },
    })
  }

  if (!rules.length) {
    throw new Error('Failed to parse STOP_NAME_SUB_RULES from stopNameSubs.ts')
  }

  return rules
}

const RULES = loadRulesFromSource()

function stripParentheticalSuffix(text) {
  return text.replace(/\s*[（(][^）)]*[）)]\s*$/, '').trim()
}

function normalizeEnKey(en) {
  return stripParentheticalSuffix(en).toLowerCase()
}

function normalizeZhKey(zh) {
  return stripParentheticalSuffix(zh)
}

export function lookupStopNameSub(name) {
  if (!name?.en) return undefined
  const enKey = normalizeEnKey(name.en)
  const zhKey = normalizeZhKey(name.zh ?? '')

  for (const rule of RULES) {
    if (rule.matchEn.some((candidate) => normalizeEnKey(candidate) === enKey)) {
      return rule.nameSub
    }
    if (rule.matchZh?.some((candidate) => normalizeZhKey(candidate) === zhKey)) {
      return rule.nameSub
    }
  }

  return undefined
}

export function applyStopNameSubToStop(stop) {
  if (!stop?.name || stop.turningPoint || stop.nameSub) return stop
  const nameSub = lookupStopNameSub(stop.name)
  if (!nameSub) return stop
  return { ...stop, nameSub }
}

export function applyStopNameSubsToRoute(route) {
  if (!route?.stops?.length) return route
  return {
    ...route,
    stops: route.stops.map((group) => ({
      ...group,
      list: group.list.map(applyStopNameSubToStop),
    })),
  }
}
