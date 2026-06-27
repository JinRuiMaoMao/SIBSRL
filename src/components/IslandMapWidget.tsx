import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocale } from '../i18n/LocaleContext'
import { IslandMapPanZoomSurface } from './IslandMapPanZoomSurface'

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

export function IslandMapWidget() {
  const { t } = useLocale()
  const [expanded, setExpanded] = useState(false)
  const [layer, setLayer] = useState<MapLayer>('general')

  const mapSrc = MAP_URLS[layer]

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

  const node = expanded ? (
    <div
      className="island-map island-map--fullscreen"
      role="dialog"
      aria-modal="true"
      aria-label={t('islandMapAria')}
    >
      <IslandMapPanZoomSurface
        key={layer}
        src={mapSrc}
        mode="fullscreen"
        className="island-map-viewport island-map-viewport--fullscreen"
      />
      <div className="island-map-controls island-map-controls--fullscreen">
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
  ) : (
    <div className="island-map island-map--widget" aria-label={t('islandMapAria')}>
      <IslandMapPanZoomSurface
        key={layer}
        src={mapSrc}
        mode="widget"
        className="island-map-viewport island-map-viewport--widget"
      />
      <div className="island-map-widget-toolbar">
        <button
          type="button"
          className="island-map-btn island-map-btn--expand"
          onClick={openFullscreen}
          aria-label={t('islandMapExpand')}
          title={t('islandMapExpand')}
        >
          <ExpandIcon />
        </button>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return node
  return createPortal(node, document.body)
}
