import type { WorldMapPoint } from '../data/worldMapRoutes'

export interface WorldMapCatalogStop {
  name: { zh: string; en: string }
  point: WorldMapPoint
}

export interface WorldMapCatalogStopInput {
  name: { zh: string; en: string }
  point: WorldMapPoint
}

let catalogCache: WorldMapCatalogStop[] | null = null

function catalogPointKey(stop: WorldMapCatalogStopInput): string {
  return `${stop.name.zh.trim()}|${stop.name.en.trim()}|${stop.point[0].toFixed(3)}|${stop.point[1].toFixed(3)}`.toLowerCase()
}

function normalizeCatalogStopInput(stop: WorldMapCatalogStopInput): WorldMapCatalogStop | null {
  const zh = stop.name.zh.trim()
  const en = stop.name.en.trim()
  if (!zh && !en) return null
  if (
    !Array.isArray(stop.point) ||
    stop.point.length !== 2 ||
    typeof stop.point[0] !== 'number' ||
    typeof stop.point[1] !== 'number'
  ) {
    return null
  }
  return {
    name: { zh: zh || en, en: en || zh },
    point: [stop.point[0], stop.point[1]],
  }
}

/** Merge imported stop coordinates into the in-memory catalog used for auto-placement. */
export function mergeWorldMapCatalogStops(
  base: readonly WorldMapCatalogStop[],
  additions: readonly WorldMapCatalogStopInput[],
): { catalog: WorldMapCatalogStop[]; added: number } {
  const catalog = [...base]
  const seen = new Set(catalog.map(catalogPointKey))
  let added = 0

  for (const raw of additions) {
    const stop = normalizeCatalogStopInput(raw)
    if (!stop) continue
    const key = catalogPointKey(stop)
    if (seen.has(key)) continue
    seen.add(key)
    catalog.push(stop)
    added += 1
  }

  catalogCache = catalog
  return { catalog, added }
}

export function invalidateWorldMapStopCatalogCache(): void {
  catalogCache = null
}

export async function loadWorldMapStopCatalog(): Promise<WorldMapCatalogStop[]> {
  if (catalogCache) return catalogCache
  const response = await fetch(`./world-map-stops.json?v=${encodeURIComponent(__APP_BUILD__)}`, {
    cache: 'no-cache',
  })
  if (!response.ok) {
    throw new Error(`Failed to load world-map-stops.json (${response.status})`)
  }
  const raw: unknown = await response.json()
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { stops?: unknown }).stops)) {
    throw new Error('Invalid world-map-stops.json catalog')
  }
  const stops: WorldMapCatalogStop[] = []
  for (const entry of (raw as { stops: unknown[] }).stops) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as { name?: { zh?: string; en?: string }; point?: unknown }
    const zh = typeof record.name?.zh === 'string' ? record.name.zh.trim() : ''
    const en = typeof record.name?.en === 'string' ? record.name.en.trim() : ''
    if (!zh && !en) continue
    if (
      !Array.isArray(record.point) ||
      record.point.length !== 2 ||
      typeof record.point[0] !== 'number' ||
      typeof record.point[1] !== 'number'
    ) {
      continue
    }
    stops.push({
      name: { zh: zh || en, en: en || zh },
      point: [record.point[0], record.point[1]],
    })
  }
  catalogCache = stops
  return stops
}
