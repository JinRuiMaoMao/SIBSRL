import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { routeIdToPageFilename } from './route-page-filename.mjs'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))

const ROUTE_MERGE_SRC = readFileSync(resolve(root, 'src/utils/routeMerge.ts'), 'utf8')

const EXCLUDED = new Set([
  '476EX', '476M', '476XE', '47A', '48A', '41AN', '41AS', '42AN', '42AS',
  '49AN', '49AS', '74AN', '74AS', '673A', '141PE', '141PW', '370AW', '370AE',
  '370BW', '370BE', '475AW', '475PW', 'C401AW', 'C401AE', '75PS',
])

const EXACT_MERGE = {}
for (const m of ROUTE_MERGE_SRC.matchAll(/'([^']+)':\s*\{\s*base:\s*'([^']+)'/g)) {
  EXACT_MERGE[m[1]] = m[2]
}

const DISPLAY_ONLY_RENAMES = {}
const displayBlock = ROUTE_MERGE_SRC.match(
  /export const DISPLAY_ONLY_RENAMES[^=]*=\s*\{([\s\S]*?)\n\}/,
)?.[1]
if (displayBlock) {
  for (const m of displayBlock.matchAll(/'([^']+)':\s*'([^']+)'/g)) {
    DISPLAY_ONLY_RENAMES[m[1]] = m[2]
  }
}

const standaloneBlock =
  ROUTE_MERGE_SRC.match(/STANDALONE_ROUTE_NUMBERS = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? ''
const STANDALONE = new Set([...standaloneBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]))

function toMergeBaseRouteNumber(routeNumber) {
  if (EXACT_MERGE[routeNumber]) return EXACT_MERGE[routeNumber]
  if (STANDALONE.has(routeNumber)) return routeNumber
  if (/(?<=[0-9Y])[NSEW]$/i.test(routeNumber)) return routeNumber.slice(0, -1)
  return routeNumber
}

function hasDisplayRenameConflict(alias, display, allRaw) {
  for (const n of allRaw) {
    if (n === alias || EXCLUDED.has(n) || DISPLAY_ONLY_RENAMES[n]) continue
    if (n === display || toMergeBaseRouteNumber(n) === display) return true
  }
  return false
}

function toRoutePageId(routeNumber, allRaw) {
  const mergeBase = toMergeBaseRouteNumber(routeNumber)
  const rename = DISPLAY_ONLY_RENAMES[routeNumber] ?? DISPLAY_ONLY_RENAMES[mergeBase]
  if (rename && hasDisplayRenameConflict(routeNumber, rename, allRaw)) {
    return mergeBase
  }
  return rename ?? mergeBase
}

function extractRouteNumbers(filePath) {
  const content = readFileSync(filePath, 'utf8')
  const numbers = new Set()

  for (const m of content.matchAll(/\bs\(\s*'([^']+)'/g)) {
    numbers.add(m[1])
  }
  for (const m of content.matchAll(/\bnumber:\s*'([^']+)'/g)) {
    numbers.add(m[1])
  }

  const stubBlock = content.match(/GAME_ROUTE_PLACEHOLDER_NUMBERS = \[([\s\S]*?)\] as const/)
  if (stubBlock) {
    for (const m of stubBlock[1].matchAll(/'([^']+)'/g)) {
      numbers.add(m[1])
    }
  }

  return numbers
}

function compareRouteNumber(a, b) {
  const aStartsLetter = /^[A-Za-z]/.test(a)
  const bStartsLetter = /^[A-Za-z]/.test(b)
  if (aStartsLetter !== bStartsLetter) return aStartsLetter ? 1 : -1
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

/** 与 mergeRoutesByBaseNumber 一致的展示用线路编号列表 */
export function getDisplayRouteIds() {
  const files = [
    resolve(root, 'src/data/routes.ts'),
    resolve(root, 'src/data/routesSibsTypes.ts'),
    resolve(root, 'src/data/routesStubs.ts'),
  ]

  const raw = new Set()
  for (const file of files) {
    for (const n of extractRouteNumbers(file)) {
      raw.add(n)
    }
  }

  const display = new Set()
  for (const number of raw) {
    if (EXCLUDED.has(number)) continue
    display.add(toRoutePageId(number, raw))
  }

  return [...display].sort(compareRouteNumber)
}

/** 展示编号改名：如 21A → 21 */
export function getSimpleDisplayRenames() {
  return Object.entries(DISPLAY_ONLY_RENAMES)
}

export function getPreservedRoutePagePaths(displayId, routesDir) {
  const paths = [
    resolve(routesDir, `${routeIdToPageFilename(displayId)}.html`),
  ]
  for (const [alias, base] of getSimpleDisplayRenames()) {
    if (base === displayId || alias === displayId) {
      paths.push(resolve(routesDir, `${routeIdToPageFilename(alias)}.html`))
    }
  }
  return paths
}
