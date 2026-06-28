import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawStop, WorldMapVirtualNode, WorldMapVirtualNodeKind } from '../types/worldMapDraw'

export type WorldMapDrawImportResult =
  | {
      kind: 'catalog'
      stops: WorldMapDrawStop[]
    }
  | {
      kind: 'virtual'
      nodes: WorldMapVirtualNode[]
    }
  | {
      kind: 'route'
      routeId: string
      directionIndex: number
      points: WorldMapPoint[]
      stops: WorldMapDrawStop[]
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value)
}

function isWorldMapPoint(value: unknown): value is WorldMapPoint {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  )
}

function readStopName(value: unknown): { zh: string; en: string } | null {
  if (!isRecord(value)) return null
  const zh = typeof value.zh === 'string' ? value.zh.trim() : ''
  const en = typeof value.en === 'string' ? value.en.trim() : ''
  if (!zh && !en) return null
  return { zh: zh || en, en: en || zh }
}

function readStopEntry(value: unknown, index: number): WorldMapDrawStop | null {
  if (!isRecord(value) || !isWorldMapPoint(value.point)) return null
  const name = readStopName(value.name)
  if (!name) return null
  return {
    id: `import-${index}-${Math.random().toString(36).slice(2, 8)}`,
    point: [value.point[0], value.point[1]],
    name,
  }
}

function readStopList(value: unknown): WorldMapDrawStop[] {
  if (!Array.isArray(value)) return []
  const stops: WorldMapDrawStop[] = []
  for (let index = 0; index < value.length; index += 1) {
    const stop = readStopEntry(value[index], index)
    if (stop) stops.push(stop)
  }
  return stops
}

function readVirtualNodeKind(value: unknown): WorldMapVirtualNodeKind | null {
  if (value === 'straight') return 'straight'
  if (value === 'left' || value === 'turn') return 'left'
  if (value === 'right' || value === 'u-turn') return 'right'
  if (value === 'on-bridge' || value === '上桥') return 'on-bridge'
  if (value === 'off-bridge' || value === '下桥') return 'off-bridge'
  if (value === 'enter-tunnel' || value === '进隧道' || value === '进隧') return 'enter-tunnel'
  if (value === 'exit-tunnel' || value === '出隧道' || value === '出隧') return 'exit-tunnel'
  return null
}

function readVirtualNodeEntry(value: unknown, index: number): WorldMapVirtualNode | null {
  if (!isRecord(value) || !isWorldMapPoint(value.point)) return null
  const routeId = typeof value.routeId === 'string' ? value.routeId.trim() : ''
  const kind = readVirtualNodeKind(value.kind)
  if (!routeId || !kind) return null
  return {
    id: `import-vn-${index}-${Math.random().toString(36).slice(2, 8)}`,
    point: [value.point[0], value.point[1]],
    routeId,
    kind,
  }
}

function readVirtualNodeList(value: unknown): WorldMapVirtualNode[] {
  if (!Array.isArray(value)) return []
  const nodes: WorldMapVirtualNode[] = []
  for (let index = 0; index < value.length; index += 1) {
    const node = readVirtualNodeEntry(value[index], index)
    if (node) nodes.push(node)
  }
  return nodes
}

function readPointList(value: unknown): WorldMapPoint[] {
  if (!Array.isArray(value)) return []
  const points: WorldMapPoint[] = []
  for (const entry of value) {
    if (isWorldMapPoint(entry)) points.push([entry[0], entry[1]])
  }
  return points
}

function readDirection(value: unknown): {
  directionIndex: number
  points: WorldMapPoint[]
  stops: WorldMapDrawStop[]
} | null {
  if (!isRecord(value)) return null
  const directionIndex =
    typeof value.directionIndex === 'number' && Number.isFinite(value.directionIndex)
      ? value.directionIndex
      : 0
  return {
    directionIndex,
    points: readPointList(value.points),
    stops: readStopList(value.stops),
  }
}

export function parseWorldMapDrawImportJson(raw: unknown): WorldMapDrawImportResult | null {
  if (!isRecord(raw)) return null

  if (raw.kind === 'world-map-stop-catalog') {
    const stops = readStopList(raw.stops)
    if (stops.length === 0) return null
    return { kind: 'catalog', stops }
  }

  if (raw.kind === 'world-map-virtual-node-catalog') {
    const nodes = readVirtualNodeList(raw.nodes)
    if (nodes.length === 0) return null
    return { kind: 'virtual', nodes }
  }

  if (typeof raw.routeId !== 'string' || !Array.isArray(raw.directions) || raw.directions.length === 0) {
    return null
  }

  const routeId = raw.routeId.trim()
  if (!routeId) return null

  const direction = readDirection(raw.directions[0])
  if (!direction) return null

  const stops = direction.stops
  const points = direction.points

  if (stops.length === 0 && points.length < 2) return null
  if (stops.length >= 2 && points.length === 0) {
    return {
      kind: 'route',
      routeId,
      directionIndex: direction.directionIndex,
      points: [],
      stops,
    }
  }

  if (points.length >= 2) {
    return {
      kind: 'route',
      routeId,
      directionIndex: direction.directionIndex,
      points,
      stops: stops.length > 0 ? stops : [],
    }
  }

  return null
}
