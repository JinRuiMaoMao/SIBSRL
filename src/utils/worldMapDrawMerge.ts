import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawStop, WorldMapVirtualNode } from '../types/worldMapDraw'
import type { WorldMapDrawImportResult } from './worldMapRouteImport'

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
