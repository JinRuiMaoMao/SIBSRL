import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOptionalIslandMapOverlay } from '../contexts/IslandMapOverlayContext'
import { fitNormalizedViewToRoutePoints, resolveWorldMapRouteId, type WorldMapPoint } from '../data/worldMapRoutes'
import { useIsMapAdmin } from '../hooks/useIsMapAdmin'
import { useGeneralMapRoadSnap } from '../hooks/useGeneralMapRoadSnap'
import { useLocale } from '../i18n/LocaleContext'
import {
  buildWorldMapCatalogStopsExportPayload,
  buildWorldMapRouteExportPayload,
  copyWorldMapCatalogStopsJson,
  copyWorldMapRouteJson,
  downloadWorldMapCatalogStopsJson,
  downloadWorldMapRouteJson,
} from '../utils/worldMapRouteExport'
import { rebuildDraftPathFromStops } from '../utils/worldMapDrawPath'
import { resolveStopByQuery } from '../utils/routeBetweenStops'
import type { IslandMapDrawInteraction, WorldMapDrawStop, WorldMapDrawStopDraft } from '../types/worldMapDraw'
import { IslandMapDrawColorPicker } from './IslandMapDrawColorPicker'
import { IslandMapDrawStopPanel } from './IslandMapDrawStopPanel'
import { IslandMapPanZoomSurface, DRAW_MAX_ZOOM_RATIO, type NormalizedMapView } from './IslandMapPanZoomSurface'
import { readStoredMapDrawColor } from '../utils/mapDrawColor'

type MapLayer = 'general' | 'detailed'

const MAP_URLS: Record<MapLayer, string> = {
  general: './maps/SIMapGerenal.png',
  detailed: './maps/SIMap.png',
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M5 9V5h4V3H3v6h2zm14-6h-6v2h4v4h2V3zM5 19v-4H3v6h6v-2H5zm14 0h-4v2h6v-6h-2v4z"
      />
    </svg>
  )
}

function MinimizeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M9 5H5v4H3V3h6v2zm10 0v6h-2V7h-4V5h6zM5 15v4h4v2H3v-6h2zm14 0h2v6h-6v-2h4v-4z"
      />
    </svg>
  )
}

function HideIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
      />
    </svg>
  )
}

function ShowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      />
    </svg>
  )
}

function surfaceProps(
  mapSrc: string,
  mode: 'widget' | 'fullscreen',
  className: string,
  mapView: NormalizedMapView | null,
  handleViewChange: (next: NormalizedMapView) => void,
  surfaceRouteOverlay: { routeNumber: string; points: readonly WorldMapPoint[] } | null,
  drawMode: boolean,
  drawInteraction: IslandMapDrawInteraction,
  draftPoints: readonly WorldMapPoint[],
  draftStopPoints: readonly WorldMapPoint[],
  draftStops: readonly WorldMapDrawStop[],
  pendingStopPoint: WorldMapPoint | null,
  draftStrokeColor: string,
  onDrawMapClick: (point: WorldMapPoint) => void,
  onDrawUndo: () => void,
  maxZoomRatio: number,
) {
  return {
    src: mapSrc,
    mode,
    view: mapView,
    onViewChange: handleViewChange,
    routeOverlay: surfaceRouteOverlay,
    drawMode,
    drawInteraction,
    draftPoints,
    draftStopPoints,
    draftStops,
    pendingStopPoint,
    draftStrokeColor,
    onDrawMapClick,
    onDrawUndo,
    maxZoomRatio,
    className,
  }
}

