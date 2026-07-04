import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawPathNode, WorldMapDrawStop } from '../types/worldMapDraw'
import type { WorldMapDrawImportResult } from '../utils/worldMapRouteImport'
import type { RouteImportMergeResult } from '../utils/worldMapDrawImportMerge'
import type { WorldMapDrawImageSegment } from '../utils/worldMapDrawImageExport'
import { RouteEditorDataManager } from './RouteEditorDataManager'
import { inferSegmentsFromOrderedNodes, sampleRouteEditorPathPoints } from './routeEditorPath'
import { mergeManyRouteEditorLines } from './routeEditorMerge'
import type { RouteEditorLine, RouteEditorLineStyle, RouteEditorNode } from './types'

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
      labelWidth: 80,
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

  const nodePixelKey = (x: number, y: number) => `${Math.round(x)}|${Math.round(y)}`
  const normalizedPointKey = (point: WorldMapPoint) =>
    `${Math.round(point[0] * 10000)}|${Math.round(point[1] * 10000)}`

  const stopByKey = new Map<string, WorldMapDrawStop>()
  for (const stop of parsed.stops) {
    stopByKey.set(normalizedPointKey(stop.point), stop)
  }

  let lastNodePixelKey: string | null = null
  const appendPathNodeAtPixel = (
    pixel: { x: number; y: number },
    options: { stop?: WorldMapDrawStop; pathNode?: WorldMapDrawPathNode } = {},
  ) => {
    const pixelKey = nodePixelKey(pixel.x, pixel.y)
    if (pixelKey === lastNodePixelKey && nodes.length > 0) {
      const last = nodes[nodes.length - 1]!
      if (options.stop && last.type !== 'stop') {
        last.type = 'stop'
        last.chi_name = options.stop.name.zh
        last.eng_name = options.stop.name.en
      }
      if (options.pathNode && last.type === 'point') {
        const cornerRadius = Number(options.pathNode.label) || 0
        if (cornerRadius > 0) last.cornerRadius = cornerRadius
      }
      return
    }

    if (options.stop) {
      nodes.push({
        id: nextId++,
        chi_name: options.stop.name.zh,
        eng_name: options.stop.name.en,
        type: 'stop',
        x: pixel.x,
        y: pixel.y,
        labelPosition: 'top',
        labelOffsetX: 0,
        labelOffsetY: 0,
        labelWidth: 80,
        labelHeight: 'auto',
        cornerRadius: 0,
      })
    } else {
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
        labelWidth: 80,
        labelHeight: 'auto',
        cornerRadius: Number(options.pathNode?.label) || 0,
      })
    }
    lastNodePixelKey = pixelKey
  }

  const usedStops = new Set<string>()
  for (const point of parsed.points) {
    const stop = stopByKey.get(normalizedPointKey(point))
    const pathNode = parsed.pathNodes.find(
      (node) => Math.hypot(node.point[0] - point[0], node.point[1] - point[1]) < 0.002,
    )
    const pixel = pathNode
      ? normalizedToPixel(pathNode.point, imageWidth, imageHeight)
      : normalizedToPixel(point, imageWidth, imageHeight)

    if (stop && !usedStops.has(stop.id)) {
      usedStops.add(stop.id)
      appendPathNodeAtPixel(pixel, { stop })
      continue
    }
    if (pathNode) {
      appendPathNodeAtPixel(pixel, { pathNode })
      continue
    }
    appendPathNodeAtPixel(pixel)
  }

  for (const stop of parsed.stops) {
    if (!usedStops.has(stop.id)) appendStop(stop)
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
