/**
 * List wiki page IDs needed for placeholder routes.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const STUBS_FILE = resolve('src/data/routesStubs.ts')
const ROUTE_MERGE = readFileSync(resolve('src/utils/routeMerge.ts'), 'utf8')

// Minimal copy of merge helpers (avoid ts import)
const EXACT_MERGE = {}
for (const m of ROUTE_MERGE.matchAll(/'([^']+)':\s*\{\s*base:\s*'([^']+)'/g)) {
  EXACT_MERGE[m[1]] = m[2]
}
const standaloneBlock = ROUTE_MERGE.match(/STANDALONE_ROUTE_NUMBERS = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? ''
const STANDALONE = new Set([...standaloneBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]))

function toBase(n) {
  if (EXACT_MERGE[n]) return EXACT_MERGE[n]
  if (STANDALONE.has(n)) return n
  if (/(?<=[0-9Y])[NSEW]$/i.test(n)) return n.slice(0, -1)
  return n
}

const stubSrc = readFileSync(STUBS_FILE, 'utf8')
const nums = [...stubSrc.matchAll(/'([^']+)'/g)]
  .map((m) => m[1])
  .filter((s) => /^[\dA-Z]/.test(s) && s.length <= 12)

const bases = [...new Set(nums.map(toBase))].sort()
console.log('Bases:', bases.join(', '))
console.log('Count:', bases.length)
