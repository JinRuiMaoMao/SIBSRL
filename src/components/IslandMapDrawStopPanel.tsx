import { useMemo, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { IslandMapDrawInteraction, WorldMapDrawStop, WorldMapDrawStopDraft } from '../types/worldMapDraw'
import { findStopsMatchingQuery } from '../utils/routeStopLookup'
import { resolveStopByQuery } from '../utils/routeBetweenStops'

interface IslandMapDrawStopPanelProps {
  interaction: IslandMapDrawInteraction
  onInteractionChange: (interaction: IslandMapDrawInteraction) => void
  stops: readonly WorldMapDrawStop[]
  pendingStop: WorldMapDrawStopDraft | null
  onPendingQueryChange: (query: string) => void
  onConfirmPendingStop: () => void
  onCancelPendingStop: () => void
  onRemoveStop: (id: string) => void
}

export function IslandMapDrawStopPanel({
  interaction,
  onInteractionChange,
  stops,
  pendingStop,
  onPendingQueryChange,
  onConfirmPendingStop,
  onCancelPendingStop,
  onRemoveStop,
}: IslandMapDrawStopPanelProps) {
  const { t, locale } = useLocale()
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions = useMemo(() => {
    if (!pendingStop?.query.trim()) return []
    return findStopsMatchingQuery(pendingStop.query).slice(0, 8)
  }, [pendingStop?.query])

  const applySuggestion = (zh: string, en: string) => {
    onPendingQueryChange(locale.startsWith('zh') ? zh : en || zh)
    setShowSuggestions(false)
  }

  const handleConfirm = () => {
    const query = pendingStop?.query.trim() ?? ''
    if (!query) return
    const matched = resolveStopByQuery(query)
    if (matched) {
      onPendingQueryChange(locale.startsWith('zh') ? matched.zh : matched.en || matched.zh)
    }
    onConfirmPendingStop()
    setShowSuggestions(false)
  }

  return (
    <div className="island-map-draw-stop-panel">
      <div className="island-map-draw-panel-row">
        <button
          type="button"
          className={`island-map-btn${interaction === 'route' ? ' island-map-btn--active' : ''}`.trim()}
          onClick={() => onInteractionChange('route')}
          aria-pressed={interaction === 'route'}
        >
          {t('islandMapDrawRouteMode')}
        </button>
        <button
          type="button"
          className={`island-map-btn${interaction === 'virtual' ? ' island-map-btn--active' : ''}`.trim()}
          onClick={() => onInteractionChange('virtual')}
          aria-pressed={interaction === 'virtual'}
        >
          {t('islandMapDrawVirtualMode')}
        </button>
        <button
          type="button"
          className={`island-map-btn${interaction === 'catalog' ? ' island-map-btn--active' : ''}`.trim()}
          onClick={() => onInteractionChange('catalog')}
          aria-pressed={interaction === 'catalog'}
        >
          {t('islandMapDrawCatalogMode')}
        </button>
      </div>

      <p className="island-map-draw-help">
        {interaction === 'route'
          ? t('islandMapDrawRouteHelp')
          : interaction === 'virtual'
            ? t('islandMapDrawVirtualHelp')
            : t('islandMapDrawCatalogHelp')}
      </p>

      {pendingStop ? (
        <div className="island-map-draw-stop-form">
          <label className="island-map-draw-field island-map-draw-field--color">
            <span>{t('islandMapDrawStopName')}</span>
            <input
              value={pendingStop.query}
              onChange={(event) => {
                onPendingQueryChange(event.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleConfirm()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  onCancelPendingStop()
                }
              }}
              placeholder={t('islandMapDrawStopNamePlaceholder')}
              spellCheck={false}
              autoFocus
            />
          </label>
          {showSuggestions && suggestions.length > 0 ? (
            <ul className="island-map-draw-stop-suggestions">
              {suggestions.map((stop) => (
                <li key={`${stop.zh}|${stop.en}`}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applySuggestion(stop.zh, stop.en)}
                  >
                    <span>{stop.zh}</span>
                    {stop.en ? <span className="island-map-draw-stop-suggestion-en">{stop.en}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="island-map-draw-panel-row">
            <button type="button" className="island-map-btn" onClick={handleConfirm}>
              {t('islandMapDrawStopConfirm')}
            </button>
            <button type="button" className="island-map-btn" onClick={onCancelPendingStop}>
              {t('islandMapDrawStopCancel')}
            </button>
          </div>
        </div>
      ) : null}

      {stops.length > 0 ? (
        <ul className="island-map-draw-stop-list">
          {stops.map((stop, index) => (
            <li key={stop.id}>
              <span>
                {interaction === 'route' ? `${index + 1}. ` : ''}
                {stop.name.zh}
                {stop.name.en && stop.name.en !== stop.name.zh ? ` / ${stop.name.en}` : ''}
              </span>
              <button
                type="button"
                className="island-map-draw-stop-remove"
                onClick={() => onRemoveStop(stop.id)}
                aria-label={t('islandMapDrawStopRemove')}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
