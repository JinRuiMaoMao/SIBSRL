import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawStop, WorldMapVirtualNode } from '../types/worldMapDraw'
import type { WorldMapDrawImportResult } from './worldMapRouteImport'
import { canonicalVirtualNodeRouteId, virtualNodeAppliesToRoute } from './worldMapVirtualNodes'

export interface WorldMapDrawDraftSlice {
  routeId: string
  directionIndex: number
  points: WorldMapPoint[]
  stops: WorldMapDrawStop[]
  virtualNodes: WorldMapVirtualNode[]
}

function roundKey(point: WorldMapPoint): string {
  return `${Math.round(point[0] * 1000)}|${Math.round(point[1] * 1000)}`
}

function stopKey(stop: WorldMapDrawStop): string {
  return `${stop.name.zh}|${stop.name.en}|${roundKey(stop.point)}`
}

function virtualNodeKey(node: WorldMapVirtualNode): string {
  return `${node.routeId}|${node.kind}|${roundKey(node.point)}`
}

export function worldMapDrawDraftSliceFromImport(parsed: WorldMapDrawImportResult): WorldMapDrawDraftSlice {
  if (parsed.kind === 'catalog') {
    return { routeId: '', directionIndex: 0, points: [], stops: parsed.stops, virtualNodes: [] }
  }
  if (parsed.kind === 'virtual') {
    return { routeId: '', directionIndex: 0, points: [], stops: [], virtualNodes: parsed.nodes }
  }
  return {
    routeId: parsed.routeId,
    directionIndex: parsed.directionIndex,
    points: [...parsed.points],
    stops: parsed.stops,
    virtualNodes: parsed.virtualNodes,
  }
}

export function mergeWorldMapDrawSlices(slices: readonly WorldMapDrawDraftSlice[]): WorldMapDrawDraftSlice {
  const stops: WorldMapDrawStop[] = []
  const stopSeen = new Set<string>()
  const virtualNodes: WorldMapVirtualNode[] = []
  const vnSeen = new Set<string>()
  let bestPoints: WorldMapPoint[] = []
  let routeId = ''
  let directionIndex = 0

  for (const slice of slices) {
    if (slice.routeId.trim()) {
      routeId = slice.routeId.trim()
      directionIndex = slice.directionIndex
      break
    }
  }

  for (const slice of slices) {
    for (const stop of slice.stops) {
      const key = stopKey(stop)
      if (stopSeen.has(key)) continue
      stopSeen.add(key)
      stops.push(stop)
    }
    for (const node of slice.virtualNodes) {
      const key = virtualNodeKey(node)
      if (vnSeen.has(key)) continue
      vnSeen.add(key)
      virtualNodes.push(node)
    }
    if (slice.points.length > bestPoints.length) {
      bestPoints = slice.points.map((point) => [point[0], point[1]] as WorldMapPoint)
    }
  }

  virtualNodes.sort((a, b) => a.order - b.order)

  return { routeId, directionIndex, points: bestPoints, stops, virtualNodes }
}

export function collectWorldMapDrawRouteIds(slices: readonly WorldMapDrawDraftSlice[]): string[] {
  const ids = new Set<string>()
  const add = (id: string) => {
    const canonical = canonicalVirtualNodeRouteId(id)
    if (canonical) ids.add(canonical)
  }
  for (const slice of slices) {
    add(slice.routeId)
    for (const node of slice.virtualNodes) add(node.routeId)
  }
  return [...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

export function filterWorldMapDrawSliceForRoute(
  merged: WorldMapDrawDraftSlice,
  selectedRouteId: string,
  slices: readonly WorldMapDrawDraftSlice[],
): WorldMapDrawDraftSlice {
  const canonical = canonicalVirtualNodeRouteId(selectedRouteId)
  if (!canonical) return merged

  const matchingSlices = slices.filter(
    (slice) => canonicalVirtualNodeRouteId(slice.routeId) === canonical,
  )

  let stops: WorldMapDrawStop[] = []
  const stopSeen = new Set<string>()
  const hasRouteTaggedStops = matchingSlices.some((slice) => slice.stops.length > 0)

  if (hasRouteTaggedStops) {
    for (const slice of matchingSlices) {
      for (const stop of slice.stops) {
        const key = stopKey(stop)
        if (stopSeen.has(key)) continue
        stopSeen.add(key)
        stops.push(stop)
      }
    }
  } else {
    stops = merged.stops.map((stop) => ({
      ...stop,
      point: [stop.point[0], stop.point[1]] as WorldMapPoint,
    }))
  }

  const virtualNodes = merged.virtualNodes.filter((node) =>
    virtualNodeAppliesToRoute(node.routeId, canonical),
  )

  const taggedPathSlice = matchingSlices.find((slice) => slice.points.length >= 2)
  const points =
    taggedPathSlice?.points.map((point) => [point[0], point[1]] as WorldMapPoint) ??
    (canonicalVirtualNodeRouteId(merged.routeId) === canonical
      ? merged.points.map((point) => [point[0], point[1]] as WorldMapPoint)
      : [])

  const directionIndex =
    matchingSlices.find((slice) => slice.stops.length > 0 || slice.virtualNodes.length > 0)
      ?.directionIndex ?? merged.directionIndex

  return {
    routeId: canonical,
    directionIndex,
    points,
    stops,
    virtualNodes,
  }
}
