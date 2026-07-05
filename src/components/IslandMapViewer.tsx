import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOptionalIslandMapOverlay } from '../contexts/IslandMapOverlayContext'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n/LocaleContext'
import { getMapDrawPageHref } from '../utils/appPage'
import { stashMapDrawRouteHandoff } from '../utils/mapDrawRouteHandoff'
import { buildRouteMapInteractiveLayerState } from '../utils/routeMapInteractiveLayer'
import { routeDetailMapStopToDrawStop } from '../utils/routeDetailMapStops'
import { ExpandIcon, HideIcon, MinimizeIcon, ShowIcon } from './islandMapControlIcons'
import { IslandMapDrawPermissionDialogs } from './IslandMapDrawPermissionDialogs'
import { IslandMapPanZoomSurface, type NormalizedMapView } from './IslandMapPanZoomSurface'
import { IslandMapStopDetailPopover } from './IslandMapStopDetailPopover'

type MapLayer = 'general' | 'detailed'

const MAP_URLS: Record<MapLayer, string> = {
  general: './maps/SIMapGerenal.png',
  detailed: './maps/SIMap.png',
}

/** 线路查询页小地图：缩放、图层、走线展示；全屏下已登录用户可跳转 map-draw.html。 */
export function IslandMapViewer() {
  const { t } = useLocale()
  const { isLoggedIn } = useAuth()
  const overlayContext = useOptionalIslandMapOverlay()
  const routeOverlay = overlayContext?.routeOverlay ?? null
  const importedPath = routeOverlay?.importedPath ?? null
  const [expanded, setExpanded] = useState(false)
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false)
  const [widgetHidden, setWidgetHidden] = useState(false)
  const [layer, setLayer] = useState<MapLayer>('general')
  const [mapView, setMapView] = useState<NormalizedMapView | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)

  const mapSrc = MAP_URLS[layer]
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

  const openFullscreen = useCallback(() => setExpanded(true), [])
  const closeFullscreen = useCallback(() => {
    setExpanded(false)
  }, [])
  const openDraw = useCallback(() => {
    if (!isLoggedIn) {
      setPermissionDialogOpen(true)
      return
    }
    if (routeOverlay) {
      stashMapDrawRouteHandoff(routeOverlay)
    }
    window.location.href = getMapDrawPageHref()
  }, [isLoggedIn, routeOverlay])
  const toggleLayer = useCallback(() => {
    setLayer((current) => (current === 'general' ? 'detailed' : 'general'))
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('island-map-fullscreen-open', expanded)
    return () => document.documentElement.classList.remove('island-map-fullscreen-open')
  }, [expanded])

  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      closeFullscreen()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeFullscreen, expanded])

  const renderSurface = (mode: 'widget' | 'fullscreen', className: string) => (
    <IslandMapPanZoomSurface
      src={mapSrc}
      mode={mode}
      className={className}
      view={mapView}
      onViewChange={handleViewChange}
      routeOverlay={surfaceRouteOverlay}
      maxZoomRatio={8}
      onImageSizeChange={setImageSize}
      {...stopSurfaceProps}
    />
  )

  const node = expanded ? (
    <div
      className="island-map island-map--fullscreen"
      role="dialog"
      aria-modal="true"
      aria-label={t('islandMapAria')}
    >
      <div className="island-map-viewport-shell island-map-viewport-shell--fullscreen">
        {renderSurface('fullscreen', 'island-map-viewport island-map-viewport--fullscreen')}
        {stopDetailPopover}
      </div>
      <div className="island-map-controls island-map-controls--fullscreen">
        <div className="island-map-controls-row">
          <button
            type="button"
            className="island-map-btn island-map-btn--layers"
            onClick={toggleLayer}
            aria-label={t('islandMapLayersAria')}
            title={layer === 'general' ? t('islandMapLayerDetailed') : t('islandMapLayerGeneral')}
          >
            {t('islandMapLayers')}
          </button>
          <button
            type="button"
            className="island-map-btn island-map-btn--draw"
            onClick={openDraw}
            title={isLoggedIn ? t('islandMapDrawStartHint') : t('islandMapDrawPermissionButtonHint')}
          >
            {t('islandMapDraw')}
          </button>
          <button
            type="button"
            className="island-map-btn island-map-btn--minimize"
            onClick={closeFullscreen}
            aria-label={t('islandMapMinimize')}
            title={t('islandMapMinimize')}
          >
            <MinimizeIcon />
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div
      className={`island-map island-map--widget${widgetHidden ? ' island-map--widget-collapsed' : ''}${routeOverlay ? ' island-map--widget-route' : ''}`.trim()}
      aria-label={t('islandMapAria')}
    >
      {widgetHidden ? null : (
        <div className="island-map-viewport-shell">
          {renderSurface('widget', 'island-map-viewport island-map-viewport--widget')}
          {stopDetailPopover}
        </div>
      )}
      <div className="island-map-widget-toolbar">
        {widgetHidden ? (
          <button
            type="button"
            className="island-map-btn island-map-btn--show"
            onClick={() => setWidgetHidden(false)}
            aria-label={t('islandMapShow')}
            title={t('islandMapShow')}
          >
            <ShowIcon />
          </button>
        ) : (
          <>
            <button
              type="button"
              className="island-map-btn island-map-btn--layers island-map-btn--layers-compact"
              onClick={toggleLayer}
              aria-label={t('islandMapLayersAria')}
              title={layer === 'general' ? t('islandMapLayerDetailed') : t('islandMapLayerGeneral')}
            >
              {t('islandMapLayers')}
            </button>
            <button
              type="button"
              className="island-map-btn island-map-btn--hide"
              onClick={() => setWidgetHidden(true)}
              aria-label={t('islandMapHide')}
              title={t('islandMapHide')}
            >
              <HideIcon />
            </button>
            <button
              type="button"
              className="island-map-btn island-map-btn--expand"
              onClick={openFullscreen}
              aria-label={t('islandMapExpand')}
              title={t('islandMapExpand')}
            >
              <ExpandIcon />
            </button>
          </>
        )}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return node
  return (
    <>
      {createPortal(node, document.body)}
      <IslandMapDrawPermissionDialogs
        open={permissionDialogOpen}
        onCancel={() => setPermissionDialogOpen(false)}
        onGoRegister={() => {
          window.location.href = './account.html'
        }}
      />
    </>
  )
}
