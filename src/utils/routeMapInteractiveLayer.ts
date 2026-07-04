import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { RouteStop } from '../types/route'
import type { WorldMapDrawStop } from '../types/worldMapDraw'
import type { RouteDetailMapStop } from './routeDetailMapStops'
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

export function buildReferenceStopDetails(
  display: RouteMapViewerDisplay,
  imageSize: { width: number; height: number },
): RouteDetailMapStop[] {
  if (!display.referenceEditor) return []
  const stopNodes = display.referenceEditor.nodes.filter((node) => node.type === 'stop')
  return stopNodes.map((node, index) => ({
    id: `ref-stop-${node.id}`,
    seq: node.stopSeq ?? index + 1,
    stop: { name: { zh: node.chi_name, en: node.eng_name } },
    point: [node.x / imageSize.width, node.y / imageSize.height],
  }))
}

export interface RouteMapInteractiveLayerState {
  interactiveDrawStops: WorldMapDrawStop[]
  interactiveStopDetails: RouteDetailMapStop[]
  referenceStopDetails: RouteDetailMapStop[]
  stopClickEnabled: boolean
  selectedReferenceNodeId: number | null
  draftPoints: WorldMapPoint[]
  draftStopPoints: RouteMapViewerDisplay['stopPoints']
  pathUserBends: boolean[]
  referenceEditorProps: {
    nodes: NonNullable<RouteMapViewerDisplay['referenceEditor']>['nodes']
    segments: NonNullable<RouteMapViewerDisplay['referenceEditor']>['segments']
    lineStyle: NonNullable<RouteMapViewerDisplay['referenceEditor']>['lineStyle']
    config: NonNullable<RouteMapViewerDisplay['referenceEditor']>['config']
    segmentPassthrough: boolean
    allowSegmentDelete: boolean
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
): RouteMapInteractiveLayerState {
  const referenceStopDetails =
    display.referenceEditor && imageSize ? buildReferenceStopDetails(display, imageSize) : []

  const interactiveDrawStops = display.referenceEditor
    ? []
    : display.stops.length > 0
      ? display.stops
      : catalogStops.map((stop) => ({
          id: stop.id,
          point: stop.point,
          name: { zh: stop.stop.name.zh, en: stop.stop.name.en },
          seq: stop.seq,
        }))

  const interactiveStopDetails = display.referenceEditor
    ? referenceStopDetails
    : display.stops.length > 0
      ? display.stops.map((stop, index) => drawStopToRouteDetailMapStop(stop, index))
      : [...catalogStops]

  const stopClickEnabled = interactiveDrawStops.length > 0 || referenceStopDetails.length > 0

  const selectedReferenceNodeId =
    selectedStopId?.startsWith('ref-stop-')
      ? Number.parseInt(selectedStopId.slice('ref-stop-'.length), 10)
      : null

  return {
    interactiveDrawStops,
    interactiveStopDetails,
    referenceStopDetails,
    stopClickEnabled,
    selectedReferenceNodeId: Number.isFinite(selectedReferenceNodeId) ? selectedReferenceNodeId : null,
    draftPoints: display.referenceEditor ? [] : display.points,
    draftStopPoints: display.referenceEditor ? [] : display.stopPoints,
    pathUserBends: userBendIndicesToFlags(display.userBendIndices, display.points.length),
    referenceEditorProps: display.referenceEditor
      ? {
          nodes: display.referenceEditor.nodes,
          segments: display.referenceEditor.segments,
          lineStyle: display.referenceEditor.lineStyle,
          config: display.referenceEditor.config,
          segmentPassthrough: true,
          allowSegmentDelete: false,
          onNodeClick: referenceStopDetails.length ? onReferenceStopNodeClick : undefined,
          selectedNodeId: Number.isFinite(selectedReferenceNodeId) ? selectedReferenceNodeId : null,
        }
      : null,
  }
}
