import type { WorldMapPoint } from '../data/worldMapRoutes'
import type {
  RouteEditorConfig,
  RouteEditorLine,
  RouteEditorLineStyle,
} from '../routeEditor/types'
import {
  DEFAULT_ROUTE_EDITOR_CONFIG,
  DEFAULT_ROUTE_EDITOR_LINE_STYLE,
} from '../routeEditor/types'
import { sibsImportToRouteEditorLine } from '../routeEditor/routeEditorBridge'
import type { WorldMapDrawPathNode, WorldMapDrawStop } from '../types/worldMapDraw'
import type { WorldMapDrawImportResult } from './worldMapRouteImport'

export interface RouteMapViewerDisplay {
  routeNumber: string
  points: WorldMapPoint[]
  stopPoints: WorldMapPoint[]
  stops: WorldMapDrawStop[]
  pathNodes: WorldMapDrawPathNode[]
  legStarts: number[]
  pathLegHidden: boolean[]
  userBendIndices: number[]
  strokeColor?: string
  referenceEditor: {
    nodes: RouteEditorLine['nodes']
    segments: RouteEditorLine['segments']
    lineStyle: RouteEditorLineStyle
    config: RouteEditorConfig
  } | null
  fitPoints: WorldMapPoint[]
}

function collectFitPoints(display: Omit<RouteMapViewerDisplay, 'fitPoints'>): WorldMapPoint[] {
  const points: WorldMapPoint[] = []
  for (const stop of display.stops) points.push(stop.point)
  for (const node of display.pathNodes) points.push(node.point)
  points.push(...display.points)
  return points
}

export function buildRouteMapViewerDisplay(
  parsed: Extract<WorldMapDrawImportResult, { kind: 'route' }>,
  imageWidth: number,
  imageHeight: number,
  routeNumber: string,
): RouteMapViewerDisplay | null {
  if (imageWidth <= 0 || imageHeight <= 0) return null

  const editorImport = sibsImportToRouteEditorLine(parsed, imageWidth, imageHeight)
  if (editorImport?.line.segments.length) {
    const display: Omit<RouteMapViewerDisplay, 'fitPoints'> = {
      routeNumber: routeNumber || parsed.routeId,
      points: parsed.points,
      stopPoints: parsed.stops.map((stop) => stop.point),
      stops: parsed.stops,
      pathNodes: parsed.pathNodes,
      legStarts: parsed.legStarts.length > 0 ? parsed.legStarts : [0],
      pathLegHidden: parsed.pathLegHidden,
      userBendIndices: parsed.userBendIndices,
      referenceEditor: {
        nodes: editorImport.line.nodes,
        segments: editorImport.line.segments,
        lineStyle: DEFAULT_ROUTE_EDITOR_LINE_STYLE,
        config: DEFAULT_ROUTE_EDITOR_CONFIG,
      },
    }
    return { ...display, fitPoints: collectFitPoints(display) }
  }

  const display: Omit<RouteMapViewerDisplay, 'fitPoints'> = {
    routeNumber: routeNumber || parsed.routeId,
    points: parsed.points,
    stopPoints: parsed.stops.map((stop) => stop.point),
    stops: parsed.stops,
    pathNodes: parsed.pathNodes,
    legStarts: parsed.legStarts.length > 0 ? parsed.legStarts : [0],
    pathLegHidden: parsed.pathLegHidden,
    userBendIndices: parsed.userBendIndices,
    referenceEditor: null,
  }
  return { ...display, fitPoints: collectFitPoints(display) }
}

export function buildSimpleRouteMapViewerDisplay(
  routeNumber: string,
  points: readonly WorldMapPoint[],
): RouteMapViewerDisplay {
  const display: Omit<RouteMapViewerDisplay, 'fitPoints'> = {
    routeNumber,
    points: [...points],
    stopPoints: [],
    stops: [],
    pathNodes: [],
    legStarts: [0],
    pathLegHidden: [],
    userBendIndices: [],
    referenceEditor: null,
  }
  return { ...display, fitPoints: collectFitPoints(display) }
}

export function userBendIndicesToFlags(
  indices: readonly number[],
  pointCount: number,
): boolean[] {
  const flags = Array(Math.max(pointCount, 0)).fill(false)
  for (const index of indices) {
    if (index >= 0 && index < flags.length) flags[index] = true
  }
  return flags
}
