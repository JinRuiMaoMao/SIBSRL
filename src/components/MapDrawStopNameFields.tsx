import { useMemo, useState, type KeyboardEvent } from 'react'
import { getPrimaryText } from '../i18n/displayText'
import { useLocale } from '../i18n/LocaleContext'
import { isChineseLocale } from '../i18n/types'
import type { WorldMapPoint } from '../data/worldMapRoutes'
import type { WorldMapCatalogStop } from '../utils/worldMapStopCatalog'
import { findMapDrawStopNameSuggestions, type DrawStopSuggestion } from '../utils/worldMapDrawRouteLookup'

export interface MapDrawStopNameSelection {
  zh: string
  en: string
  point?: WorldMapPoint
  seq?: number
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
  onEnter?: () => void
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
  onEnter,
}: MapDrawStopNameFieldsProps) {
  const { locale, t } = useLocale()
  const [activeField, setActiveField] = useState<'chi' | 'eng'>(isChineseLocale(locale) ? 'chi' : 'eng')
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
      seq: suggestion.seq,
    })
    setShowSuggestions(false)
  }

  const handleSuggestionPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    suggestion: DrawStopSuggestion,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    applySuggestion(suggestion)
  }

  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    setShowSuggestions(false)
    onEnter?.()
  }

  const suggestionTag = (suggestion: DrawStopSuggestion) => {
    if (suggestion.fromRouteDetail) return t('mapDrawStopSuggestRoute')
    if (suggestion.fromCatalog) return t('mapDrawStopSuggestCatalog')
    return null
  }

  const chiFirst = isChineseLocale(locale)

  const renderInput = (field: 'chi' | 'eng', tier: 'primary' | 'secondary') => {
    const isChi = field === 'chi'
    const value = isChi ? chiName : engName
    const placeholder = isChi ? chiPlaceholder : engPlaceholder
    const onChange = isChi ? onChiNameChange : onEngNameChange

    return (
      <input
        key={field}
        type="text"
        className={`map-draw-stop-name-stack-input map-draw-stop-name-stack-input--${tier}`}
        value={value}
        aria-label={isChi ? 'Chinese stop name' : 'English stop name'}
        onChange={(event) => {
          setActiveField(field)
          onChange(event.target.value)
          setShowSuggestions(true)
        }}
        onFocus={() => {
          setActiveField(field)
          setShowSuggestions(true)
        }}
        onBlur={() => window.setTimeout(() => setShowSuggestions(false), 180)}
        onKeyDown={handleEnter}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
      />
    )
  }

  const orderedFields: Array<'chi' | 'eng'> = chiFirst ? ['chi', 'eng'] : ['eng', 'chi']

  return (
    <div className="map-draw-stop-name-fields">
      <div className="map-draw-stop-name-stack">
        {renderInput(orderedFields[0]!, 'primary')}
        {renderInput(orderedFields[1]!, 'secondary')}
      </div>
      {showSuggestions && suggestions.length > 0 ? (
        <ul className="map-draw-stop-name-suggestions" role="listbox">
          {suggestions.map((suggestion) => {
            const tag = suggestionTag(suggestion)
            const primary = chiFirst
              ? getPrimaryText({ zh: suggestion.zh, en: suggestion.en }, locale)
              : suggestion.en || suggestion.zh
            const primaryLabel =
              suggestion.seq != null && suggestion.seq > 0 ? `${suggestion.seq}. ${primary}` : primary
            const secondary = chiFirst
              ? suggestion.en && suggestion.en !== suggestion.zh
                ? suggestion.en
                : null
              : suggestion.zh !== suggestion.en
                ? getPrimaryText({ zh: suggestion.zh, en: suggestion.en }, locale)
                : null
            return (
              <li key={`${suggestion.zh}|${suggestion.en}`} role="option">
                <button
                  type="button"
                  onPointerDown={(event) => handleSuggestionPointerDown(event, suggestion)}
                >
                  <span className="map-draw-stop-name-suggestion-primary">
                    {primaryLabel}
                    {tag ? <span className="map-draw-stop-name-suggestion-tag">{tag}</span> : null}
                  </span>
                  {secondary ? (
                    <span className="map-draw-stop-name-suggestion-secondary">{secondary}</span>
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
