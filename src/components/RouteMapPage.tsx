import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { saveRouteMapImport, UserApiError } from '../api/userApi'
import { routes } from '../data/routes'
import { useAppDialog } from '../contexts/AppDialogContext'
import { useAuth } from '../contexts/AuthContext'
import { fitNormalizedViewToRoutePoints } from '../data/worldMapRoutes'
import { useIsMapAdmin } from '../hooks/useIsMapAdmin'
import { useLocale } from '../i18n/LocaleContext'
import {
  clearCachedRouteMapImport,
  writeCachedRouteMapImport,
} from '../storage/routeMapImportCache'
import {
  buildRouteDetailMapStops,
  type RouteDetailMapStop,
} from '../utils/routeDetailMapStops'
import { buildRouteMapInteractiveLayerState } from '../utils/routeMapInteractiveLayer'
import { getRouteMapImageUrl } from '../utils/routeMapImages'
import { parseRouteMapImportPayload } from '../utils/routeMapImportPayload'
import { findRouteForMapPage, routeMapIdsMatch } from '../utils/routeMapLookup'
import { resolveRouteMapImportRaw } from '../utils/routeMapOverlaySource'
import { resolveActiveStopGroup } from '../utils/routeLoopView'
import { mergeRoutesByBaseNumber } from '../utils/routeMerge'
import { readDirectionQueryFromLocation } from '../utils/routeNavigation'
import {
  buildRouteMapViewerDisplay,
  buildSimpleRouteMapViewerDisplay,
  userBendIndicesToFlags,
  type RouteMapViewerDisplay,
} from '../utils/routeMapViewerDisplay'
import { resolveRouteMapOverlaySource } from '../utils/routeMapOverlaySource'
import { loadWorldMapStopCatalog } from '../utils/worldMapStopCatalog'
import { IslandMapPanZoomSurface, type NormalizedMapView } from './IslandMapPanZoomSurface'
import { StopDetailPanel } from './StopDetailPanel'
import '../styles/routeMapPage.css'

type MapLayer = 'general' | 'detailed'

const MAP_URLS: Record<MapLayer, string> = {
  general: './maps/SIMapGerenal.png',
  detailed: './maps/SIMap.png',
}

const STATIC_IMAGE_EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg']

function readRouteIdFromLocation(): string {
  return new URLSearchParams(window.location.search).get('route')?.trim() ?? ''
}

function buildBackHref(routeId: string): string {
  if (!routeId) return './routes.html'
  return `./routes.html?route=${encodeURIComponent(routeId)}`
}

function readImportJsonText(text: string): unknown {
  return JSON.parse(text.replace(/^\uFEFF/, '').trim())
}

async function resolveImportPayload(routeId: string): Promise<unknown | null> {
  return resolveRouteMapImportRaw(routeId)
}

