import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOptionalIslandMapOverlay } from '../contexts/IslandMapOverlayContext'
import { useLocale } from '../i18n/LocaleContext'
import { getMapDrawPageHref } from '../utils/appPage'
import { getSiteAssetRoot } from '../utils/appLayoutMode'
import { stashMapDrawRouteHandoff } from '../utils/mapDrawRouteHandoff'
import { buildRouteMapInteractiveLayerState } from '../utils/routeMapInteractiveLayer'
import { routeDetailMapStopToDrawStop } from '../utils/routeDetailMapStops'
import { ExpandIcon } from './islandMapControlIcons'
import { IslandMapPanZoomSurface, type NormalizedMapView } from './IslandMapPanZoomSurface'
import { IslandMapStopDetailPopover } from './IslandMapStopDetailPopover'

type MapLayer = 'general' | 'detailed'

function mapLayerSrc(layer: MapLayer): string {
  const root = getSiteAssetRoot()
  return layer === 'general' ? `${root}maps/SIMapGerenal.png` : `${root}maps/SIMap.png`
}

/** Real 布局右侧嵌入地图（内联渲染，不用 portal）。 */
export function IslandMapEmbeddedPane() {
  const { t } = useLocale()
  const overlayContext = useOptionalIslandMapOverlay()
  const routeOverlay = overlayContext?.routeOverlay ?? null
  const importedPath = routeOverlay?.importedPath ?? null
  const [layer, setLayer] = useState<MapLayer>('general')
  const [mapView, setMapView] = useState<NormalizedMapView | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

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

  const toggleLayer = useCallback(() => {
    setLayer((current) => (current === 'general' ? 'detailed' : 'general'))
  }, [])

  const openDraw = useCallback(() => {
    if (routeOverlay) stashMapDrawRouteHandoff(routeOverlay)
    window.location.href = getMapDrawPageHref()
  }, [routeOverlay])

  useEffect(() => {
    document.documentElement.classList.toggle('island-map-fullscreen-open', expanded)
    return () => document.documentElement.classList.remove('island-map-fullscreen-open')
  }, [expanded])

  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expanded])

  const surface = (
    <IslandMapPanZoomSurface
      src={mapSrc}
      mode="fullscreen"
      className={`island-map-viewport island-map-viewport--${expanded ? 'fullscreen' : 'embedded'}`}
      view={mapView}
      onViewChange={setMapView}
      routeOverlay={surfaceRouteOverlay}
      maxZoomRatio={8}
      onImageSizeChange={setImageSize}
      {...stopSurfaceProps}
    />
  )

  if (expanded) {
    return (
      <div className="island-map island-map--fullscreen" role="dialog" aria-modal="true" aria-label={t('islandMapAria')}>
        <div className="island-map-viewport-shell island-map-viewport-shell--fullscreen">
          {surface}
          {stopDetailPopover}
        </div>
        <div className="island-map-controls island-map-controls--fullscreen">
          <div className="island-map-controls-row">
            <button type="button" className="island-map-btn island-map-btn--layers" onClick={toggleLayer}>
              {t('islandMapLayers')}
            </button>
            <button type="button" className="island-map-btn island-map-btn--draw" onClick={openDraw}>
              {t('islandMapDraw')}
            </button>
            <button
              type="button"
              className="island-map-btn island-map-btn--minimize"
              onClick={() => setExpanded(false)}
              aria-label={t('islandMapMinimize')}
            >
              {t('islandMapMinimize')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`island-map island-map--embedded${routeOverlay ? ' island-map--embedded-route' : ''}`.trim()}
      aria-label={t('islandMapAria')}
    >
      <div className="island-map-viewport-shell island-map-viewport-shell--embedded">
        {surface}
        {stopDetailPopover}
      </div>
      <div className="island-map-widget-toolbar island-map-widget-toolbar--embedded">
        <button
          type="button"
          className="island-map-btn island-map-btn--layers island-map-btn--layers-compact"
          onClick={toggleLayer}
          aria-label={t('islandMapLayersAria')}
        >
          {t('islandMapLayers')}
        </button>
        <button
          type="button"
          className="island-map-btn island-map-btn--expand"
          onClick={() => setExpanded(true)}
          aria-label={t('islandMapExpand')}
        >
          <ExpandIcon />
        </button>
        <button type="button" className="island-map-btn island-map-btn--draw" onClick={openDraw}>
          {t('islandMapDraw')}
        </button>
      </div>
    </div>
  )
}
