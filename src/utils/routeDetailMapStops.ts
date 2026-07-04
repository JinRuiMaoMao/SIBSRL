import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { RouteStop } from '../types/route'
import type { WorldMapDrawStop } from '../types/worldMapDraw'
import { findMapDrawCatalogLocationsForName } from './worldMapDrawRouteLookup'
import type { WorldMapCatalogStop } from './worldMapStopCatalog'

export interface RouteDetailMapStop {
  id: string
  seq: number
  stop: RouteStop
  point: WorldMapPoint
}

export function buildRouteDetailMapStops(
  stops: readonly RouteStop[],
  catalog: readonly WorldMapCatalogStop[],
): RouteDetailMapStop[] {
  const mapped: RouteDetailMapStop[] = []

  for (let index = 0; index < stops.length; index += 1) {
    const stop = stops[index]!
    const locations = findMapDrawCatalogLocationsForName(stop.name.zh, stop.name.en, catalog)
    const point = locations[0]?.point
    if (!point) continue

    mapped.push({
      id: `route-detail-stop-${index}`,
      seq: index + 1,
      stop,
      point,
    })
  }

  return mapped
}

export function routeDetailMapStopToDrawStop(stop: RouteDetailMapStop): WorldMapDrawStop {
  return {
    id: stop.id,
    point: stop.point,
    name: { zh: stop.stop.name.zh, en: stop.stop.name.en },
    seq: stop.seq,
  }
}
