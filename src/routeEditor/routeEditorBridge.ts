import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawPathNode, WorldMapDrawStop } from '../types/worldMapDraw'
import type { WorldMapDrawImportResult } from '../utils/worldMapRouteImport'
import type { RouteImportMergeResult } from '../utils/worldMapDrawImportMerge'
import type { WorldMapDrawImageSegment } from '../utils/worldMapDrawImageExport'
import { RouteEditorDataManager } from './RouteEditorDataManager'
import {
  inferSegmentsFromOrderedNodes,
  normalizeRouteEditorLine,
  sampleRouteEditorPathPoints,
} from './routeEditorPath'
import { mergeManyRouteEditorLines } from './routeEditorMerge'
import type { RouteEditorLine, RouteEditorLineStyle, RouteEditorNode, RouteEditorGraphExport } from './types'

export function pixelToNormalized(
  x: number,
  y: number,
  imageWidth: number,
  imageHeight: number,
): WorldMapPoint {
  return [x / imageWidth, y / imageHeight]
}

export function normalizedToPixel(
  point: WorldMapPoint,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number } {
  return {
    x: Math.round(point[0] * imageWidth),
    y: Math.round(point[1] * imageHeight),
  }
}

export function routeEditorNodeToStop(
  node: RouteEditorNode,
  imageWidth: number,
  imageHeight: number,
): WorldMapDrawStop {
  return {
    id: `stop-${node.id}`,
    point: pixelToNormalized(node.x, node.y, imageWidth, imageHeight),
    name: { zh: node.chi_name || `站点${node.id}`, en: node.eng_name || node.chi_name || `Stop ${node.id}` },
    ...(node.stopSeq != null && node.stopSeq > 0 ? { seq: node.stopSeq } : {}),
  }
}

export function routeEditorNodeToPathNode(
  node: RouteEditorNode,
  imageWidth: number,
  imageHeight: number,
): WorldMapDrawPathNode {
  return {
    id: `node-${node.id}`,
    point: pixelToNormalized(node.x, node.y, imageWidth, imageHeight),
    label: node.cornerRadius > 0 ? String(node.cornerRadius) : undefined,
  }
}

export interface RouteEditorSibsDraft {
  routeId: string
  directionIndex: number
  points: WorldMapPoint[]
  stops: WorldMapDrawStop[]
  pathNodes: WorldMapDrawPathNode[]
  legStarts: number[]
  pathLegHidden: boolean[]
  userBendIndices: number[]
  editorGraph?: RouteEditorGraphExport
}

export function routeEditorLineToEditorGraphExport(
  line: RouteEditorLine,
  imageWidth: number,
  imageHeight: number,
): RouteEditorGraphExport {
  return {
    nodes: line.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      point: pixelToNormalized(node.x, node.y, imageWidth, imageHeight),
      ...(node.type === 'stop'
        ? {
            chi_name: node.chi_name,
            eng_name: node.eng_name,
            ...(node.stopSeq != null && node.stopSeq > 0 ? { stopSeq: node.stopSeq } : {}),
          }
        : node.cornerRadius > 0
          ? { cornerRadius: node.cornerRadius }
          : {}),
    })),
    segments: line.segments.map((segment) => ({
      from: segment.fromNodeId,
      to: segment.toNodeId,
    })),
  }
}

function defaultRouteEditorNodeFields(
  type: RouteEditorNode['type'],
  chi_name = '',
  eng_name = '',
  cornerRadius = 0,
): Pick<
  RouteEditorNode,
  | 'chi_name'
  | 'eng_name'
  | 'labelPosition'
  | 'labelOffsetX'
  | 'labelOffsetY'
  | 'labelWidth'
  | 'labelHeight'
  | 'cornerRadius'
> {
  return {
    chi_name: type === 'stop' ? chi_name : '',
    eng_name: type === 'stop' ? eng_name : '',
    labelPosition: 'top',
    labelOffsetX: 0,
    labelOffsetY: 0,
    labelWidth: 'resize',
    labelHeight: 'auto',
    cornerRadius: type === 'point' ? cornerRadius : 0,
  }
}

export function editorGraphToRouteEditorLine(
  graph: RouteEditorGraphExport,
  imageWidth: number,
  imageHeight: number,
  routeId: string,
): RouteEditorLine | null {
  if (imageWidth <= 0 || imageHeight <= 0 || graph.nodes.length === 0) return null

  const idMap = new Map<number, number>()
  let nextNodeId = 1
  const nodes: RouteEditorNode[] = []

  for (const node of graph.nodes) {
    const pixel = normalizedToPixel(node.point, imageWidth, imageHeight)
    const mappedId = nextNodeId++
    idMap.set(node.id, mappedId)
    nodes.push({
      id: mappedId,
      type: node.type,
      x: pixel.x,
      y: pixel.y,
      ...defaultRouteEditorNodeFields(
        node.type,
        node.chi_name ?? '',
        node.eng_name ?? '',
        node.cornerRadius ?? 0,
      ),
      ...(node.stopSeq != null && node.stopSeq > 0 ? { stopSeq: node.stopSeq } : {}),
    })
  }

  const segments = graph.segments
    .map((segment, index) => {
      const fromNodeId = idMap.get(segment.from)
      const toNodeId = idMap.get(segment.to)
      if (fromNodeId == null || toNodeId == null || fromNodeId === toNodeId) return null
      return { id: index + 1, fromNodeId, toNodeId }
    })
    .filter((segment): segment is NonNullable<typeof segment> => segment != null)

  return {
    id: 1,
    name: routeId || '导入线路',
    nodes,
    segments,
  }
}

