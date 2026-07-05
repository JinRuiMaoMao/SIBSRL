import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { RouteStop } from '../types/route'
import type { WorldMapDrawPathNode, WorldMapDrawStop } from '../types/worldMapDraw'
import { ROUTE_MAP_VIEWER_EDITOR_CONFIG } from '../routeEditor/types'
import type { RouteDetailMapStop } from './routeDetailMapStops'
import {
  applyCatalogStopSeqToEditorNodes,
  buildReferenceStopDetailsFromCatalog,
  routeMapStopNamesMatch,
} from './routeMapStopMatching'
import { resolveRouteMapDisplayPathPoints } from './routeMapTrajectory'
import { userBendIndicesToFlags, type RouteMapViewerDisplay } from './routeMapViewerDisplay'

function drawStopToRouteDetailMapStop(stop: WorldMapDrawStop, index: number): RouteDetailMapStop {
  const routeStop: RouteStop = { name: stop.name }
  return {
    id: stop.id,
    seq: stop.seq ?? index + 1,
    stop: routeStop,
    point: stop.point,
  }
}

function applyCatalogSeqToDrawStops(
  stops: readonly WorldMapDrawStop[],
  catalogStops: readonly RouteDetailMapStop[],
): WorldMapDrawStop[] {
  if (!catalogStops.length) return [...stops]
  return stops.map((stop, index) => {
    const matched = catalogStops.find((entry) => routeMapStopNamesMatch(entry.stop.name, stop.name))
    return matched
      ? { ...stop, seq: stop.seq ?? matched.seq }
      : { ...stop, seq: stop.seq ?? index + 1 }
  })
}

export interface RouteMapInteractiveLayerState {
  interactiveDrawStops: WorldMapDrawStop[]
  interactiveStopDetails: RouteDetailMapStop[]
  referenceStopDetails: RouteDetailMapStop[]
  stopClickEnabled: boolean
  selectedReferenceNodeId: number | null
  draftPoints: WorldMapPoint[]
  draftStopPoints: RouteMapViewerDisplay['stopPoints']
  draftPathNodes: WorldMapDrawPathNode[]
  pathUserBends: boolean[]
  trajectoryPath: readonly WorldMapPoint[]
  referenceEditorProps: {
    nodes: NonNullable<RouteMapViewerDisplay['referenceEditor']>['nodes']
    segments: NonNullable<RouteMapViewerDisplay['referenceEditor']>['segments']
    lineStyle: NonNullable<RouteMapViewerDisplay['referenceEditor']>['lineStyle']
    config: NonNullable<RouteMapViewerDisplay['referenceEditor']>['config']
    segmentPassthrough: boolean
    allowSegmentDelete: boolean
    continuousSegmentPaths?: boolean
    onNodeClick?: (nodeId: number) => void
    selectedNodeId: number | null
  } | null
}

export function buildRouteMapInteractiveLayerState(
  display: RouteMapViewerDisplay,
  imageSize: { width: number; height: number } | null,
  catalogStops: readonly RouteDetailMapStop[],
  selectedStopId: string | null,
  onReferenceStopNodeClick?: (nodeId: number) => void,
  routeStops: readonly RouteStop[] = [],
): RouteMapInteractiveLayerState {
  const referenceStopDetails =
    display.referenceEditor && imageSize
      ? buildReferenceStopDetailsFromCatalog(
          display.referenceEditor.nodes,
          imageSize,
          catalogStops,
          routeStops,
        )
      : []

  const interactiveDrawStops = display.referenceEditor
    ? []
    : display.stops.length > 0
      ? applyCatalogSeqToDrawStops(display.stops, catalogStops)
      : catalogStops.map((stop) => ({
          id: stop.id,
          point: stop.point,
          name: { zh: stop.stop.name.zh, en: stop.stop.name.en },
          seq: stop.seq,
        }))

  const interactiveStopDetails = display.referenceEditor
    ? referenceStopDetails
    : display.stops.length > 0
      ? applyCatalogSeqToDrawStops(display.stops, catalogStops).map((stop, index) =>
          drawStopToRouteDetailMapStop(stop, index),
        )
      : [...catalogStops]

  const stopClickEnabled = interactiveDrawStops.length > 0 || referenceStopDetails.length > 0

  const selectedReferenceNodeId =
    selectedStopId?.startsWith('ref-stop-')
      ? Number.parseInt(selectedStopId.slice('ref-stop-'.length), 10)
      : null

  const trajectoryPath = imageSize ? resolveRouteMapDisplayPathPoints(display, imageSize) : []

  const editorNodes =
    display.referenceEditor && catalogStops.length
      ? applyCatalogStopSeqToEditorNodes(display.referenceEditor.nodes, catalogStops)
      : display.referenceEditor?.nodes ?? []

  return {
    interactiveDrawStops,
    interactiveStopDetails,
    referenceStopDetails,
    stopClickEnabled,
    selectedReferenceNodeId: Number.isFinite(selectedReferenceNodeId) ? selectedReferenceNodeId : null,
    draftPoints: display.referenceEditor ? [] : display.points,
    draftStopPoints: display.referenceEditor ? [] : display.stopPoints,
    draftPathNodes: [],
    pathUserBends: userBendIndicesToFlags(display.userBendIndices, display.points.length),
    trajectoryPath,
    referenceEditorProps: display.referenceEditor
      ? {
          nodes: editorNodes,
          segments: display.referenceEditor.segments,
          lineStyle: display.referenceEditor.lineStyle,
          config: ROUTE_MAP_VIEWER_EDITOR_CONFIG,
          segmentPassthrough: true,
          allowSegmentDelete: false,
          continuousSegmentPaths: true,
          onNodeClick: referenceStopDetails.length ? onReferenceStopNodeClick : undefined,
          selectedNodeId: Number.isFinite(selectedReferenceNodeId) ? selectedReferenceNodeId : null,
        }
      : null,
  }
}
