import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { RouteStop } from '../types/route'
import type { WorldMapDrawStop } from '../types/worldMapDraw'
import { findBusRouteForDraw } from './worldMapDrawRouteLookup'
import { rebuildDraftPathFromStops, straightTraceSegment } from './worldMapDrawPath'
import type { WorldMapVirtualNode } from '../types/worldMapDraw'
import { loadWorldMapStopCatalog, type WorldMapCatalogStop } from './worldMapStopCatalog'

function namesMatch(a: { zh: string; en: string }, b: { zh: string; en: string }): boolean {
  const zhA = (a.zh ?? '').trim()
  const zhB = (b.zh ?? '').trim()
  const enA = (a.en ?? '').trim().toLowerCase()
  const enB = (b.en ?? '').trim().toLowerCase()
  if (zhA && zhB && zhA === zhB) return true
  if (enA && enB && enA === enB) return true
  return false
}

function dist(a: WorldMapPoint, b: WorldMapPoint): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

function pickClosest(
  candidates: readonly WorldMapCatalogStop[],
  prevPoint: WorldMapPoint | null,
): WorldMapCatalogStop {
  if (!prevPoint || candidates.length === 1) return candidates[0]!
  return candidates.reduce((best, entry) =>
    dist(entry.point, prevPoint) < dist(best.point, prevPoint) ? entry : best,
  )
}

function resolveRouteStopsFromCatalog(
  catalogStops: readonly WorldMapCatalogStop[],
  routeStops: readonly RouteStop[],
  snap: (point: WorldMapPoint) => WorldMapPoint,
): { stops: WorldMapDrawStop[]; estimatedCount: number } {
  let prevPoint: WorldMapPoint | null = null
  const stops: WorldMapDrawStop[] = []
  let estimatedCount = 0

  for (let stopIndex = 0; stopIndex < routeStops.length; stopIndex += 1) {
    const stop = routeStops[stopIndex]!
    const candidates = catalogStops.filter((entry) => namesMatch(entry.name, stop.name))

    if (candidates.length === 0) {
      const nextStop = routeStops[stopIndex + 1]
      const nextCandidates = nextStop
        ? catalogStops.filter((entry) => namesMatch(entry.name, nextStop.name))
        : []
      const nextPoint =
        nextCandidates.length > 0 ? pickClosest(nextCandidates, prevPoint).point : prevPoint
      const estimate: WorldMapPoint =
        prevPoint && nextPoint
          ? [(prevPoint[0] + nextPoint[0]) / 2, (prevPoint[1] + nextPoint[1]) / 2]
          : (prevPoint ?? [0.5, 0.5])
      const snapped = snap(estimate)
      stops.push({
        id: `gen-${stopIndex}-${Math.random().toString(36).slice(2, 8)}`,
        name: { zh: stop.name.zh || stop.name.en, en: stop.name.en || stop.name.zh },
        point: snapped,
      })
      prevPoint = snapped
      estimatedCount += 1
      continue
    }

    const pick = pickClosest(candidates, prevPoint)
    const point = snap(pick.point)
    stops.push({
      id: `gen-${stopIndex}-${Math.random().toString(36).slice(2, 8)}`,
      name: { zh: stop.name.zh || stop.name.en, en: stop.name.en || stop.name.zh },
      point,
    })
    prevPoint = point
  }

  return { stops, estimatedCount }
}

function mergeExistingStopPositions(
  routeStops: readonly RouteStop[],
  existingStops: readonly WorldMapDrawStop[],
  snap: (point: WorldMapPoint) => WorldMapPoint,
): WorldMapDrawStop[] {
    return routeStops.map((routeStop, stopIndex) => {
    const existing = existingStops[stopIndex]
    return {
      id: existing?.id ?? `gen-${stopIndex}-${Math.random().toString(36).slice(2, 8)}`,
      name: existing
        ? { ...existing.name }
        : {
            zh: routeStop.name.zh || routeStop.name.en,
            en: routeStop.name.en || routeStop.name.zh,
          },
      point: snap(existing?.point ?? [0.5, 0.5]),
    }
  })
}

function findBusRouteForGenerate(routeQuery: string) {
  return findBusRouteForDraw(routeQuery)
}

export interface GenerateWorldMapRouteDraftOptions {
  routeId: string
  directionIndex: number
  existingStops?: readonly WorldMapDrawStop[]
  virtualNodes?: readonly WorldMapVirtualNode[]
  snap: (point: WorldMapPoint) => WorldMapPoint
  catalogStops?: readonly WorldMapCatalogStop[]
}

export interface GenerateWorldMapRouteDraftResult {
  stops: WorldMapDrawStop[]
  points: WorldMapPoint[]
  estimatedCount: number
}

export async function generateWorldMapRouteDraft(
  options: GenerateWorldMapRouteDraftOptions,
): Promise<GenerateWorldMapRouteDraftResult | null> {
  const trimmedRouteId = options.routeId.trim()
  if (!trimmedRouteId) return null

  const route = findBusRouteForGenerate(trimmedRouteId)

  let stops: WorldMapDrawStop[]
  let estimatedCount = 0

  const routeStopList =
    route?.stops?.[options.directionIndex]?.list ?? route?.stops?.[0]?.list ?? null
  const existing = options.existingStops ?? []

  if (routeStopList?.length) {
    if (existing.length === routeStopList.length) {
      stops = mergeExistingStopPositions(routeStopList, existing, options.snap)
    } else {
      const catalog = options.catalogStops ?? (await loadWorldMapStopCatalog())
      const resolved = resolveRouteStopsFromCatalog(catalog, routeStopList, options.snap)
      stops = resolved.stops
      estimatedCount = resolved.estimatedCount
    }
  } else if (existing.length >= 2) {
    stops = existing.map((stop) => ({
      ...stop,
      point: options.snap([stop.point[0], stop.point[1]]),
    }))
  } else {
    return null
  }

  const points = rebuildDraftPathFromStops(
    stops,
    straightTraceSegment,
    options.virtualNodes ?? [],
    trimmedRouteId,
  )
  if (points.length < 2) return null

  return { stops, points, estimatedCount }
}
