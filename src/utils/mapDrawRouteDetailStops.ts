export type MapDrawRouteDetailStopName = { zh: string; en: string }

let routeDetailStopsCache: MapDrawRouteDetailStopName[] | null = null

export async function loadAllRouteDetailStopNames(): Promise<MapDrawRouteDetailStopName[]> {
  if (routeDetailStopsCache) return routeDetailStopsCache

  const response = await fetch(`./route-detail-stops.json?v=${encodeURIComponent(__APP_BUILD__)}`, {
    cache: 'no-cache',
  })
  if (!response.ok) {
    throw new Error(`Failed to load route-detail-stops.json (${response.status})`)
  }

  const raw: unknown = await response.json()
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { stops?: unknown }).stops)) {
    throw new Error('Invalid route-detail-stops.json catalog')
  }

  const stops: MapDrawRouteDetailStopName[] = []
  for (const entry of (raw as { stops: unknown[] }).stops) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as { name?: { zh?: string; en?: string } }
    const zh = typeof record.name?.zh === 'string' ? record.name.zh.trim() : ''
    const en = typeof record.name?.en === 'string' ? record.name.en.trim() : ''
    if (!zh && !en) continue
    stops.push({ zh: zh || en, en: en || zh })
  }

  routeDetailStopsCache = stops
  return stops
}
