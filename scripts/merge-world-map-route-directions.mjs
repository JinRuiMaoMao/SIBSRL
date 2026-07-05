import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(fileURLToPath(import.meta.url), '..', '..')

const files = [
  {
    label: 'Long Island → Rainbow (dir 0)',
    src: 'C:/Users/Jinrui/Downloads/N171(Long Island-Rainbow).json',
  },
  {
    label: 'Rainbow → Long Island (dir 1)',
    src: 'C:/Users/Jinrui/Downloads/N171.json',
  },
]

const byIndex = new Map()

for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(file.src, 'utf8'))
  const direction = raw.directions?.[0]
  if (!direction || typeof direction.directionIndex !== 'number') {
    throw new Error(`Missing direction in ${file.src}`)
  }
  byIndex.set(direction.directionIndex, direction)
  console.log(`loaded dir ${direction.directionIndex}: ${file.label}`)
}

const merged = {
  routeId: 'N171',
  note: 'Route on SIMapGerenal (normalized 0–1). Direction 0: Long Island → Rainbow; direction 1: Rainbow → Long Island.',
  directions: [...byIndex.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, entry]) => entry),
}

const outDir = path.join(root, 'data/world-map-routes')
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'N171.json')
fs.writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')
console.log(`wrote ${outPath} (${merged.directions.length} directions)`)
