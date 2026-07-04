import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawPathNode, WorldMapDrawStop, WorldMapVirtualNode } from '../types/worldMapDraw'
import type { RouteEditorGraphExport, RouteEditorGraphExportNode, RouteEditorNodeType } from '../routeEditor/types'
import { normalizeVirtualNodeKind } from './mapSurfaceKind'

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
      virtualNodes: WorldMapVirtualNode[]
      pathNodes: WorldMapDrawPathNode[]
      legStarts: number[]
      pathLegHidden: boolean[]
      userBendIndices: number[]
      editorGraph?: RouteEditorGraphExport
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

function readVirtualNodeKind(value: unknown): WorldMapVirtualNode['kind'] {
  return normalizeVirtualNodeKind(value)
}

function readVirtualNodeEntry(value: unknown, index: number): WorldMapVirtualNode | null {
  if (!isRecord(value) || !isWorldMapPoint(value.point)) return null
  const routeId = typeof value.routeId === 'string' ? value.routeId.trim() : ''
  const kind = readVirtualNodeKind(value.kind)
  const order =
    typeof value.order === 'number' && Number.isFinite(value.order) ? Math.round(value.order) : index
  if (!routeId) return null
  return {
    id: `import-vn-${index}-${Math.random().toString(36).slice(2, 8)}`,
    point: [value.point[0], value.point[1]],
    routeId,
    kind,
    order,
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

function readPathNodeEntry(value: unknown, index: number): WorldMapDrawPathNode | null {
  if (!isRecord(value) || !isWorldMapPoint(value.point)) return null
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  return {
    id: `import-pn-${index}-${Math.random().toString(36).slice(2, 8)}`,
    point: [value.point[0], value.point[1]],
    ...(label ? { label } : {}),
  }
}

function readPathNodeList(value: unknown): WorldMapDrawPathNode[] {
  if (!Array.isArray(value)) return []
  const nodes: WorldMapDrawPathNode[] = []
  for (let index = 0; index < value.length; index += 1) {
    const node = readPathNodeEntry(value[index], index)
    if (node) nodes.push(node)
  }
  return nodes
}

function readIndexList(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const indices: number[] = []
  for (const entry of value) {
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      indices.push(Math.round(entry))
    }
  }
  return indices
}

function readBooleanList(value: unknown): boolean[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => entry === true)
}

function readLegStarts(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const starts: number[] = []
  for (const entry of value) {
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      starts.push(Math.round(entry))
    }
  }
  return starts
}

function readEditorGraphNode(value: unknown): RouteEditorGraphExportNode | null {
  if (!isRecord(value) || !isWorldMapPoint(value.point)) return null
  const id = typeof value.id === 'number' && Number.isFinite(value.id) ? Math.round(value.id) : null
  const type: RouteEditorNodeType | null =
    value.type === 'stop' || value.type === 'point' ? value.type : null
  if (id == null || !type) return null
  const chi_name = typeof value.chi_name === 'string' ? value.chi_name : undefined
  const eng_name = typeof value.eng_name === 'string' ? value.eng_name : undefined
  const cornerRadius =
    typeof value.cornerRadius === 'number' && Number.isFinite(value.cornerRadius)
      ? value.cornerRadius
      : undefined
  return {
    id,
    type,
    point: [value.point[0], value.point[1]],
    ...(chi_name ? { chi_name } : {}),
    ...(eng_name ? { eng_name } : {}),
    ...(cornerRadius ? { cornerRadius } : {}),
  }
}

function readEditorGraph(value: unknown): RouteEditorGraphExport | null {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.segments)) return null
  const nodes: RouteEditorGraphExportNode[] = []
  for (const entry of value.nodes) {
    const node = readEditorGraphNode(entry)
    if (node) nodes.push(node)
  }
  if (nodes.length === 0) return null
  const segments: RouteEditorGraphExport['segments'] = []
  for (const entry of value.segments) {
    if (!isRecord(entry)) continue
    const from = typeof entry.from === 'number' && Number.isFinite(entry.from) ? Math.round(entry.from) : null
    const to = typeof entry.to === 'number' && Number.isFinite(entry.to) ? Math.round(entry.to) : null
    if (from == null || to == null) continue
    segments.push({ from, to })
  }
  if (segments.length === 0) return null
  return { nodes, segments }
}

function readDirection(value: unknown): {
  directionIndex: number
  points: WorldMapPoint[]
  stops: WorldMapDrawStop[]
  virtualNodes: WorldMapVirtualNode[]
  pathNodes: WorldMapDrawPathNode[]
  legStarts: number[]
  pathLegHidden: boolean[]
  userBendIndices: number[]
  editorGraph?: RouteEditorGraphExport
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
    virtualNodes: readVirtualNodeList(value.virtualNodes),
    pathNodes: readPathNodeList(value.pathNodes),
    legStarts: readLegStarts(value.legStarts),
    pathLegHidden: readBooleanList(value.pathLegHidden),
    userBendIndices: readIndexList(value.userBendIndices),
    editorGraph: readEditorGraph(value.editorGraph) ?? undefined,
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
  const virtualNodes = direction.virtualNodes
  const pathNodes = direction.pathNodes
  const legStarts = direction.legStarts
  const pathLegHidden = direction.pathLegHidden
  const userBendIndices = direction.userBendIndices
  const editorGraph = direction.editorGraph

  const hasPath = points.length >= 2
  const hasStops = stops.length > 0
  const hasVirtualNodes = virtualNodes.length > 0
  const hasPathNodes = pathNodes.length > 0
  const hasEditorGraph = Boolean(editorGraph)
  if (!hasPath && !hasStops && !hasVirtualNodes && !hasPathNodes && !hasEditorGraph) return null

  return {
    kind: 'route',
    routeId,
    directionIndex: direction.directionIndex,
    points: hasPath ? points : [],
    stops,
    virtualNodes,
    pathNodes,
    legStarts,
    pathLegHidden,
    userBendIndices,
    editorGraph,
  }
}
