import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const catalogPath = resolve(root, 'data', 'world-map-stops.json')
const routesDir = resolve(root, 'data', 'world-map-routes')
const allStationsPath = resolve(root, 'data', 'all-stations.json')

const priorCatalog = JSON.parse(readFileSync(catalogPath, 'utf8'))

const nameKey = (stop) =>
  `${(stop.name?.zh ?? stop.chi_name ?? '').trim()}|${(stop.name?.en ?? stop.eng_name ?? '').trim()}`.toLowerCase()

function pointKey(stop) {
  return `${(stop.name.zh || '').trim()}|${(stop.name.en || '').trim()}|${stop.point[0].toFixed(3)}|${stop.point[1].toFixed(3)}`.toLowerCase()
}

function normalizeStop(raw) {
  const zh = (raw.name?.zh ?? raw.chi_name ?? '').trim()
  const en = (raw.name?.en ?? raw.eng_name ?? '').trim()
  const point = raw.point ?? (raw.x != null && raw.y != null ? [raw.x, raw.y] : null)
  if (!point || point.length !== 2) return null
  if (typeof point[0] !== 'number' || typeof point[1] !== 'number') return null
  return { name: { zh: zh || en, en: en || zh }, point: [point[0], point[1]] }
}

const allStations = existsSync(allStationsPath)
  ? JSON.parse(readFileSync(allStationsPath, 'utf8')).directions?.[0]?.stops ?? []
  : []

const allNameKeys = new Set(allStations.map((stop) => nameKey(stop)))
const merged = []
const seen = new Set()

function pushStop(raw) {
  const entry = normalizeStop(raw)
  if (!entry) return
  const key = pointKey(entry)
  if (seen.has(key)) return
  seen.add(key)
  merged.push(entry)
}

for (const stop of allStations) pushStop(stop)

const supplementalCandidates = []

for (const stop of priorCatalog.stops) {
  if (allNameKeys.has(nameKey(stop))) continue
  supplementalCandidates.push(normalizeStop({ name: stop.name, point: stop.point }))
}

for (const file of readdirSync(routesDir).filter((name) => name.endsWith('.json'))) {
  const data = JSON.parse(readFileSync(resolve(routesDir, file), 'utf8'))
  for (const direction of data.directions ?? []) {
    for (const stop of direction.stops ?? []) {
      if (allNameKeys.has(nameKey(stop))) continue
      supplementalCandidates.push(normalizeStop(stop))
    }
    for (const line of direction.lines ?? []) {
      for (const node of line.nodes ?? []) {
        if (node.type !== 'stop') continue
        if (allNameKeys.has(nameKey(node))) continue
        supplementalCandidates.push(normalizeStop(node))
      }
    }
  }
}

const DEDUPE_NAME_DISTANCE = 0.002
const byName = new Map()
for (const entry of supplementalCandidates) {
  if (!entry) continue
  const key = nameKey(entry)
  const bucket = byName.get(key) ?? []
  bucket.push(entry)
  byName.set(key, bucket)
}

for (const bucket of byName.values()) {
  const kept = []
  for (const stop of bucket) {
    const near = kept.find(
      (entry) =>
        Math.hypot(entry.point[0] - stop.point[0], entry.point[1] - stop.point[1]) <
        DEDUPE_NAME_DISTANCE,
    )
    if (!near) kept.push(stop)
  }
  for (const stop of kept) pushStop(stop)
}

merged.sort((a, b) => {
  const aLabel = a.name.zh || a.name.en
  const bLabel = b.name.zh || b.name.en
  return aLabel.localeCompare(bLabel, 'zh-Hant')
})

const out = {
  kind: 'world-map-stop-catalog',
  note:
    'All-stop catalog on SIMap (normalized 0–1). Names in data/all-stations.json keep export coordinates only; route maps add coords for other names.',
  stops: merged,
}

writeFileSync(catalogPath, `${JSON.stringify(out, null, 2)}\n`)
console.log(`[sync-catalog-from-route-maps] ${merged.length} stops → ${catalogPath}`)