export function RouteMapPage() {
  const routeId = readRouteIdFromLocation()
  const { t } = useLocale()
  const { token } = useAuth()
  const isAdmin = useIsMapAdmin()
  const { alert, confirm } = useAppDialog()
  const importInputRef = useRef<HTMLInputElement>(null)

  const [layer, setLayer] = useState<MapLayer>('general')
  const [mapView, setMapView] = useState<NormalizedMapView | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [importPayload, setImportPayload] = useState<unknown | null>(null)
  const [display, setDisplay] = useState<RouteMapViewerDisplay | null>(null)
  const [staticImageUrl, setStaticImageUrl] = useState<string | null>(null)
  const [staticImageVisible, setStaticImageVisible] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importInvalid, setImportInvalid] = useState(false)
  const [catalogStops, setCatalogStops] = useState<RouteDetailMapStop[]>([])
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)

  const mapSrc = MAP_URLS[layer]
  const title = routeId ? `${routeId} · ${t('routeMapViewPath')}` : t('routeMapViewPath')
  const resolvedRoute = useMemo(
    () => findRouteForMapPage(routeId, mergeRoutesByBaseNumber(routes)),
    [routeId],
  )
  const directionIndex = readDirectionQueryFromLocation() ?? 0
  const routeStops = useMemo(() => {
    if (!resolvedRoute) return []
    const activeGroup = resolveActiveStopGroup(resolvedRoute, directionIndex, false)
    return activeGroup?.list ?? []
  }, [directionIndex, resolvedRoute])

  const beginStaticFallback = useCallback(() => {
    setImportPayload(null)
    setDisplay(null)
    setImportInvalid(false)
    setStaticImageUrl(getRouteMapImageUrl(routeId, 'path', false, 'png'))
    setStaticImageVisible(false)
  }, [routeId])

  const applyFitView = useCallback((nextDisplay: RouteMapViewerDisplay | null) => {
    if (!nextDisplay || nextDisplay.fitPoints.length < 2) return
    setMapView(fitNormalizedViewToRoutePoints(nextDisplay.fitPoints, 'fullscreen'))
  }, [])

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled || img.naturalWidth <= 0 || img.naturalHeight <= 0) return
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      if (!cancelled) setImageSize(null)
    }
    img.src = mapSrc
    return () => {
      cancelled = true
    }
  }, [mapSrc])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setImportPayload(null)
    setDisplay(null)
    setStaticImageUrl(null)
    setStaticImageVisible(false)
    setImportInvalid(false)

    void (async () => {
      const payload = routeId ? await resolveImportPayload(routeId) : null

      if (cancelled) return

      if (payload) {
        setImportPayload(payload)
        setLoading(false)
        return
      }

      const worldOverlay = routeId
        ? await resolveRouteMapOverlaySource(routeId, directionIndex)
        : null
      if (worldOverlay && worldOverlay.points.length >= 2) {
        setDisplay(buildSimpleRouteMapViewerDisplay(routeId, worldOverlay.points))
        setLoading(false)
        return
      }

      beginStaticFallback()
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [beginStaticFallback, directionIndex, routeId])

  useEffect(() => {
    if (!importPayload || !imageSize) return

    try {
      const parsed = parseRouteMapImportPayload(importPayload)
      if (!parsed) {
        clearCachedRouteMapImport(routeId)
        setImportInvalid(true)
        beginStaticFallback()
        return
      }

      const nextDisplay = buildRouteMapViewerDisplay(
        parsed,
        imageSize.width,
        imageSize.height,
        routeId || parsed.routeId,
      )

      if (!nextDisplay) {
        clearCachedRouteMapImport(routeId)
        setImportInvalid(true)
        beginStaticFallback()
        return
      }

      setImportInvalid(false)
      setDisplay(nextDisplay)
    } catch (error) {
      console.error('[route-map] failed to build imported display', error)
      clearCachedRouteMapImport(routeId)
      setImportInvalid(true)
      beginStaticFallback()
    }
  }, [beginStaticFallback, imageSize, importPayload, routeId])

  useEffect(() => {
    if (!resolvedRoute) {
      setCatalogStops([])
      return
    }

    let cancelled = false
    void loadWorldMapStopCatalog().then((catalog) => {
      if (cancelled) return
      const activeGroup = resolveActiveStopGroup(resolvedRoute, directionIndex, false)
      const stops = activeGroup?.list ? buildRouteDetailMapStops(activeGroup.list, catalog) : []
      setCatalogStops(stops)
    })

    return () => {
      cancelled = true
    }
  }, [directionIndex, resolvedRoute])

  useEffect(() => {
    setSelectedStopId(null)
  }, [directionIndex, display, routeId])

  const handleStopClick = useCallback((stopId: string) => {
    setSelectedStopId((current) => (current === stopId ? null : stopId))
  }, [])

  const selectedReferenceNodeId = useMemo(() => {
    if (!selectedStopId?.startsWith('ref-stop-')) return null
    const nodeId = Number.parseInt(selectedStopId.slice('ref-stop-'.length), 10)
    return Number.isFinite(nodeId) ? nodeId : null
  }, [selectedStopId])

  const interactiveLayer = useMemo(() => {
    if (!display) return null
    return buildRouteMapInteractiveLayerState(
      display,
      imageSize,
      catalogStops,
      null,
      (nodeId) => handleStopClick(`ref-stop-${nodeId}`),
      routeStops,
    )
  }, [catalogStops, display, handleStopClick, imageSize, routeStops])

  const interactiveStopDetails = interactiveLayer?.interactiveStopDetails ?? catalogStops
  const selectedStop = useMemo(() => {
    if (!selectedStopId) return null
    return interactiveStopDetails.find((stop) => stop.id === selectedStopId) ?? null
  }, [interactiveStopDetails, selectedStopId])

  const stopClickEnabled = interactiveLayer?.stopClickEnabled ?? false

  useEffect(() => {
    applyFitView(display)
  }, [applyFitView, display])

  useEffect(() => {
    if (!staticImageUrl || display || importPayload) return
    let cancelled = false
    let attempt = 0

    const tryNext = () => {
      if (cancelled || attempt >= STATIC_IMAGE_EXTENSIONS.length) {
        setStaticImageVisible(false)
        return
      }
      const url = getRouteMapImageUrl(routeId, 'path', false, STATIC_IMAGE_EXTENSIONS[attempt]!)
      attempt += 1
      const image = new Image()
      image.onload = () => {
        if (cancelled) return
        setStaticImageUrl(url)
        setStaticImageVisible(true)
      }
      image.onerror = tryNext
      image.src = url
    }

    tryNext()
    return () => {
      cancelled = true
    }
  }, [display, importPayload, routeId, staticImageUrl])

  const handleImportClick = () => {
    if (!isAdmin) {
      void alert({ message: t('routeMapImportAdminOnly') })
      return
    }
    importInputRef.current?.click()
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !token || !routeId) return

    setImporting(true)
    try {
      const raw = readImportJsonText(await file.text())
      const parsed = parseRouteMapImportPayload(raw)
      if (!parsed) {
        await alert({ message: t('routeMapImportInvalid') })
        return
      }

      if (!routeMapIdsMatch(parsed.routeId, routeId)) {
        const proceed = await confirm({
          message: t('routeMapImportRouteMismatch', { expected: routeId, actual: parsed.routeId }),
        })
        if (!proceed) return
      }

      await saveRouteMapImport(token, routeId, raw)
      writeCachedRouteMapImport(routeId, raw)
      setImportInvalid(false)
      setStaticImageUrl(null)
      setStaticImageVisible(false)
      setDisplay(null)
      setImportPayload(raw)
      await alert({ message: t('routeMapImportSuccess') })
    } catch (error) {
      const message =
        error instanceof UserApiError ? error.message : t('routeMapImportFailed')
      await alert({ message })
    } finally {
      setImporting(false)
    }
  }

  const showInteractiveMap = Boolean(
    display &&
      (display.points.length >= 2 ||
        display.referenceEditor ||
        display.stops.length > 0),
  )
  const preparingDisplay = Boolean(importPayload && !display && !importInvalid)
  const showEmpty = !loading && !preparingDisplay && !showInteractiveMap && !staticImageVisible

  return (
    <div className="route-map-page-root">
      <header className="route-map-page-toolbar">
        <a className="route-map-page-back" href={buildBackHref(routeId)}>
          {t('routeMapBack')}
        </a>
        <h1 className="route-map-page-title">{title}</h1>
        <div className="route-map-page-actions">
          <button
            type="button"
            className="island-map-btn island-map-btn--layers"
            onClick={() => setLayer((current) => (current === 'general' ? 'detailed' : 'general'))}
          >
            {t('islandMapLayers')}
          </button>
          {isAdmin ? (
            <button
              type="button"
              className="island-map-btn island-map-btn--import"
              onClick={handleImportClick}
              disabled={importing || !routeId}
              title={t('routeMapImportHint')}
            >
              {importing ? t('routeMapImporting') : t('routeMapImport')}
            </button>
          ) : null}
        </div>
      </header>

      <div className="route-map-page-body">
        {loading || preparingDisplay ? (
          <p className="route-map-page-status">{t('routeMapLoading')}</p>
        ) : null}

        {importInvalid ? (
          <p className="route-map-page-status">{t('routeMapImportInvalidCached')}</p>
        ) : null}

        {!loading && !preparingDisplay && showInteractiveMap && display ? (
          <div className="route-map-page-viewport">
            <IslandMapPanZoomSurface
              src={mapSrc}
              mode="fullscreen"
              className="route-map-page-map"
              view={mapView}
              onViewChange={setMapView}
              draftPoints={interactiveLayer?.draftPoints ?? display.points}
              draftStopPoints={interactiveLayer?.draftStopPoints ?? display.stopPoints}
              draftStops={interactiveLayer?.interactiveDrawStops ?? []}
              draftPathNodes={interactiveLayer?.draftPathNodes ?? []}
              draftRouteNumber={display.routeNumber}
              pathLegStarts={display.legStarts}
              pathLegHidden={display.pathLegHidden}
              pathUserBends={interactiveLayer?.pathUserBends ?? userBendIndicesToFlags(display.userBendIndices, display.points.length)}
              showStopLabels
              stopLabelScale={1}
              selectedStopId={selectedStopId}
              onStopClick={stopClickEnabled ? handleStopClick : undefined}
              trajectoryPath={interactiveLayer?.trajectoryPath ?? []}
              maxZoomRatio={8}
              onImageSizeChange={setImageSize}
              referenceEditor={
                interactiveLayer?.referenceEditorProps
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
                  : null
              }
            />
            {selectedStop && resolvedRoute ? (
              <div className="route-map-page-stop-popover">
                <StopDetailPanel
                  stop={selectedStop.stop}
                  seq={selectedStop.seq}
                  currentRouteId={resolvedRoute.id}
                  onClose={() => setSelectedStopId(null)}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading && !showInteractiveMap && staticImageVisible && staticImageUrl ? (
          <div className="route-map-page-static">
            <img className="route-map-page-static-image" src={staticImageUrl} alt={title} />
          </div>
        ) : null}

        {showEmpty ? (
          <p className="route-map-page-empty">
            {routeId ? t('routeMapEmpty', { routeId }) : t('routeMapMissingRouteId')}
          </p>
        ) : null}
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        className="route-map-page-import-input"
        onChange={(event) => void handleImportFile(event)}
      />
    </div>
  )
}
