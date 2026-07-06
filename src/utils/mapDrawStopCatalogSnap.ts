import type { RouteEditorNode } from '../routeEditor/types'
import { normalizedToPixel } from '../routeEditor/routeEditorBridge'
import { getDirectionKey } from './routeDirectionCore'
import {
  findBusRouteForDraw,
  findDrawRouteStopSeq,
  findMapDrawCatalogLocationsForName,
  resolveMapDrawAutoPlacePoint,
} from './worldMapDrawRouteLookup'
import type { WorldMapCatalogStop } from './worldMapStopCatalog'

export interface MapDrawCatalogSnapResult {
  moved: number
  seqUpdated: number
  skippedMulti: number
  missing: number
}

export interface MapDrawCatalogSnapUpdate {
  nodeId: number
  x: number
  y: number
  stopSeq?: number | null
}

const DIRECTION_INPUT_TO_KEY: Record<string, string> = {
  n: 'N',
  north: 'N',
  northbound: 'N',
  北: 'N',
  北行: 'N',
  s: 'S',
  south: 'S',
  southbound: 'S',
  南: 'S',
  南行: 'S',
  e: 'E',
  east: 'E',
  eastbound: 'E',
  东: 'E',
  东行: 'E',
  w: 'W',
  west: 'W',
  westbound: 'W',
  西: 'W',
  西行: 'W',
}

export function normalizeDrawDirectionKey(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  const mapped = DIRECTION_INPUT_TO_KEY[raw.toLowerCase()] ?? DIRECTION_INPUT_TO_KEY[raw]
  if (mapped) return mapped
  if (/^[NSEW]$/i.test(raw)) return raw.toUpperCase()
  return null
}

/** Split trailing direction suffix from route field, e.g. 473N → 473 + N. */
export function parseDrawRouteHeaderFields(
  routeInput: string,
  directionInput: string,
): { routeQuery: string; directionInput: string } {
  const route = routeInput.trim()
  const dir = directionInput.trim()
  if (dir || !route) return { routeQuery: route, directionInput: dir }

  const asciiMatch = route.match(/^(.+?)([NSEW])$/i)
  if (asciiMatch) {
    return { routeQuery: asciiMatch[1]!.trim(), directionInput: asciiMatch[2]!.toUpperCase() }
  }

  const zhMatch = route.match(/^(.+?)(北|南|东|西)$/)
  if (zhMatch) {
    return { routeQuery: zhMatch[1]!.trim(), directionInput: zhMatch[2]! }
  }

  return { routeQuery: route, directionInput: dir }
}

/** Resolve direction field to `route.stops` data index for stop lists / stopSeq. */
export function resolveDrawDirectionDataIndex(routeQuery: string, directionInput: string): number {
  const { routeQuery: parsedRoute, directionInput: parsedDir } = parseDrawRouteHeaderFields(
    routeQuery,
    directionInput,
  )
  const route = findBusRouteForDraw(parsedRoute)
  const raw = parsedDir.trim()

  if (!route) {
    if (/^\d+$/.test(raw)) return Math.max(0, Number.parseInt(raw, 10))
    return 0
  }

  const stopCount = route.stops?.length ?? 0
  if (stopCount <= 1) return 0

  if (/^\d+$/.test(raw)) {
    const n = Number.parseInt(raw, 10)
    if (n >= 0 && n < stopCount) return n
    return 0
  }

  const key = normalizeDrawDirectionKey(raw)
  if (key) {
    for (let index = 0; index < stopCount; index += 1) {
      if (getDirectionKey(route, index)?.toUpperCase() === key) return index
    }
  }

  return 0
}

export function canApplyMapDrawCatalogSnap(routeQuery: string, directionInput: string): boolean {
  const { routeQuery: route, directionInput: dir } = parseDrawRouteHeaderFields(routeQuery, directionInput)
  return Boolean(route || dir)
}

export function buildMapDrawCatalogSnapUpdates(
  nodes: readonly RouteEditorNode[],
  catalog: readonly WorldMapCatalogStop[] | null | undefined,
  routeQuery: string,
  directionInput: string,
  imageWidth: number,
  imageHeight: number,
): { result: MapDrawCatalogSnapResult; updates: MapDrawCatalogSnapUpdate[] } {
  const result: MapDrawCatalogSnapResult = {
    moved: 0,
    seqUpdated: 0,
    skippedMulti: 0,
    missing: 0,
  }
  const updates: MapDrawCatalogSnapUpdate[] = []

  if (!catalog?.length || imageWidth <= 0 || imageHeight <= 0) {
    return { result, updates }
  }
  if (!canApplyMapDrawCatalogSnap(routeQuery, directionInput)) {
    return { result, updates }
  }

  const { routeQuery: parsedRoute, directionInput: parsedDir } = parseDrawRouteHeaderFields(
    routeQuery,
    directionInput,
  )
  const directionDataIndex = resolveDrawDirectionDataIndex(parsedRoute, parsedDir)

  for (const node of nodes) {
    if (node.type !== 'stop') continue

    const zh = node.chi_name.trim()
    const eng = node.eng_name.trim()
    if (!zh && !eng) {
      result.missing += 1
      continue
    }

    const locations = findMapDrawCatalogLocationsForName(zh, eng, catalog)
    if (locations.length > 1) {
      result.skippedMulti += 1
      continue
    }

    const point = resolveMapDrawAutoPlacePoint(zh, eng, catalog)
    if (!point) {
      result.missing += 1
      continue
    }

    const pixel = normalizedToPixel(point, imageWidth, imageHeight)
    const update: MapDrawCatalogSnapUpdate = { nodeId: node.id, x: pixel.x, y: pixel.y }

    if (Math.abs(node.x - pixel.x) > 0.5 || Math.abs(node.y - pixel.y) > 0.5) {
      result.moved += 1
    }

    if (parsedRoute.trim()) {
      const seq = findDrawRouteStopSeq(parsedRoute, directionDataIndex, zh, eng)
      if (seq != null && node.stopSeq !== seq) {
        update.stopSeq = seq
        result.seqUpdated += 1
      }
    }

    if (
      update.stopSeq !== undefined ||
      Math.abs(node.x - pixel.x) > 0.5 ||
      Math.abs(node.y - pixel.y) > 0.5
    ) {
      updates.push(update)
    }
  }

  return { result, updates }
}