export function routeEditorLineToSibsDraft(
  line: RouteEditorLine,
  style: RouteEditorLineStyle,
  imageWidth: number,
  imageHeight: number,
  routeId: string,
  directionIndex: number,
  showPointLines = false,
): RouteEditorSibsDraft {
  const stops = line.nodes
    .filter((node) => node.type === 'stop')
    .map((node) => routeEditorNodeToStop(node, imageWidth, imageHeight))
  const pathNodes = line.nodes
    .filter((node) => node.type === 'point')
    .map((node) => routeEditorNodeToPathNode(node, imageWidth, imageHeight))
  const points = sampleRouteEditorPathPoints(line, imageWidth, imageHeight, showPointLines)
  const editorGraph =
    line.segments.length > 0
      ? routeEditorLineToEditorGraphExport(line, imageWidth, imageHeight)
      : undefined
  void style
  return {
    routeId,
    directionIndex,
    points,
    stops,
    pathNodes,
    legStarts: [0],
    pathLegHidden: [],
    userBendIndices: [],
    editorGraph,
  }
}

export function sibsImportToRouteEditorLine(
  parsed: Extract<WorldMapDrawImportResult, { kind: 'catalog' | 'route' }> | RouteImportMergeResult,
  imageWidth: number,
  imageHeight: number,
): { line: RouteEditorLine; routeId: string; directionIndex: number } | null {
  if (imageWidth <= 0 || imageHeight <= 0) return null

  const nodes: RouteEditorNode[] = []
  let nextId = 1

  const appendStop = (stop: WorldMapDrawStop) => {
    const pixel = normalizedToPixel(stop.point, imageWidth, imageHeight)
    nodes.push({
      id: nextId++,
      chi_name: stop.name.zh,
      eng_name: stop.name.en,
      type: 'stop',
      x: pixel.x,
      y: pixel.y,
      labelPosition: 'top',
      labelOffsetX: 0,
      labelOffsetY: 0,
      labelWidth: 'resize',
      labelHeight: 'auto',
      cornerRadius: 0,
    })
  }

  if (parsed.kind === 'catalog') {
    for (const stop of parsed.stops) appendStop(stop)
    return {
      line: { id: 1, name: '导入线路', nodes, segments: [] },
      routeId: '',
      directionIndex: 0,
    }
  }

  if (parsed.editorGraph) {
    const line = editorGraphToRouteEditorLine(
      parsed.editorGraph,
      imageWidth,
      imageHeight,
      parsed.routeId || '导入线路',
    )
    if (line) {
      return {
        line,
        routeId: parsed.routeId,
        directionIndex: parsed.directionIndex,
      }
    }
  }

  const normalizedPointKey = (point: WorldMapPoint) =>
    `${Math.round(point[0] * 10000)}|${Math.round(point[1] * 10000)}`

  const findPathIndex = (point: WorldMapPoint, points: readonly WorldMapPoint[]): number => {
    const key = normalizedPointKey(point)
    for (let index = 0; index < points.length; index += 1) {
      if (normalizedPointKey(points[index]!) === key) return index
    }
    let bestIndex = 0
    let bestDistance = Infinity
    for (let index = 0; index < points.length; index += 1) {
      const distance = Math.hypot(points[index]![0] - point[0], points[index]![1] - point[1])
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = index
      }
    }
    return bestIndex
  }

  const isOnPath = (point: WorldMapPoint, points: readonly WorldMapPoint[]): boolean => {
    const key = normalizedPointKey(point)
    return points.some((pathPoint) => normalizedPointKey(pathPoint) === key)
  }

  type PathAnchor = {
    pathIndex: number
    stop?: WorldMapDrawStop
    pathNode?: WorldMapDrawPathNode
  }

  const anchors: PathAnchor[] = []
  const offPathStops: WorldMapDrawStop[] = []
  const hasPathTrace = parsed.points.length >= 2

  for (const stop of parsed.stops) {
    if (hasPathTrace && !isOnPath(stop.point, parsed.points)) {
      offPathStops.push(stop)
      continue
    }
    anchors.push({
      pathIndex: hasPathTrace ? findPathIndex(stop.point, parsed.points) : anchors.length,
      stop,
    })
  }

  for (const pathNode of parsed.pathNodes) {
    anchors.push({
      pathIndex: hasPathTrace ? findPathIndex(pathNode.point, parsed.points) : anchors.length,
      pathNode,
    })
  }

  anchors.sort(
    (left, right) =>
      left.pathIndex - right.pathIndex || (left.stop ? 0 : 1) - (right.stop ? 0 : 1),
  )

  const mergedAnchors: PathAnchor[] = []
  for (const anchor of anchors) {
    const point = anchor.stop?.point ?? anchor.pathNode!.point
    const last = mergedAnchors[mergedAnchors.length - 1]
    if (last) {
      const lastPoint = last.stop?.point ?? last.pathNode!.point
      if (normalizedPointKey(lastPoint) === normalizedPointKey(point)) {
        if (anchor.stop) last.stop = anchor.stop
        if (anchor.pathNode) last.pathNode = anchor.pathNode
        last.pathIndex = Math.min(last.pathIndex, anchor.pathIndex)
        continue
      }
    }
    mergedAnchors.push({ ...anchor })
  }

  const usedStops = new Set<string>()
  for (const anchor of mergedAnchors) {
    const point = anchor.stop?.point ?? anchor.pathNode!.point
    const pixel = normalizedToPixel(point, imageWidth, imageHeight)

    if (anchor.stop) {
      usedStops.add(anchor.stop.id)
      nodes.push({
        id: nextId++,
        chi_name: anchor.stop.name.zh,
        eng_name: anchor.stop.name.en,
        type: 'stop',
        x: pixel.x,
        y: pixel.y,
        labelPosition: 'top',
        labelOffsetX: 0,
        labelOffsetY: 0,
        labelWidth: 'resize',
        labelHeight: 'auto',
        cornerRadius: 0,
        ...(anchor.stop.seq != null && anchor.stop.seq > 0 ? { stopSeq: anchor.stop.seq } : {}),
      })
      continue
    }

    nodes.push({
      id: nextId++,
      chi_name: '',
      eng_name: '',
      type: 'point',
      x: pixel.x,
      y: pixel.y,
      labelPosition: 'top',
      labelOffsetX: 0,
      labelOffsetY: 0,
      labelWidth: 'resize',
      labelHeight: 'auto',
      cornerRadius: Number(anchor.pathNode?.label) || 0,
    })
  }

  for (const stop of offPathStops) {
    if (!usedStops.has(stop.id)) {
      usedStops.add(stop.id)
      appendStop(stop)
    }
  }

  return {
    line: {
      id: 1,
      name: parsed.routeId || '导入线路',
      nodes,
      segments: inferSegmentsFromOrderedNodes(nodes),
    },
    routeId: parsed.routeId,
    directionIndex: parsed.directionIndex,
  }
}

