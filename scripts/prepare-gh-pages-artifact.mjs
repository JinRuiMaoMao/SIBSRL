import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const out = resolve(root, process.argv[2] ?? '_site')

const COPY_DIRS = ['assets', 'audio', 'maps', 'route-maps', 'routes']
const COPY_FILES = [
  'sw.js',
  '.nojekyll',
  'sibs-logo.png',
  'apple-touch-icon.png',
  'world-map-stops.json',
  'route-detail-stops.json',
]

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

for (const file of readdirSync(root)) {
  if (file.endsWith('.html')) {
    cpSync(join(root, file), join(out, file))
  }
}

for (const dir of COPY_DIRS) {
  const src = join(root, dir)
  if (existsSync(src)) {
    cpSync(src, join(out, dir), { recursive: true })
  }
}

for (const file of COPY_FILES) {
  const src = join(root, file)
  if (existsSync(src)) {
    cpSync(src, join(out, file))
  }
}

console.log(`[gh-pages] artifact prepared → ${out}`)
