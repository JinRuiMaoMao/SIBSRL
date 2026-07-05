import { fetchRouteMapImport } from '../api/userApi'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import { getWorldMapRoutePoints } from '../data/worldMapRoutes'
import { sibsImportToRouteEditorLine } from '../routeEditor/routeEditorBridge'
import { sampleRouteEditorPathPoints } from '../routeEditor/routeEditorPath'
import {
  clearCachedRouteMapImport,
  readCachedRouteMapImport,
} from '../storage/routeMapImportCache'
import type { RouteStop } from '../types/route'
import type { WorldMapDrawStop } from '../types/worldMapDraw'
import {
  buildRouteDetailMapStops,
  type RouteDetailMapStop,
} from './routeDetailMapStops'
import { isRouteMapImportStorage } from './routeMapImportBundle'
import { parseRouteMapImportPayload, type RouteMapImportPayload } from './routeMapImportPayload'
import { resolveRouteMapLookupIds } from './routeMapLookup'
import type { WorldMapCatalogStop } from './worldMapStopCatalog'
import { buildRouteMapViewerDisplay, type RouteMapViewerDisplay } from './routeMapViewerDisplay'

export interface RouteMapOverlaySource {
  points: readonly WorldMapPoint[]
  stops: readonly RouteDetailMapStop[]
  source: 'import' | 'world-map'
}

let generalMapSizeCache: { width: number; height: number } | null = null
let generalMapSizePromise: Promise<{ width: number; height: number } | null> | null = null

export async function loadGeneralMapImageSize(): Promise<{ width: number; height: number } | null> {
  if (generalMapSizeCache) return generalMapSizeCache
  if (generalMapSizePromise) return generalMapSizePromise

  generalMapSizePromise = new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        generalMapSizeCache = { width: img.naturalWidth, height: img.naturalHeight }
        resolve(generalMapSizeCache)
        return
      }
      resolve(null)
    }
    img.onerror = () => resolve(null)
    img.src = './maps/SIMapGerenal.png'
  })

  return generalMapSizePromise
}

export async function resolveRouteMapImportRaw(routeId: string): Promise<unknown | null> {
  for (const id of resolveRouteMapLookupIds(routeId)) {
    const response = await fetchRouteMapImport(id)
    if (response?.payload && isRouteMapImportStorage(response.payload)) {
      return response.payload
    }
  }

  for (const id of resolveRouteMapLookupIds(routeId)) {
    try {
      const response = await fetch(`./world-map-routes/${encodeURIComponent(id)}.json`)
      if (!response.ok) continue
      const raw: unknown = await response.json()
      if (isRouteMapImportStorage(raw)) return raw
    } catch {
      // offline / missing static bundle
    }
  }

  for (const id of resolveRouteMapLookupIds(routeId)) {
    const cached = readCachedRouteMapImport(id)
    if (cached && isRouteMapImportStorage(cached)) {
      return cached
    }
    if (cached) {
      clearCachedRouteMapImport(id)
    }
  }

  return null
}

export async function resolveRouteMapImportPayload(
  routeId: string,
  directionIndex: number,
): Promise<RouteMapImportPayload | null> {
  const raw = await resolveRouteMapImportRaw(routeId)
  if (!raw) return null
  return parseRouteMapImportPayload(raw, directionIndex)
}

export async function resolveImportedRouteMapDisplay(
  routeId: string,
  directionIndex: number,
  routeNumber: string,
  imageSize: { width: number; height: number } | null,
): Promise<RouteMapViewerDisplay | null> {
  const parsed = await resolveRouteMapImportPayload(routeId, directionIndex)
  if (!parsed || !imageSize || imageSize.width <= 0 || imageSize.height <= 0) return null

  return buildRouteMapViewerDisplay(parsed, imageSize.width, imageSize.height, routeNumber || parsed.routeId)
}

function drawStopToRouteDetailMapStop(stop: WorldMapDrawStop, index: number): RouteDetailMapStop {
  const routeStop: RouteStop = { name: stop.name }
  return {
    id: stop.id,
    seq: stop.seq != null ? stop.seq : index + 1,
    stop: routeStop,
    point: stop.point,
  }
}

export function buildRouteMapOverlayFromImport(
  parsed: RouteMapImportPayload,
  imageSize: { width: number; height: number } | null,
): { points: WorldMapPoint[]; stops: RouteDetailMapStop[] } {
  let points = [...parsed.points]

  if (imageSize && imageSize.width > 0 && imageSize.height > 0) {
    const editorImport = sibsImportToRouteEditorLine(parsed, imageSize.width, imageSize.height)
    if (editorImport?.line.segments.length) {
      const sampled = sampleRouteEditorPathPoints(
        editorImport.line,
        imageSize.width,
        imageSize.height,
        false,
      )
      if (sampled.length >= 2) {
        points = sampled
      }
    }
  }

  const stops = parsed.stops.map((stop, index) => drawStopToRouteDetailMapStop(stop, index))
  return { points, stops }
}

export async function resolveRouteMapOverlaySource(
  routeId: string,
  directionIndex: number,
  options: {
    catalog?: readonly WorldMapCatalogStop[]
    catalogStops?: readonly RouteStop[]
    imageSize?: { width: number; height: number } | null
  } = {},
): Promise<RouteMapOverlaySource | null> {
  const imageSize = options.imageSize ?? (await loadGeneralMapImageSize())
  const importPayload = await resolveRouteMapImportPayload(routeId, directionIndex)

  if (importPayload) {
    const built = buildRouteMapOverlayFromImport(importPayload, imageSize)
    if (built.points.length >= 2) {
      let stops = built.stops
      if (!stops.length && options.catalog && options.catalogStops?.length) {
        stops = buildRouteDetailMapStops(options.catalogStops, options.catalog)
      }
      return { points: built.points, stops, source: 'import' }
    }
  }

  const worldPoints = getWorldMapRoutePoints(routeId, directionIndex)
  if (!worldPoints || worldPoints.length < 2) return null

  let stops: RouteDetailMapStop[] = []
  if (options.catalog && options.catalogStops?.length) {
    stops = buildRouteDetailMapStops(options.catalogStops, options.catalog)
  }

  return { points: worldPoints, stops, source: 'world-map' }
}
