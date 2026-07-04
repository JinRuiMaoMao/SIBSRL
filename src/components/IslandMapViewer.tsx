import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOptionalIslandMapOverlay } from '../contexts/IslandMapOverlayContext'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../i18n/LocaleContext'
import { getMapDrawPageHref } from '../utils/appPage'
import { stashMapDrawRouteHandoff } from '../utils/mapDrawRouteHandoff'
import { ExpandIcon, HideIcon, MinimizeIcon, ShowIcon } from './islandMapControlIcons'
import { IslandMapDrawPermissionDialogs } from './IslandMapDrawPermissionDialogs'
import { IslandMapPanZoomSurface, type NormalizedMapView } from './IslandMapPanZoomSurface'

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
  const [expanded, setExpanded] = useState(false)
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false)
  const [widgetHidden, setWidgetHidden] = useState(false)
  const [layer, setLayer] = useState<MapLayer>('general')
  const [mapView, setMapView] = useState<NormalizedMapView | null>(null)

  const mapSrc = MAP_URLS[layer]
  const surfaceRouteOverlay = routeOverlay
    ? { routeNumber: routeOverlay.routeNumber, points: routeOverlay.points }
    : null

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

  const node = expanded ? (
    <div
      className="island-map island-map--fullscreen"
      role="dialog"
      aria-modal="true"
      aria-label={t('islandMapAria')}
    >
      <IslandMapPanZoomSurface
        src={mapSrc}
        mode="fullscreen"
        className="island-map-viewport island-map-viewport--fullscreen"
        view={mapView}
        onViewChange={handleViewChange}
        routeOverlay={surfaceRouteOverlay}
        maxZoomRatio={8}
      />
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
        <IslandMapPanZoomSurface
          src={mapSrc}
          mode="widget"
          className="island-map-viewport island-map-viewport--widget"
          view={mapView}
          onViewChange={handleViewChange}
          routeOverlay={surfaceRouteOverlay}
          maxZoomRatio={8}
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
