import { useMemo, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { IslandMapDrawInteraction, WorldMapDrawStop, WorldMapDrawStopDraft } from '../types/worldMapDraw'
import { findDrawStopSuggestions } from '../utils/worldMapDrawRouteLookup'
import { resolveStopByQuery } from '../utils/routeBetweenStops'

interface IslandMapDrawStopPanelProps {
  interaction: IslandMapDrawInteraction
  routeId: string
  directionIndex: number
  stops: readonly WorldMapDrawStop[]
  pendingStop: WorldMapDrawStopDraft | null
  onPendingQueryChange: (query: string) => void
  onConfirmPendingStop: () => void
  onCancelPendingStop: () => void
  onRemoveStop: (id: string) => void
}

export function IslandMapDrawStopPanel({
  interaction,
  routeId,
  directionIndex,
  stops,
  pendingStop,
  onPendingQueryChange,
  onConfirmPendingStop,
  onCancelPendingStop,
  onRemoveStop,
}: IslandMapDrawStopPanelProps) {
  const { t, locale } = useLocale()
  const [showSuggestions, setShowSuggestions] = useState(false)

  const addedStopKeys = useMemo(
    () => new Set(stops.map((stop) => `${stop.name.zh}|${stop.name.en || stop.name.zh}`)),
    [stops],
  )

  const suggestions = useMemo(() => {
    if (interaction !== 'route' || !pendingStop) return []
    return findDrawStopSuggestions(pendingStop.query, routeId, directionIndex, addedStopKeys)
  }, [addedStopKeys, directionIndex, interaction, pendingStop, routeId])

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
                    <span>
                      {stop.zh}
                      {stop.fromRouteDetail ? (
                        <span className="island-map-draw-stop-suggestion-route">{t('islandMapDrawStopFromRoute')}</span>
                      ) : null}
                    </span>
                    {stop.en && stop.en !== stop.zh ? (
                      <span className="island-map-draw-stop-suggestion-en">{stop.en}</span>
                    ) : null}
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