export function IslandMapWidget() {
  const { t } = useLocale()
  const isMapAdmin = useIsMapAdmin()
  const overlayContext = useOptionalIslandMapOverlay()
  const routeOverlay = overlayContext?.routeOverlay ?? null
  const [expanded, setExpanded] = useState(false)
  const [widgetHidden, setWidgetHidden] = useState(false)
  const [layer, setLayer] = useState<MapLayer>('general')
  const [mapView, setMapView] = useState<NormalizedMapView | null>(null)
  const [drawMode, setDrawMode] = useState(false)
  const [drawInteraction, setDrawInteraction] = useState<IslandMapDrawInteraction>('route')
  const roadSnap = useGeneralMapRoadSnap(isMapAdmin && drawMode)
  const [draftPoints, setDraftPoints] = useState<WorldMapPoint[]>([])
  const [draftStops, setDraftStops] = useState<WorldMapDrawStop[]>([])
  const [pendingStop, setPendingStop] = useState<WorldMapDrawStopDraft | null>(null)
  const [drawColor, setDrawColor] = useState(readStoredMapDrawColor)
  const [drawRouteId, setDrawRouteId] = useState('')
  const [drawDirectionIndex, setDrawDirectionIndex] = useState(0)
  const [exportHint, setExportHint] = useState<string | null>(null)
  const savedViewRef = useRef<NormalizedMapView | null>(null)
  const exportHintTimerRef = useRef<number | null>(null)

  const handleViewChange = useCallback((next: NormalizedMapView) => {
    setMapView(next)
  }, [])

  useEffect(() => {
    for (const url of Object.values(MAP_URLS)) {
      const image = new Image()
      image.decoding = 'async'
      image.src = url
    }
  }, [])

  useEffect(() => {
    if (!routeOverlay) {
      if (savedViewRef.current) {
        setMapView(savedViewRef.current)
        savedViewRef.current = null
      }
      return
    }
    savedViewRef.current = mapView
    setMapView(
      fitNormalizedViewToRoutePoints(routeOverlay.points, expanded ? 'fullscreen' : 'widget'),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refit when route overlay or mode changes
  }, [expanded, routeOverlay])

  useEffect(() => {
    if (!routeOverlay) return
    setDrawRouteId(routeOverlay.routeId)
    setDrawDirectionIndex(routeOverlay.directionIndex)
  }, [routeOverlay])

  useEffect(() => {
    if (!isMapAdmin) {
      setDrawMode(false)
      setDraftPoints([])
      setDraftStops([])
      setPendingStop(null)
    }
  }, [isMapAdmin])

  useEffect(() => {
    return () => {
      if (exportHintTimerRef.current != null) {
        window.clearTimeout(exportHintTimerRef.current)
      }
    }
  }, [])

  const showExportHint = useCallback((message: string) => {
    setExportHint(message)
    if (exportHintTimerRef.current != null) {
      window.clearTimeout(exportHintTimerRef.current)
    }
    exportHintTimerRef.current = window.setTimeout(() => {
      setExportHint(null)
      exportHintTimerRef.current = null
    }, 2600)
  }, [])

  const traceSegment = useCallback(
    (from: WorldMapPoint, to: WorldMapPoint) => roadSnap.appendSegment(from, to),
    [roadSnap],
  )

  const rebuildPath = useCallback(
    (stops: readonly WorldMapDrawStop[]) => {
      if (drawInteraction !== 'route') {
        setDraftPoints([])
        return
      }
      setDraftPoints(rebuildDraftPathFromStops(stops, traceSegment))
    },
    [drawInteraction, traceSegment],
  )

  const handleDrawMapClick = useCallback(
    (point: WorldMapPoint) => {
      if (pendingStop) return
      setPendingStop({ point: roadSnap.snap(point), query: '' })
    },
    [pendingStop, roadSnap],
  )

  const handleDrawUndo = useCallback(() => {
    if (pendingStop) {
      setPendingStop(null)
      return
    }
    setDraftStops((stops) => {
      const next = stops.slice(0, -1)
      rebuildPath(next)
      return next
    })
  }, [pendingStop, rebuildPath])

  const clearDraft = useCallback(() => {
    setDraftPoints([])
    setDraftStops([])
    setPendingStop(null)
  }, [])

  const handleRemoveStop = useCallback(
    (id: string) => {
      setDraftStops((stops) => {
        const next = stops.filter((stop) => stop.id !== id)
        rebuildPath(next)
        return next
      })
    },
    [rebuildPath],
  )

  const handleConfirmPendingStop = useCallback(() => {
    if (!pendingStop) return
    const query = pendingStop.query.trim()
    if (!query) return
    const matched = resolveStopByQuery(query)
    const name = matched
      ? { zh: matched.zh, en: matched.en || matched.zh }
      : { zh: query, en: query }
    setDraftStops((stops) => {
      const next = [
        ...stops,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          point: pendingStop.point,
          name,
        },
      ]
      rebuildPath(next)
      return next
    })
    setPendingStop(null)
  }, [pendingStop, rebuildPath])

  const handleInteractionChange = useCallback((interaction: IslandMapDrawInteraction) => {
    setDrawInteraction(interaction)
    setDraftPoints([])
    setDraftStops([])
    setPendingStop(null)
  }, [])

  const toggleDrawMode = useCallback(() => {
    setDrawMode((current) => {
      const next = !current
      if (next) {
        setLayer('general')
        setDrawInteraction('route')
        setDraftPoints([])
        setDraftStops([])
        setPendingStop(null)
      }
      return next
    })
  }, [])

  const handleExport = useCallback(async () => {
    if (drawInteraction === 'catalog') {
      const payload = buildWorldMapCatalogStopsExportPayload(draftStops)
      if (!payload) {
        showExportHint(t('islandMapDrawExportNeedCatalogStops'))
        return
      }
      downloadWorldMapCatalogStopsJson(payload)
      const copied = await copyWorldMapCatalogStopsJson(payload)
      showExportHint(copied ? t('islandMapDrawExportCatalogDone') : t('islandMapDrawExportCatalogDownloaded'))
      return
    }

    const payload = buildWorldMapRouteExportPayload(
      drawRouteId,
      drawDirectionIndex,
      draftPoints,
      draftStops,
    )
    if (!payload) {
      showExportHint(t('islandMapDrawExportNeedRoute'))
      return
    }
    downloadWorldMapRouteJson(payload)
    const copied = await copyWorldMapRouteJson(payload)
    showExportHint(copied ? t('islandMapDrawExportRouteDone') : t('islandMapDrawExportRouteDownloaded'))
  }, [
    drawDirectionIndex,
    drawInteraction,
    drawRouteId,
    draftPoints,
    draftStops,
    showExportHint,
    t,
  ])

  const mapSrc = MAP_URLS[layer]
  const surfaceRouteOverlay = routeOverlay
    ? { routeNumber: routeOverlay.routeNumber, points: routeOverlay.points }
    : null
  const canExport =
    drawInteraction === 'catalog'
      ? buildWorldMapCatalogStopsExportPayload(draftStops) != null
      : buildWorldMapRouteExportPayload(drawRouteId, drawDirectionIndex, draftPoints, draftStops) != null
  const surfaceMaxZoomRatio = drawMode ? DRAW_MAX_ZOOM_RATIO : 8
  const draftStopPoints = draftStops.map((stop) => stop.point)
  const canUndo = pendingStop != null || draftStops.length > 0
  const canClear = draftStops.length > 0 || pendingStop != null

  const openFullscreen = useCallback(() => setExpanded(true), [])
  const closeFullscreen = useCallback(() => setExpanded(false), [])
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
      if (event.key === 'Escape') closeFullscreen()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeFullscreen, expanded])

  const drawPanel = isMapAdmin ? (
    <div className="island-map-draw-panel">
      <div className="island-map-draw-panel-row">
        <button
          type="button"
          className={`island-map-btn island-map-btn--draw${drawMode ? ' island-map-btn--active' : ''}`.trim()}
          onClick={toggleDrawMode}
          aria-pressed={drawMode}
          title={drawMode ? t('islandMapDrawStopHint') : t('islandMapDrawStartHint')}
        >
          {drawMode ? t('islandMapDrawStop') : t('islandMapDrawStart')}
        </button>
        <button
          type="button"
          className="island-map-btn"
          onClick={handleDrawUndo}
          disabled={!canUndo}
          title={t('islandMapDrawUndoHint')}
        >
          {t('islandMapDrawUndo')}
        </button>
        <button
          type="button"
          className="island-map-btn"
          onClick={clearDraft}
          disabled={!canClear}
          title={t('islandMapDrawClearHint')}
        >
          {t('islandMapDrawClear')}
        </button>
        <button
          type="button"
          className="island-map-btn island-map-btn--export"
          onClick={() => void handleExport()}
          disabled={!canExport}
          title={
            drawInteraction === 'catalog'
              ? t('islandMapDrawExportCatalogHint')
              : t('islandMapDrawExportRouteHint')
          }
        >
          {t('islandMapDrawExport')}
        </button>
      </div>
      {drawInteraction === 'route' ? (
        <div className="island-map-draw-panel-row island-map-draw-panel-row--meta">
          <label className="island-map-draw-field">
            <span>{t('islandMapDrawRouteId')}</span>
            <input
              value={drawRouteId}
              onChange={(event) => setDrawRouteId(event.target.value.trim())}
              placeholder={resolveWorldMapRouteId('21A') ?? '21'}
              spellCheck={false}
            />
          </label>
          <label className="island-map-draw-field island-map-draw-field--direction">
            <span>{t('islandMapDrawDirection')}</span>
            <input
              type="number"
              min={0}
              max={9}
              value={drawDirectionIndex}
              onChange={(event) => setDrawDirectionIndex(Number(event.target.value) || 0)}
            />
          </label>
          <span className="island-map-draw-count">
            {t('islandMapDrawStopCount', { count: draftStops.length })}
          </span>
        </div>
      ) : (
        <div className="island-map-draw-panel-row island-map-draw-panel-row--meta">
          <span className="island-map-draw-count">
            {t('islandMapDrawStopCount', { count: draftStops.length })}
          </span>
        </div>
      )}
      {drawMode && drawInteraction === 'route' ? (
        <IslandMapDrawColorPicker color={drawColor} onColorChange={setDrawColor} />
      ) : null}
      {drawMode ? (
        <IslandMapDrawStopPanel
          interaction={drawInteraction}
          onInteractionChange={handleInteractionChange}
          stops={draftStops}
          pendingStop={pendingStop}
          onPendingQueryChange={(query) =>
            setPendingStop((current) => (current ? { ...current, query } : current))
          }
          onConfirmPendingStop={handleConfirmPendingStop}
          onCancelPendingStop={() => setPendingStop(null)}
          onRemoveStop={handleRemoveStop}
        />
      ) : null}
      {drawMode && drawInteraction === 'route' ? (
        <p className="island-map-draw-help">
          {roadSnap.loading ? t('islandMapDrawRoadLoading') : t('islandMapDrawHelp')}
        </p>
      ) : null}
      {exportHint ? <p className="island-map-draw-export-hint">{exportHint}</p> : null}
    </div>
  ) : null

  const node = expanded ? (
    <div
      className={`island-map island-map--fullscreen${drawMode ? ' island-map--draw-mode' : ''}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label={t('islandMapAria')}
    >
      <IslandMapPanZoomSurface
        {...surfaceProps(
          mapSrc,
          'fullscreen',
          'island-map-viewport island-map-viewport--fullscreen',
          mapView,
          handleViewChange,
          surfaceRouteOverlay,
          drawMode,
          drawInteraction,
          draftPoints,
          draftStopPoints,
          draftStops,
          pendingStop?.point ?? null,
          drawColor,
          handleDrawMapClick,
          handleDrawUndo,
          surfaceMaxZoomRatio,
        )}
      />
      <div className="island-map-controls island-map-controls--fullscreen">
        {drawPanel}
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
      className={`island-map island-map--widget${widgetHidden ? ' island-map--widget-collapsed' : ''}${routeOverlay ? ' island-map--widget-route' : ''}${drawMode ? ' island-map--draw-mode' : ''}`.trim()}
      aria-label={t('islandMapAria')}
    >
      {widgetHidden ? null : (
        <IslandMapPanZoomSurface
          {...surfaceProps(
            mapSrc,
            'widget',
            'island-map-viewport island-map-viewport--widget',
            mapView,
            handleViewChange,
            surfaceRouteOverlay,
            drawMode,
            drawInteraction,
            draftPoints,
            draftStopPoints,
            draftStops,
            pendingStop?.point ?? null,
            drawColor,
            handleDrawMapClick,
            handleDrawUndo,
            surfaceMaxZoomRatio,
          )}
        />
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
            {isMapAdmin ? (
              <button
                type="button"
                className={`island-map-btn island-map-btn--draw${drawMode ? ' island-map-btn--active' : ''}`.trim()}
                onClick={toggleDrawMode}
                aria-pressed={drawMode}
                title={drawMode ? t('islandMapDrawStopHint') : t('islandMapDrawStartHint')}
              >
                {drawMode ? t('islandMapDrawStop') : t('islandMapDraw')}
              </button>
            ) : null}
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
  return createPortal(node, document.body)
}
