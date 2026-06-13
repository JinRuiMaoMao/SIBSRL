import { useMemo } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import {
  getRouteSearchSuggestions,
  isRouteSearchSuggestionActive,
  parseRouteNumberPatternQuery,
} from '../utils/routeSearchQuery'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearchCommit?: () => void
  resultCount: number
  totalCount: number
  id?: string
  labelKey?: MessageKey
  placeholderKey?: MessageKey
}

function suggestionLabel(suggestion: string, t: (key: MessageKey, vars?: Record<string, string | number>) => string): string {
  const pattern = parseRouteNumberPatternQuery(suggestion)
  if (pattern?.kind === 'prefix') {
    return t('searchSuggestionPrefix', { value: pattern.value })
  }
  if (pattern?.kind === 'suffix') {
    return t('searchSuggestionSuffix', { value: pattern.value })
  }
  return suggestion
}

export function SearchBar({
  value,
  onChange,
  onSearchCommit,
  resultCount,
  totalCount,
  id = 'route-search',
  labelKey = 'searchLabel',
  placeholderKey = 'searchPlaceholder',
}: SearchBarProps) {
  const { t } = useLocale()
  const suggestions = useMemo(() => getRouteSearchSuggestions(value), [value])

  return (
    <div className="search-bar-wrap">
      <div className="search-bar">
        <label htmlFor={id} className="sr-only">
          {t(labelKey)}
        </label>
        <span className="search-icon" aria-hidden>
          ⌕
        </span>
        <input
          id={id}
          type="search"
          placeholder={t(placeholderKey)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSearchCommit?.()
            }
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <span className="search-meta" aria-live="polite">
          {t('routeCount', { count: resultCount, total: totalCount })}
        </span>
      </div>

      {suggestions.length > 0 ? (
        <div className="search-suggestions" role="listbox" aria-label={t('searchLabel')}>
          {suggestions.map((suggestion) => {
            const active = isRouteSearchSuggestionActive(suggestion, value)
            return (
              <button
                key={suggestion}
                type="button"
                role="option"
                aria-selected={active}
                className={`search-suggestion-chip ${active ? 'active' : ''}`}
                onClick={() => onChange(suggestion)}
              >
                <code className="search-suggestion-code">{suggestion}</code>
                <span className="search-suggestion-desc">{suggestionLabel(suggestion, t)}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
