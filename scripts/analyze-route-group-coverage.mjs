import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDisplayRouteIds } from './lib/route-display-ids.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const groups = JSON.parse(readFileSync(resolve(root, 'data/route-display-groups.json'), 'utf8'))
const mergeSrc = readFileSync(resolve(root, 'src/utils/routeMerge.ts'), 'utf8')

const EXACT = {}
for (const m of mergeSrc.matchAll(
  /'([^']+)':\s*\{\s*base:\s*'([^']+)'(?:,\s*directionKey:\s*'([^']+)')?\s*\}/g,
)) {
  EXACT[m[1]] = { base: m[2], directionKey: m[3] }
}

const DISPLAY_ONLY = {}
const displayBlock = mergeSrc.match(/export const DISPLAY_ONLY_RENAMES[^=]*=\s*\{([\s\S]*?)\n\}/)?.[1]
if (displayBlock) {
  for (const m of displayBlock.matchAll(/'([^']+)':\s*'([^']+)'/g)) {
    DISPLAY_ONLY[m[1]] = m[2]
  }
}

const standaloneBlock =
  mergeSrc.match(/STANDALONE_ROUTE_NUMBERS = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? ''
const STANDALONE = new Set([...standaloneBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]))

function toBase(n) {
  if (EXACT[n]) return EXACT[n].base
  if (STANDALONE.has(n)) return n
  if (/(?<=[0-9Y])[NSEW]$/i.test(n)) return n.slice(0, -1)
  return n
}

function resolveListedId(listedId, displayIds) {
  const key = listedId.trim()
  if (displayIds.has(key)) return key
  if (DISPLAY_ONLY[key] && displayIds.has(DISPLAY_ONLY[key])) return DISPLAY_ONLY[key]
  const base = toBase(key)
  if (displayIds.has(base)) return base
  return null
}

const allDisplay = getDisplayRouteIds()
const displaySet = new Set(allDisplay)
const grouped = new Set()
const missingListed = []

for (const [group, ids] of Object.entries(groups)) {
  for (const listedId of ids) {
    const resolved = resolveListedId(listedId, displaySet)
    if (!resolved) missingListed.push({ group, listedId })
    else grouped.add(resolved)
  }
}

const notInGroups = allDisplay.filter((id) => !grouped.has(id))

let uiVisibleCount = 0
const uiVisibleIds = new Set()
const crossGroupDupes = []
for (const [group, ids] of Object.entries(groups)) {
  const seenInGroup = new Set()
  for (const listedId of ids) {
    const resolved = resolveListedId(listedId, displaySet)
    if (!resolved || seenInGroup.has(resolved)) continue
    seenInGroup.add(resolved)
    uiVisibleCount++
    if (uiVisibleIds.has(resolved)) crossGroupDupes.push({ group, listedId, resolved })
    uiVisibleIds.add(resolved)
  }
}

console.log('display total:', allDisplay.length)
console.log('grouped unique resolved (global):', grouped.size)
console.log('UI visible cards (per-group dedupe sum):', uiVisibleCount)
console.log('UI unique route ids shown:', uiVisibleIds.size)
console.log('cross-group duplicate counts:', crossGroupDupes.map((x) => `${x.resolved} in ${x.group} via ${x.listedId}`).join('; ') || '(none)')
console.log(
  'unresolved listed IDs:',
  missingListed.length,
  missingListed.map((x) => `${x.group}:${x.listedId}`).join(', ') || '(none)',
)
console.log('display routes NOT in any group:', notInGroups.length, notInGroups.join(', ') || '(none)')
