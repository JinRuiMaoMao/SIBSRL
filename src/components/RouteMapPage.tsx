import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { fetchRouteMapImport, saveRouteMapImport, UserApiError } from '../api/userApi'
import { useAppDialog } from '../contexts/AppDialogContext'
import { useAuth } from '../contexts/AuthContext'
import { fitNormalizedViewToRoutePoints, getWorldMapRoutePoints } from '../data/worldMapRoutes'
import { useIsMapAdmin } from '../hooks/useIsMapAdmin'
import { useLocale } from '../i18n/LocaleContext'
import { getRouteMapImageUrl } from '../utils/routeMapImages'
import { resolveRouteMapLookupIds, routeMapIdsMatch } from '../utils/routeMapLookup'
import {
  buildRouteMapViewerDisplay,
  buildSimpleRouteMapViewerDisplay,
  userBendIndicesToFlags,
  type RouteMapViewerDisplay,
} from '../utils/routeMapViewerDisplay'
import { parseWorldMapDrawImportJson } from '../utils/worldMapRouteImport'
import { readCachedRouteMapImport, writeCachedRouteMapImport } from '../storage/routeMapImportCache'
import { IslandMapPanZoomSurface, type NormalizedMapView } from './IslandMapPanZoomSurface'
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

function resolveStaticImageUrl(routeId: string): string {
  return getRouteMapImageUrl(routeId, 'path', false, 'png')
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

  const mapSrc = MAP_URLS[layer]
  const title = routeId ? `${routeId} · ${t('routeMapViewPath')}` : t('routeMapViewPath')

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

    void (async () => {
      const lookupIds = resolveRouteMapLookupIds(routeId)
      let payload: unknown | null = null

      for (const id of lookupIds) {
        const response = await fetchRouteMapImport(id)
        if (response?.payload) {
          payload = response.payload
          break
        }
      }

      if (!payload) {
        payload = readCachedRouteMapImport(routeId)
      }

      if (cancelled) return

      if (payload) {
        setImportPayload(payload)
        setLoading(false)
        return
      }

      const worldPoints = routeId ? getWorldMapRoutePoints(routeId, 0) : null
      if (worldPoints && worldPoints.length >= 2) {
        setDisplay(buildSimpleRouteMapViewerDisplay(routeId, worldPoints))
        setLoading(false)
        return
      }

      setStaticImageUrl(resolveStaticImageUrl(routeId))
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [routeId])

  useEffect(() => {
    if (!importPayload || !imageSize) return
    const parsed = parseWorldMapDrawImportJson(importPayload)
    if (!parsed || parsed.kind !== 'route') {
      setDisplay(null)
      return
    }
    const nextDisplay = buildRouteMapViewerDisplay(parsed, imageSize.width, imageSize.height, routeId || parsed.routeId)
    setDisplay(nextDisplay)
  }, [imageSize, importPayload, routeId])

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
      const parsed = parseWorldMapDrawImportJson(raw)
      if (!parsed || parsed.kind !== 'route') {
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
      setImportPayload(raw)
      setStaticImageUrl(null)
      setStaticImageVisible(false)
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
  const preparingDisplay = Boolean(importPayload && !display)
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

        {!loading && !preparingDisplay && showInteractiveMap && display ? (
          <div className="route-map-page-viewport">
            <IslandMapPanZoomSurface
              src={mapSrc}
              mode="fullscreen"
              className="route-map-page-map"
              view={mapView}
              onViewChange={setMapView}
              drawInteraction="route"
              draftPoints={display.referenceEditor ? [] : display.points}
              draftStopPoints={display.referenceEditor ? [] : display.stopPoints}
              draftStops={display.stops}
              draftPathNodes={display.pathNodes}
              draftRouteNumber={display.routeNumber}
              pathLegStarts={display.legStarts}
              pathLegHidden={display.pathLegHidden}
              pathUserBends={userBendIndicesToFlags(display.userBendIndices, display.points.length)}
              showStopLabels
              stopLabelScale={1}
              maxZoomRatio={8}
              onImageSizeChange={setImageSize}
              referenceEditor={
                display.referenceEditor
                  ? {
                      nodes: display.referenceEditor.nodes,
                      segments: display.referenceEditor.segments,
                      lineStyle: display.referenceEditor.lineStyle,
                      config: display.referenceEditor.config,
                      selectedNodeId: null,
                      connectPendingNodeId: null,
                      connectPreview: null,
                      previewNode: null,
                    }
                  : null
              }
            />
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
