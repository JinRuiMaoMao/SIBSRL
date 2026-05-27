/**
 * Remove placeholder routes whose merge-base already has real stop data.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROUTE_MERGE = readFileSync(resolve('src/utils/routeMerge.ts'), 'utf8')
const STUBS_FILE = resolve('src/data/routesStubs.ts')
const ROUTES_FILE = resolve('src/data/routes.ts')
const SIBS_FILE = resolve('src/data/routesSibsTypes.ts')

const EXACT_MERGE_BASE = {}
for (const m of ROUTE_MERGE.matchAll(/'([^']+)':\s*\{\s*base:\s*'([^']+)'/g)) {
  EXACT_MERGE_BASE[m[1]] = m[2]
}
const STANDALONE = new Set(
  [...(ROUTE_MERGE.match(/STANDALONE_ROUTE_NUMBERS = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? '').matchAll(
    /'([^']+)'/g,
  )].map((m) => m[1]),
)

function toBase(n) {
  if (EXACT_MERGE_BASE[n]) return EXACT_MERGE_BASE[n]
  if (STANDALONE.has(n)) return n
  if (/(?<=[0-9Y])[NSEW]$/i.test(n)) return n.slice(0, -1)
  return n
}

function hasRealStops(route) {
  if (!route.stops?.length) return false
  const total = route.stops.reduce((n, d) => n + d.list.length, 0)
  if (total < 3) return false
  const pending = /pending|\u5f85\u8865\u5145/i
  return !route.stops.some((d) =>
    d.list.some((s) => pending.test(s.name?.zh ?? '') || pending.test(s.name?.en ?? '')),
  )
}

function loadRoutesFromTs(file, exportName) {
  const src = readFileSync(file, 'utf8')
  const routes = []
  const idRe = /\bid:\s*'([^']+)'/g
  const stopsRe = /stops:\s*\[/g
  let m
  while ((m = idRe.exec(src))) {
    const id = m[1]
    const slice = src.slice(m.index, m.index + 12000)
    const hasStops = stopsRe.test(slice)
    routes.push({ id, number: id, hasStops })
  }
  return routes
}

/** Parse emitted routes from routesSibsTypes (full objects) */
function loadSibsRoutes() {
  const src = readFileSync(SIBS_FILE, 'utf8')
  const routes = []
  const blocks = src.split(/\n  \{\n    id:/).slice(1)
  for (const block of blocks) {
    const id = block.match(/^ '([^']+)'/)?.[1]
    if (!id) continue
    const hasStops = block.includes('stops: [') && block.includes('list: [')
    const pending = /pending|\u5f85\u8865\u5145/i.test(block)
    routes.push({ id, number: id, hasReal: hasStops && !pending })
  }
  return routes
}

const stubSrc = readFileSync(STUBS_FILE, 'utf8')
const block = stubSrc.match(/GAME_ROUTE_PLACEHOLDER_NUMBERS = \[([\s\S]*?)\]/)?.[1] ?? ''
const placeholders = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1])

const routesTs = readFileSync(ROUTES_FILE, 'utf8')
const coveredBases = new Set()
for (const m of routesTs.matchAll(/\bid:\s*'([^']+)'[\s\S]*?stops:\s*\[/g)) {
  const id = m[1]
  const chunk = m[0]
  if (chunk.includes('list: [') && !/\u5f85\u8865\u5145|pending/i.test(chunk)) {
    coveredBases.add(toBase(id))
  }
}

for (const r of loadSibsRoutes()) {
  if (r.hasReal) coveredBases.add(toBase(r.id))
}

const keep = placeholders.filter((p) => !coveredBases.has(toBase(p)))
const remove = placeholders.filter((p) => coveredBases.has(toBase(p)))

console.log('Covered bases:', [...coveredBases].sort().join(', '))
console.log('Remove', remove.length, ':', remove.join(', '))
console.log('Keep', keep.length, ':', keep.join(', '))

const createFn = stubSrc.slice(0, stubSrc.indexOf('const GAME_ROUTE_PLACEHOLDER'))
const footer = stubSrc.slice(stubSrc.indexOf('export const routesStubs'))

const nums = keep.map((n) => `  '${n}',`).join('\n')
const newFile = `${createFn}const GAME_ROUTE_PLACEHOLDER_NUMBERS = [\n${nums}\n] as const

/** Wiki 未收录或尚无完整站序的游戏内线路占位 */
${footer}`
writeFileSync(STUBS_FILE, newFile)
console.log('Updated', STUBS_FILE)
