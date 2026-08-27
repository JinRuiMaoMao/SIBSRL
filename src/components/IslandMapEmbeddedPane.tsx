import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOptionalIslandMapOverlay } from '../contexts/IslandMapOverlayContext'
import { useRouteMapViewerDisplayForImageSize } from '../hooks/useRouteMapViewerDisplayForImageSize'
import { useLocale } from '../i18n/LocaleContext'
import { fitNormalizedViewToRoutePoints } from '../data/worldMapRoutes'
import { resolveSiteAssetUrl } from '../utils/appLayoutMode'
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

/** Real 布局右侧嵌入地图（内联渲染，不用 portal）。 */
export function IslandMapEmbeddedPane() {
  const { t } = useLocale()
  const overlayContext = useOptionalIslandMapOverlay()
  const routeOverlay = overlayContext?.routeOverlay ?? null
  const [layer, setLayer] = useState<MapLayer>('general')
  const [mapLayerLoading, setMapLayerLoading] = useState(false)
  const [mapView, setMapView] = useState<NormalizedMapView | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const importedPath =
    useRouteMapViewerDisplayForImageSize(routeOverlay, imageSize) ?? routeOverlay?.importedPath ?? null

  const mapSrc = mapLayerSrc(layer)
  const surfaceRouteOverlay =
    routeOverlay && !importedPath
      ? { routeNumber: routeOverlay.routeNumber, points: routeOverlay.points }
      : null

  const catalogStops = useMemo(
    () => (routeOverlay?.stops?.length ? routeOverlay.stops : []),
    [routeOverlay?.stops],
  )
  const showStopsOnMap = catalogStops.length > 0

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
    const fitPoints =
      importedPath.fitPoints && importedPath.fitPoints.length >= 2
        ? importedPath.fitPoints
        : routeOverlay?.points.length
          ? routeOverlay.points
          : importedPath.points
    return buildRouteMapInteractiveLayerState(
      { ...importedPath, fitPoints: [...fitPoints] },
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
        ...(showStopsOnMap ? { draftStopPoints: importedPath!.stopPoints } : {}),
        ...(showStopsOnMap ? { draftStops: interactiveLayer.interactiveDrawStops } : {}),
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
              selectedNodeId: showStopsOnMap ? selectedReferenceNodeId : null,
              connectPendingNodeId: null,
              connectPreview: null,
              previewNode: null,
              segmentPassthrough: interactiveLayer.referenceEditorProps.segmentPassthrough,
              allowSegmentDelete: interactiveLayer.referenceEditorProps.allowSegmentDelete,
              continuousSegmentPaths: interactiveLayer.referenceEditorProps.continuousSegmentPaths,
              onNodeClick: showStopsOnMap
                ? interactiveLayer.referenceEditorProps.onNodeClick
                : undefined,
            }
          : null,
      }
    : {}

  const stopSurfaceProps = importedPath
    ? {
        ...importedSurfaceProps,
        ...(showStopsOnMap
          ? {
              draftStops,
              selectedStopId,
              onStopClick: interactiveLayer?.stopClickEnabled ? handleStopClick : undefined,
              showStopLabels: true,
            }
          : {}),
      }
    : showStopsOnMap
      ? {
          draftStops,
          selectedStopId,
          onStopClick: handleStopClick,
          showStopLabels: true,
        }
      : {}

  const stopDetailPopover =
    showStopsOnMap && selectedStop && routeOverlay ? (
      <IslandMapStopDetailPopover
        stop={selectedStop}
        currentRouteId={routeOverlay.routeId}
        onClose={closeStopDetail}
      />
    ) : null

  useEffect(() => {
    setSelectedStopId(null)
  }, [routeOverlay?.directionIndex, routeOverlay?.importedPath, routeOverlay?.routeId])

  useEffect(() => {
    const points =
      importedPath?.fitPoints && importedPath.fitPoints.length >= 2
        ? importedPath.fitPoints
        : routeOverlay?.points
    if (!points || points.length < 2) return
    setMapView(fitNormalizedViewToRoutePoints(points, 'fullscreen', 0.08))
  }, [
    importedPath?.fitPoints,
    routeOverlay?.directionIndex,
    routeOverlay?.routeId,
    routeOverlay?.points,
  ])

  const toggleLayer = useCallback(() => {
    setLayer((current) => (current === 'general' ? 'detailed' : 'general'))
  }, [])

  return (
    <div
      className={`island-map island-map--embedded${routeOverlay ? ' island-map--embedded-route' : ''}`.trim()}
      aria-label={t('islandMapAria')}
    >
      <div className="island-map-viewport-shell island-map-viewport-shell--embedded">
        <IslandMapPanZoomSurface
          src={mapSrc}
          mode="fullscreen"
          className="island-map-viewport island-map-viewport--embedded"
          view={mapView}
          onViewChange={setMapView}
          routeOverlay={surfaceRouteOverlay}
          maxZoomRatio={8}
          showZoomControls
          onImageSizeChange={setImageSize}
          onMapLayerLoadingChange={setMapLayerLoading}
          {...stopSurfaceProps}
        />
        {stopDetailPopover}
        <button
          type="button"
          className="island-map-btn island-map-btn--layers island-map-layers-control"
          onClick={toggleLayer}
          aria-busy={mapLayerLoading}
          aria-label={t('islandMapLayersAria')}
          title={layer === 'general' ? t('islandMapLayerDetailed') : t('islandMapLayerGeneral')}
        >
          {t('islandMapLayers')}
        </button>
        <div className="route-real-map-hints" aria-hidden="true">
          <span className="route-real-map-hint">
            <span className="route-real-map-hint-icon">🖱</span>
            {t('realMapMoveHint')}
          </span>
          <span className="route-real-map-hint">
            <span className="route-real-map-hint-icon">🖱</span>
            {t('realMapZoomHint')}
          </span>
        </div>
        <p className="route-real-map-info-banner">{t('realMapCommunityHint')}</p>
      </div>
    </div>
  )
}
