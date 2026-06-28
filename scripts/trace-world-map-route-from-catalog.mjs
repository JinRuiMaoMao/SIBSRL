import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROUTE_21A_STOPS } from './lib/route21a-stops.mjs'
import {
  loadGeneralMapRoadSnapIndex,
  rebuildPathFromStopPoints,
  roundPoint,
} from './lib/general-map-road-snap.mjs'
import { WORLD_MAP_ROUTE_ALIASES } from './build-world-map-routes-manifest.mjs'

const root = resolve(fileURLToPath(import.meta.url), '..', '..')

const ROUTE_STOP_LISTS = {
  '21': ROUTE_21A_STOPS,
  '21A': ROUTE_21A_STOPS,
}

function namesMatch(a, b) {
  const zhA = (a.zh ?? '').trim()
  const zhB = (b.zh ?? '').trim()
  const enA = (a.en ?? '').trim().toLowerCase()
  const enB = (b.en ?? '').trim().toLowerCase()
  if (zhA && zhB && zhA === zhB) return true
  if (enA && enB && enA === enB) return true
  return false
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

function resolveRouteStops(catalogStops, routeStops, index) {
  let prevPoint = null
  const resolved = []

  for (let stopIndex = 0; stopIndex < routeStops.length; stopIndex += 1) {
    const stop = routeStops[stopIndex]
    const candidates = catalogStops.filter((entry) => namesMatch(entry.name, stop.name))

    if (candidates.length === 0) {
      const nextStop = routeStops[stopIndex + 1]
      const nextCandidates = nextStop
        ? catalogStops.filter((entry) => namesMatch(entry.name, nextStop.name))
        : []
      const nextPoint = nextCandidates.length > 0 ? pickClosest(nextCandidates, prevPoint).point : prevPoint
      const estimate =
        prevPoint && nextPoint
          ? [(prevPoint[0] + nextPoint[0]) / 2, (prevPoint[1] + nextPoint[1]) / 2]
          : prevPoint ?? [0.5, 0.5]
      const snapped = index.snap(estimate)
      console.warn(`[trace] 缺少 catalog 站点，已估算: ${stop.name.zh || stop.name.en}`)
      resolved.push({ name: stop.name, point: snapped, estimated: true })
      prevPoint = snapped
      continue
    }

    const pick = pickClosest(candidates, prevPoint)
    const point = index.snap(pick.point)
    resolved.push({ name: stop.name, point })
    prevPoint = point
  }

  return resolved
}

function pickClosest(candidates, prevPoint) {
  if (!prevPoint || candidates.length === 1) return candidates[0]
  return candidates.reduce((best, entry) => (dist(entry.point, prevPoint) < dist(best.point, prevPoint) ? entry : best))
}

export function traceWorldMapRouteFromCatalog(options) {
  const {
    routeId,
    directionIndex = 0,
    catalogPath = resolve(root, 'data', 'world-map-stops.json'),
    mapPath = resolve(root, 'public', 'maps', 'SIMapGerenal.png'),
    outputPath = resolve(root, 'data', 'world-map-routes', `${WORLD_MAP_ROUTE_ALIASES[routeId] ?? routeId}.json`),
  } = options

  const canonicalId = WORLD_MAP_ROUTE_ALIASES[routeId] ?? routeId
  const routeStops = ROUTE_STOP_LISTS[routeId] ?? ROUTE_STOP_LISTS[canonicalId]
  if (!routeStops) {
    throw new Error(`No stop list configured for route ${routeId}`)
  }

  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))
  if (!Array.isArray(catalog.stops)) {
    throw new Error(`Invalid catalog: ${catalogPath}`)
  }

  console.log(`[trace] Loading road index from ${mapPath}`)
  const index = loadGeneralMapRoadSnapIndex(mapPath)

  console.log(`[trace] Matching ${routeStops.length} stops for route ${routeId} → ${canonicalId}`)
  const matchedStops = resolveRouteStops(catalog.stops, routeStops, index)
  const points = rebuildPathFromStopPoints(matchedStops, index)

  if (points.length < 2) {
    throw new Error('Traced path has fewer than 2 points')
  }

  const payload = {
    routeId: canonicalId,
    note: `Route ${routeId} traced from world-map-stops.json catalog; coordinates normalized (0–1) on SIMap.`,
    directions: [
      {
        directionIndex,
        points: points.map(roundPoint),
        stops: matchedStops.map((stop) => ({
          name: { zh: stop.name.zh, en: stop.name.en || stop.name.zh },
          point: roundPoint(stop.point),
        })),
      },
    ],
  }

  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`[trace] Wrote ${points.length} path points, ${matchedStops.length} stops → ${outputPath}`)
  return payload
}

const isMain = process.argv[1]?.endsWith('trace-world-map-route-from-catalog.mjs')
if (isMain) {
  const routeId = process.argv[2] ?? '21A'
  traceWorldMapRouteFromCatalog({ routeId })
}
