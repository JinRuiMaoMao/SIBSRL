import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOptionalIslandMapOverlay } from '../contexts/IslandMapOverlayContext'
import { useLocale } from '../i18n/LocaleContext'
import { isRealLayoutMode, resolveSiteAssetUrl } from '../utils/appLayoutMode'
import { buildRouteMapInteractiveLayerState } from '../utils/routeMapInteractiveLayer'
import { routeDetailMapStopToDrawStop } from '../utils/routeDetailMapStops'
import { IslandMapPanZoomSurface, type NormalizedMapView } from './IslandMapPanZoomSurface'
import { IslandMapStopDetailPopover } from './IslandMapStopDetailPopover'

type MapLayer = 'general' | 'detailed'

function mapLayerSrc(layer: MapLayer): string {
  return layer === 'general'
    ? resolveSiteAssetUrl('./maps/SIMapGerenal.png')
    : resolveSiteAssetUrl('./maps/SIMap.png')
}

/** 线路查询页小地图：缩放、图层、走线展示。 */
export function IslandMapViewer() {
  const { t } = useLocale()
  const realLayout = isRealLayoutMode()
  const overlayContext = useOptionalIslandMapOverlay()
  const routeOverlay = overlayContext?.routeOverlay ?? null
  const importedPath = routeOverlay?.importedPath ?? null
  const [layer, setLayer] = useState<MapLayer>('general')
  const [mapView, setMapView] = useState<NormalizedMapView | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)

  const mapSrc = mapLayerSrc(layer)
  const surfaceRouteOverlay =
    routeOverlay && !importedPath
      ? { routeNumber: routeOverlay.routeNumber, points: routeOverlay.points }
      : null

  const catalogStops = useMemo(
    () => (routeOverlay?.stops?.length ? routeOverlay.stops : []),
    [routeOverlay?.stops],
  )

  const handleStopClick = useCallback((stopId: string) => {
    setSelectedStopId((current) => (current === stopId ? null : stopId))
  }, [])

  const handleReferenceStopNodeClick = useCallback(
    (nodeId: number) => {
      handleStopClick(`ref-stop-${nodeId}`)
    },
    [handleStopClick],
  )

  const routeStops = useMemo(
    () => catalogStops.map((entry) => entry.stop),
    [catalogStops],
  )

  const selectedReferenceNodeId = useMemo(() => {
    if (!selectedStopId?.startsWith('ref-stop-')) return null
    const nodeId = Number.parseInt(selectedStopId.slice('ref-stop-'.length), 10)
    return Number.isFinite(nodeId) ? nodeId : null
  }, [selectedStopId])

  const interactiveLayer = useMemo(() => {
    if (!importedPath) return null
    return buildRouteMapInteractiveLayerState(
      { ...importedPath, fitPoints: [...(routeOverlay?.points ?? importedPath.points)] },
      imageSize,
      catalogStops,
      null,
      handleReferenceStopNodeClick,
      routeStops,
    )
  }, [catalogStops, handleReferenceStopNodeClick, imageSize, importedPath, routeOverlay?.points, routeStops])

  const draftStops = useMemo(() => {
    if (interactiveLayer) return interactiveLayer.interactiveDrawStops
    return catalogStops.length ? catalogStops.map(routeDetailMapStopToDrawStop) : []
  }, [catalogStops, interactiveLayer])

  const selectedStop = useMemo(() => {
    if (!selectedStopId) return null
    if (interactiveLayer) {
      return interactiveLayer.interactiveStopDetails.find((stop) => stop.id === selectedStopId) ?? null
    }
    return catalogStops.find((stop) => stop.id === selectedStopId) ?? null
  }, [catalogStops, interactiveLayer, selectedStopId])

  const closeStopDetail = useCallback(() => setSelectedStopId(null), [])

  const importedSurfaceProps = interactiveLayer
    ? {
        draftPoints: interactiveLayer.draftPoints,
        draftStopPoints: importedPath!.stopPoints,
        draftStops: interactiveLayer.interactiveDrawStops,
        draftPathNodes: interactiveLayer.draftPathNodes,
        draftRouteNumber: importedPath!.routeNumber,
        pathLegStarts: importedPath!.legStarts,
        pathLegHidden: importedPath!.pathLegHidden,
        pathUserBends: interactiveLayer.pathUserBends,
        trajectoryPath: interactiveLayer.trajectoryPath,
        referenceEditor: interactiveLayer.referenceEditorProps
          ? {
              nodes: interactiveLayer.referenceEditorProps.nodes,
              segments: interactiveLayer.referenceEditorProps.segments,
              lineStyle: interactiveLayer.referenceEditorProps.lineStyle,
              config: interactiveLayer.referenceEditorProps.config,
              selectedNodeId: selectedReferenceNodeId,
              connectPendingNodeId: null,
              connectPreview: null,
              previewNode: null,
              segmentPassthrough: interactiveLayer.referenceEditorProps.segmentPassthrough,
              allowSegmentDelete: interactiveLayer.referenceEditorProps.allowSegmentDelete,
              continuousSegmentPaths: interactiveLayer.referenceEditorProps.continuousSegmentPaths,
              onNodeClick: interactiveLayer.referenceEditorProps.onNodeClick,
            }
          : null,
      }
    : {}

  const stopSurfaceProps = importedPath
    ? {
        ...importedSurfaceProps,
        draftStops,
        selectedStopId,
        onStopClick: interactiveLayer?.stopClickEnabled ? handleStopClick : undefined,
        showStopLabels: true,
      }
    : draftStops.length > 0
      ? {
          draftStops,
          selectedStopId,
          onStopClick: handleStopClick,
          showStopLabels: true,
        }
      : {}

  const stopDetailPopover =
    selectedStop && routeOverlay ? (
      <IslandMapStopDetailPopover
        stop={selectedStop}
        currentRouteId={routeOverlay.routeId}
        onClose={closeStopDetail}
      />
    ) : null

  useEffect(() => {
    setSelectedStopId(null)
  }, [routeOverlay?.directionIndex, routeOverlay?.importedPath, routeOverlay?.routeId])

  const handleViewChange = useCallback((next: NormalizedMapView) => {
    setMapView(next)
  }, [])

  const toggleLayer = useCallback(() => {
    setLayer((current) => (current === 'general' ? 'detailed' : 'general'))
  }, [])

  const node = realLayout ? null : (
    <div
      className={`island-map island-map--widget${routeOverlay ? ' island-map--widget-route' : ''}`.trim()}
      aria-label={t('islandMapAria')}
    >
      <div className="island-map-viewport-shell">
        <IslandMapPanZoomSurface
          src={mapSrc}
          mode="widget"
          className="island-map-viewport island-map-viewport--widget"
          view={mapView}
          onViewChange={handleViewChange}
          routeOverlay={surfaceRouteOverlay}
          maxZoomRatio={8}
          onImageSizeChange={setImageSize}
          {...stopSurfaceProps}
        />
        {stopDetailPopover}
        <button
          type="button"
          className="island-map-btn island-map-btn--layers island-map-layers-control"
          onClick={toggleLayer}
          aria-label={t('islandMapLayersAria')}
          title={layer === 'general' ? t('islandMapLayerDetailed') : t('islandMapLayerGeneral')}
        >
          {t('islandMapLayers')}
        </button>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return node
  return createPortal(node, document.body)
}