export function routeEditorLineToExportSegmentLines(
  line: RouteEditorLine,
  imageWidth: number,
  imageHeight: number,
  showPointLines = false,
): WorldMapDrawImageSegment[] {
  if (imageWidth <= 0 || imageHeight <= 0) return []
  const nodeById = new Map(line.nodes.map((node) => [node.id, node]))
  const segments: WorldMapDrawImageSegment[] = []
  for (const segment of line.segments) {
    const from = nodeById.get(segment.fromNodeId)
    const to = nodeById.get(segment.toNodeId)
    if (!from || !to) continue
    if (!showPointLines && from.type === 'point' && to.type === 'point') continue
    segments.push({
      from: pixelToNormalized(from.x, from.y, imageWidth, imageHeight),
      to: pixelToNormalized(to.x, to.y, imageWidth, imageHeight),
    })
  }
  return segments
}

export function isReferenceEditorExportJson(value: unknown): value is { version: string; lines: unknown[] } {
  return (
    typeof value === 'object' &&
    value != null &&
    'version' in value &&
    'lines' in value &&
    Array.isArray((value as { lines: unknown }).lines)
  )
}

export function parseReferenceJsonToLine(jsonText: string): RouteEditorLine | null {
  try {
    const parsed = JSON.parse(jsonText) as {
      version?: string
      lines?: RouteEditorLine[]
    }
    if (!parsed.version || !Array.isArray(parsed.lines) || parsed.lines.length === 0) {
      return null
    }
    const line = normalizeRouteEditorLine(JSON.parse(JSON.stringify(parsed.lines[0]!)) as RouteEditorLine)
    for (const node of line.nodes) {
      if (node.type === 'point') {
        node.chi_name = ''
        node.eng_name = ''
      }
      node.cornerRadius = node.cornerRadius ?? 0
      if (node.type === 'stop' && node.stopSeq != null && node.stopSeq <= 0) {
        node.stopSeq = undefined
      }
    }
    return line
  } catch {
    return null
  }
}

export function loadReferenceJsonIntoManager(
  manager: RouteEditorDataManager,
  jsonText: string,
): boolean {
  return manager.importReferenceJson(jsonText)
}

export function mergeReferenceJsonFiles(jsonTexts: readonly string[]): RouteEditorLine | null {
  const lines = jsonTexts
    .map((json) => parseReferenceJsonToLine(json))
    .filter((line): line is RouteEditorLine => line != null)
  return mergeManyRouteEditorLines(lines)
}
