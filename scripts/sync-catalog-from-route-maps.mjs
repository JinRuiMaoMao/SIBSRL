import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const catalogPath = resolve(root, 'data', 'world-map-stops.json')
const routesDir = resolve(root, 'data', 'world-map-routes')

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))
const merged = []
const seen = new Set()

function pointKey(stop) {
  return `${(stop.name.zh || '').trim()}|${(stop.name.en || '').trim()}|${stop.point[0].toFixed(3)}|${stop.point[1].toFixed(3)}`.toLowerCase()
}

function pushStop(raw) {
  const zh = (raw.name?.zh ?? raw.chi_name ?? '').trim()
  const en = (raw.name?.en ?? raw.eng_name ?? '').trim()
  const point = raw.point ?? (raw.x != null && raw.y != null ? [raw.x, raw.y] : null)
  if (!point || point.length !== 2) return
  if (typeof point[0] !== 'number' || typeof point[1] !== 'number') return

  const entry = { name: { zh: zh || en, en: en || zh }, point: [point[0], point[1]] }
  const key = pointKey(entry)
  if (seen.has(key)) return
  seen.add(key)
  merged.push(entry)
}

for (const stop of catalog.stops) pushStop({ name: stop.name, point: stop.point })

for (const file of readdirSync(routesDir).filter((name) => name.endsWith('.json'))) {
  const data = JSON.parse(readFileSync(resolve(routesDir, file), 'utf8'))
  for (const direction of data.directions ?? []) {
    for (const stop of direction.stops ?? []) pushStop(stop)
    for (const line of direction.lines ?? []) {
      for (const node of line.nodes ?? []) {
        if (node.type !== 'stop') continue
        pushStop(node)
      }
    }
  }
}

const DEDUPE_NAME_DISTANCE = 0.002
const byName = new Map()
for (const stop of merged) {
  const nameKey = `${stop.name.zh}|${stop.name.en}`.toLowerCase()
  const bucket = byName.get(nameKey) ?? []
  bucket.push(stop)
  byName.set(nameKey, bucket)
}

const deduped = []
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
  deduped.push(...kept)
}

merged.length = 0
seen.clear()
for (const stop of deduped) {
  const key = pointKey(stop)
  seen.add(key)
  merged.push(stop)
}

merged.sort((a, b) => {
  const aLabel = a.name.zh || a.name.en
  const bLabel = b.name.zh || b.name.en
  return aLabel.localeCompare(bLabel, 'zh-Hant')
})

const out = {
  kind: 'world-map-stop-catalog',
  note: 'All-stop catalog on SIMap (normalized 0–1). Includes All Stations export plus coordinates from world-map-routes.',
  stops: merged,
}

writeFileSync(catalogPath, `${JSON.stringify(out, null, 2)}\n`)
console.log(`[sync-catalog-from-route-maps] ${merged.length} stops → ${catalogPath}`)
