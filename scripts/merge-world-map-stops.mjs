import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const allPath = process.argv[2]
const catalogPath = resolve(root, 'data', 'world-map-stops.json')

if (!allPath) {
  console.error('Usage: node scripts/merge-world-map-stops.mjs <All Stations.json>')
  process.exit(1)
}

const all = JSON.parse(readFileSync(allPath, 'utf8'))
const cat = JSON.parse(readFileSync(catalogPath, 'utf8'))
const allStops = all.directions?.[0]?.stops
if (!Array.isArray(allStops)) {
  console.error('Invalid All Stations JSON: missing directions[0].stops')
  process.exit(1)
}

const pointKey = (stop) =>
  `${(stop.name.zh || '').trim()}|${(stop.name.en || '').trim()}|${stop.point[0].toFixed(3)}|${stop.point[1].toFixed(3)}`.toLowerCase()
const nameKey = (stop) =>
  `${(stop.name.zh || '').trim()}|${(stop.name.en || '').trim()}`.toLowerCase()

const merged = []
const seen = new Set()

function pushStop(stop) {
  const entry = {
    name: { zh: (stop.name.zh || '').trim(), en: (stop.name.en || '').trim() },
    point: [stop.point[0], stop.point[1]],
  }
  if (!entry.name.zh && !entry.name.en) return
  const key = pointKey(entry)
  if (seen.has(key)) return
  seen.add(key)
  merged.push(entry)
}

for (const stop of allStops) pushStop(stop)

for (const stop of cat.stops) {
  const inAll = allStops.some((candidate) => nameKey(candidate) === nameKey(stop))
  if (inAll) continue
  const samePoint = merged.some(
    (entry) =>
      entry.point[0].toFixed(3) === stop.point[0].toFixed(3) &&
      entry.point[1].toFixed(3) === stop.point[1].toFixed(3) &&
      (entry.name.en.toLowerCase() === (stop.name.en || '').trim().toLowerCase() ||
        entry.name.zh.toLowerCase() === (stop.name.zh || '').trim().toLowerCase()),
  )
  if (samePoint) continue
  pushStop(stop)
}

merged.sort((a, b) => {
  const aLabel = a.name.zh || a.name.en
  const bLabel = b.name.zh || b.name.en
  return aLabel.localeCompare(bLabel, 'zh-Hant')
})

const out = {
  kind: 'world-map-stop-catalog',
  note: 'All-stop catalog on SIMap (normalized 0–1). Merged partial stations/termini from All Stations export.',
  stops: merged,
}

writeFileSync(catalogPath, `${JSON.stringify(out, null, 2)}\n`)
console.log(`[merge-world-map-stops] ${merged.length} stops → ${catalogPath}`)
