import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractRoutePageDataFromHtml } from './lib/extract-route-page-data.mjs'
import { readRoutePageStopName } from './lib/normalize-route-page-stop.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const routesDir = resolve(root, 'routes')
const secretRoutesPath = resolve(root, 'data', 'secret-routes.json')
const outputPath = resolve(root, 'data', 'route-detail-stops.json')

function nameKey(name) {
  return `${(name?.zh ?? '').trim()}|${(name?.en ?? '').trim()}`.toLowerCase()
}

function pushStop(name, byKey, merged) {
  const zh = (name?.zh ?? '').trim()
  const en = (name?.en ?? '').trim()
  if (!zh && !en) return
  const key = nameKey({ zh, en })
  if (byKey.has(key)) return
  byKey.set(key, { zh: zh || en, en: en || zh })
  merged.push({ name: { zh: zh || en, en: en || zh } })
}

function collectFromPageData(pageData, byKey, merged) {
  for (const group of pageData?.stops ?? []) {
    for (const stop of group?.list ?? []) {
      const name = readRoutePageStopName(stop)
      if (!name) continue
      pushStop(name, byKey, merged)
    }
  }
}

export function buildRouteDetailStops() {
  const byKey = new Map()
  const merged = []
  let routeCount = 0

  if (existsSync(routesDir)) {
    for (const entry of readdirSync(routesDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue
      const html = readFileSync(join(routesDir, entry.name), 'utf8')
      const pageData = extractRoutePageDataFromHtml(html)
      if (!pageData?.stops?.length) continue
      routeCount += 1
      collectFromPageData(pageData, byKey, merged)
    }
  }

  if (existsSync(secretRoutesPath)) {
    const secretRoutes = JSON.parse(readFileSync(secretRoutesPath, 'utf8'))
    if (Array.isArray(secretRoutes)) {
      for (const route of secretRoutes) {
        if (!route?.stops?.length) continue
        routeCount += 1
        collectFromPageData(route, byKey, merged)
      }
    }
  }

  merged.sort((a, b) => {
    const aLabel = a.name.zh || a.name.en
    const bLabel = b.name.zh || b.name.en
    return aLabel.localeCompare(bLabel, 'zh-Hant')
  })

  const out = {
    kind: 'route-detail-stop-catalog',
    note:
      'Unique stop names from routes/*.html detail pages and data/secret-routes.json (all directions).',
    stops: merged,
  }

  writeFileSync(outputPath, `${JSON.stringify(out, null, 2)}\n`)
  return { stopCount: merged.length, routeCount, outputPath }
}

const isMain = process.argv[1]?.endsWith('build-route-detail-stops.mjs')
if (isMain) {
  const result = buildRouteDetailStops()
  console.log(
    `[route-detail-stops] ${result.stopCount} stops from ${result.routeCount} route sources → ${result.outputPath}`,
  )
}
