import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapDrawPathNode, WorldMapDrawStop } from '../types/worldMapDraw'
import type { WorldMapDrawImportResult } from '../utils/worldMapRouteImport'
import type { RouteImportMergeResult } from '../utils/worldMapDrawImportMerge'
import { RouteEditorDataManager } from './RouteEditorDataManager'
import { sampleRouteEditorPathPoints } from './routeEditorPath'
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
  const points = sampleRouteEditorPathPoints(line.nodes, imageWidth, imageHeight, showPointLines)
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
    return { line: { id: 1, name: '导入线路', nodes }, routeId: '', directionIndex: 0 }
  }

  const stopByKey = new Map<string, WorldMapDrawStop>()
  for (const stop of parsed.stops) {
    stopByKey.set(`${Math.round(stop.point[0] * 10000)}|${Math.round(stop.point[1] * 10000)}`, stop)
  }

  const usedStops = new Set<string>()
  for (const point of parsed.points) {
    const key = `${Math.round(point[0] * 10000)}|${Math.round(point[1] * 10000)}`
    const stop = stopByKey.get(key)
    if (stop && !usedStops.has(stop.id)) {
      usedStops.add(stop.id)
      appendStop(stop)
      continue
    }
    const pathNode = parsed.pathNodes.find(
      (node) =>
        Math.hypot(node.point[0] - point[0], node.point[1] - point[1]) < 0.002,
    )
    if (pathNode) {
      const pixel = normalizedToPixel(pathNode.point, imageWidth, imageHeight)
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
        cornerRadius: Number(pathNode.label) || 0,
      })
      continue
    }
    const pixel = normalizedToPixel(point, imageWidth, imageHeight)
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
      cornerRadius: 0,
    })
  }

  for (const stop of parsed.stops) {
    if (!usedStops.has(stop.id)) appendStop(stop)
  }

  return {
    line: { id: 1, name: parsed.routeId || '导入线路', nodes },
    routeId: parsed.routeId,
    directionIndex: parsed.directionIndex,
  }
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

export function loadReferenceJsonIntoManager(
  manager: RouteEditorDataManager,
  jsonText: string,
): boolean {
  return manager.importReferenceJson(jsonText)
}
