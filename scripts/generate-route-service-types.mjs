/**
 * Parses data/SIBS类型.txt and writes src/data/routeServiceTypes.generated.ts
 * Run: node scripts/generate-route-service-types.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'data', 'SIBS类型.txt'), 'utf8')

const TYPE_MAP = {
  通宵: 'night',
  观光: 'sightseeing',
  活动: 'event',
  节日: 'festival',
  工作人员接驳: 'staffShuttle',
  大学: 'university',
  特快: 'peakExpress',
  半直通: 'semiDirect',
  循环: 'loop',
  特别班次: 'specialDeparture',
  体育场: 'stadium',
}

/** @param {string} raw */
function normalizeRouteId(raw) {
  let s = raw.trim()
  if (!s) return null
  // Strip trailing direction pairs and single direction letters
  s = s.replace(/W\/E$/i, '').replace(/N\/S$/i, '')
  s = s.replace(/(?:W|E|N|S)$/i, '')
  return s || null
}

/** @type {Map<string, Set<string>>} */
const byRoute = new Map()

for (const line of source.split(/\r?\n/)) {
  const m = line.match(/^([^：:]+)[：:](.+)$/)
  if (!m) continue
  const typeKey = TYPE_MAP[m[1].trim()]
  if (!typeKey) {
    console.warn('Unknown type:', m[1])
    continue
  }
  const tokens = m[2].split(/[,，、\s]+/).filter(Boolean)
  for (const token of tokens) {
    const id = normalizeRouteId(token)
    if (!id) continue
    if (!byRoute.has(id)) byRoute.set(id, new Set())
    byRoute.get(id).add(typeKey)
  }
}

const ORDER = [
  'night',
  'sightseeing',
  'event',
  'festival',
  'staffShuttle',
  'university',
  'peakExpress',
  'semiDirect',
  'loop',
  'specialDeparture',
  'stadium',
]

const sortedIds = [...byRoute.keys()].sort((a, b) => {
  const na = a.match(/^(\d+)(.*)$/)
  const nb = b.match(/^(\d+)(.*)$/)
  if (na && nb) {
    const d = parseInt(na[1], 10) - parseInt(nb[1], 10)
    if (d !== 0) return d
    return na[2].localeCompare(nb[2])
  }
  return a.localeCompare(b)
})

let out = `/** Auto-generated from data/SIBS类型.txt — run: node scripts/generate-route-service-types.mjs */\nimport type { RouteServiceType } from '../types/route'\n\nexport const ROUTE_SERVICE_TYPE_MAP: Record<string, RouteServiceType[]> = {\n`

for (const id of sortedIds) {
  const types = [...byRoute.get(id)].sort(
    (a, b) => ORDER.indexOf(a) - ORDER.indexOf(b),
  )
  out += `  '${id.replace(/'/g, "\\'")}': [${types.map((t) => `'${t}'`).join(', ')}],\n`
}

out += `}\n\nexport const ROUTE_SERVICE_TYPE_ORDER: RouteServiceType[] = ${JSON.stringify(ORDER)}\n`

writeFileSync(join(root, 'src', 'data', 'routeServiceTypes.generated.ts'), out, 'utf8')
console.log(`Wrote ${sortedIds.length} route entries to routeServiceTypes.generated.ts`)
