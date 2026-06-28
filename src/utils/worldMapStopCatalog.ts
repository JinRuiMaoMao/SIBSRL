import type { WorldMapPoint } from '../data/worldMapRoutes'

export interface WorldMapCatalogStop {
  name: { zh: string; en: string }
  point: WorldMapPoint
}

let catalogCache: WorldMapCatalogStop[] | null = null

export async function loadWorldMapStopCatalog(): Promise<WorldMapCatalogStop[]> {
  if (catalogCache) return catalogCache
  const response = await fetch('./world-map-stops.json', { cache: 'force-cache' })
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
