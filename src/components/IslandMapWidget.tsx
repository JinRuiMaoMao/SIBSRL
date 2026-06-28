import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOptionalIslandMapOverlay } from '../contexts/IslandMapOverlayContext'
import { fitNormalizedViewToRoutePoints, resolveWorldMapRouteId, type WorldMapPoint } from '../data/worldMapRoutes'
import { useIsMapAdmin } from '../hooks/useIsMapAdmin'
import { useLocale } from '../i18n/LocaleContext'
import {
  buildWorldMapRouteExportPayload,
  copyWorldMapRouteJson,
  downloadWorldMapRouteJson,
} from '../utils/worldMapRouteExport'
import { IslandMapDrawColorPicker } from './IslandMapDrawColorPicker'
import { IslandMapPanZoomSurface, type NormalizedMapView } from './IslandMapPanZoomSurface'
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
  draftPoints: readonly WorldMapPoint[],
  draftStrokeColor: string,
  onDraftPointAdd: (point: WorldMapPoint) => void,
  onDraftPointUndo: () => void,
) {
  return {
    src: mapSrc,
    mode,
    view: mapView,
    onViewChange: handleViewChange,
    routeOverlay: surfaceRouteOverlay,
    drawMode,
    draftPoints,
    draftStrokeColor,
    onDraftPointAdd,
    onDraftPointUndo,
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
  const [draftPoints, setDraftPoints] = useState<WorldMapPoint[]>([])
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

  const onDraftPointAdd = useCallback((point: WorldMapPoint) => {
    setDraftPoints((current) => [...current, point])
  }, [])

  const onDraftPointUndo = useCallback(() => {
    setDraftPoints((current) => current.slice(0, -1))
  }, [])

  const clearDraft = useCallback(() => {
    setDraftPoints([])
  }, [])

  const toggleDrawMode = useCallback(() => {
    setDrawMode((current) => {
      const next = !current
      if (next) {
        setLayer('detailed')
        setDraftPoints((points) => {
          if (points.length > 0) return points
          return routeOverlay ? [...routeOverlay.points] : points
        })
      }
      return next
    })
  }, [routeOverlay])

  const handleExport = useCallback(async () => {
    const points = draftPoints.length >= 2 ? draftPoints : routeOverlay?.points ?? draftPoints
    const payload = buildWorldMapRouteExportPayload(drawRouteId, drawDirectionIndex, points)
    if (!payload) {
      showExportHint(t('islandMapDrawExportNeedPoints'))
      return
    }
    downloadWorldMapRouteJson(payload)
    const copied = await copyWorldMapRouteJson(payload)
    showExportHint(copied ? t('islandMapDrawExportDone') : t('islandMapDrawExportDownloaded'))
  }, [drawDirectionIndex, drawRouteId, draftPoints, routeOverlay?.points, showExportHint, t])

  const mapSrc = MAP_URLS[layer]
  const surfaceRouteOverlay = routeOverlay
    ? { routeNumber: routeOverlay.routeNumber, points: routeOverlay.points }
    : null
  const exportPoints = draftPoints.length >= 2 ? draftPoints : routeOverlay?.points ?? draftPoints
  const canExport = buildWorldMapRouteExportPayload(drawRouteId, drawDirectionIndex, exportPoints) != null

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
          onClick={onDraftPointUndo}
          disabled={draftPoints.length === 0}
          title={t('islandMapDrawUndoHint')}
        >
          {t('islandMapDrawUndo')}
        </button>
        <button
          type="button"
          className="island-map-btn"
          onClick={clearDraft}
          disabled={draftPoints.length === 0}
          title={t('islandMapDrawClearHint')}
        >
          {t('islandMapDrawClear')}
        </button>
        <button
          type="button"
          className="island-map-btn island-map-btn--export"
          onClick={() => void handleExport()}
          disabled={!canExport}
          title={t('islandMapDrawExportHint')}
        >
          {t('islandMapDrawExport')}
        </button>
      </div>
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
          {t('islandMapDrawPointCount', { count: draftPoints.length })}
        </span>
      </div>
      <IslandMapDrawColorPicker color={drawColor} onColorChange={setDrawColor} />
      {drawMode ? <p className="island-map-draw-help">{t('islandMapDrawHelp')}</p> : null}
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
          draftPoints,
          drawColor,
          onDraftPointAdd,
          onDraftPointUndo,
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
            draftPoints,
            drawColor,
            onDraftPointAdd,
            onDraftPointUndo,
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
