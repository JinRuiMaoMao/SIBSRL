import { useMemo, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapCatalogStop } from '../utils/worldMapStopCatalog'
import { findMapDrawStopNameSuggestions, type DrawStopSuggestion } from '../utils/worldMapDrawRouteLookup'

export interface MapDrawStopNameSelection {
  zh: string
  en: string
  point?: WorldMapPoint
}

interface MapDrawStopNameFieldsProps {
  chiName: string
  engName: string
  routeId: string
  directionIndex: number
  catalog: readonly WorldMapCatalogStop[] | null
  chiPlaceholder?: string
  engPlaceholder?: string
  onChiNameChange: (value: string) => void
  onEngNameChange: (value: string) => void
  onSelectSuggestion: (selection: MapDrawStopNameSelection) => void
}

export function MapDrawStopNameFields({
  chiName,
  engName,
  routeId,
  directionIndex,
  catalog,
  chiPlaceholder,
  engPlaceholder,
  onChiNameChange,
  onEngNameChange,
  onSelectSuggestion,
}: MapDrawStopNameFieldsProps) {
  const { t } = useLocale()
  const [activeField, setActiveField] = useState<'chi' | 'eng'>('chi')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const query = activeField === 'chi' ? chiName : engName
  const suggestions = useMemo(
    () => findMapDrawStopNameSuggestions(query, routeId, directionIndex, catalog),
    [catalog, directionIndex, query, routeId],
  )

  const applySuggestion = (suggestion: DrawStopSuggestion) => {
    onSelectSuggestion({
      zh: suggestion.zh,
      en: suggestion.en,
      point: suggestion.point,
    })
    setShowSuggestions(false)
  }

  const suggestionTag = (suggestion: DrawStopSuggestion) => {
    if (suggestion.fromRouteDetail) return t('mapDrawStopSuggestRoute')
    if (suggestion.fromCatalog) return t('mapDrawStopSuggestCatalog')
    return null
  }

  return (
    <div className="map-draw-stop-name-fields">
      <label className="route-editor-field">
        <span>{t('mapDrawNodeChiName')}</span>
        <input
          value={chiName}
          onChange={(event) => {
            setActiveField('chi')
            onChiNameChange(event.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => {
            setActiveField('chi')
            setShowSuggestions(true)
          }}
          onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
          placeholder={chiPlaceholder}
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <label className="route-editor-field">
        <span>{t('mapDrawNodeEngName')}</span>
        <input
          value={engName}
          onChange={(event) => {
            setActiveField('eng')
            onEngNameChange(event.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => {
            setActiveField('eng')
            setShowSuggestions(true)
          }}
          onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
          placeholder={engPlaceholder}
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      {showSuggestions && suggestions.length > 0 ? (
        <ul className="map-draw-stop-name-suggestions" role="listbox">
          {suggestions.map((suggestion) => {
            const tag = suggestionTag(suggestion)
            return (
              <li key={`${suggestion.zh}|${suggestion.en}`} role="option">
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applySuggestion(suggestion)}
                >
                  <span>
                    {suggestion.zh}
                    {tag ? <span className="map-draw-stop-name-suggestion-tag">{tag}</span> : null}
                  </span>
                  {suggestion.en && suggestion.en !== suggestion.zh ? (
                    <span className="map-draw-stop-name-suggestion-en">{suggestion.en}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
