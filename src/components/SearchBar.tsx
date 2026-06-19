import { useMemo, useState, type RefObject } from 'react'
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
  searchHistory?: string[]
  onApplyHistory?: (query: string) => void
  onClearHistory?: () => void
  inputRef?: RefObject<HTMLInputElement | null>
  showShortcutHint?: boolean
  syntaxVisible?: boolean
  onSyntaxToggle?: () => void
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
  searchHistory = [],
  onApplyHistory,
  onClearHistory,
  inputRef,
  showShortcutHint = true,
  syntaxVisible = true,
  onSyntaxToggle,
}: SearchBarProps) {
  const { t } = useLocale()
  const [focused, setFocused] = useState(false)
  const suggestions = useMemo(() => getRouteSearchSuggestions(value), [value])
  const showHistory = focused && !value.trim() && searchHistory.length > 0

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
          ref={inputRef}
          id={id}
          type="search"
          placeholder={t(placeholderKey)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
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

      {showHistory ? (
        <div className="search-history" aria-label={t('searchHistory')}>
          <div className="search-history-head">
            <span className="search-history-title">{t('searchHistory')}</span>
            {onClearHistory ? (
              <button type="button" className="search-history-clear" onClick={onClearHistory}>
                {t('searchHistoryClear')}
              </button>
            ) : null}
          </div>
          <div className="search-history-chips">
            {searchHistory.map((item) => (
              <button
                key={item}
                type="button"
                className="search-history-chip"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onApplyHistory?.(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showShortcutHint ? (
        <div className="search-help">
          <div className="search-help-bar">
            <p className="search-shortcut-hint">
              <span>{t('searchShortcutHint')}</span>
              <span className="search-shortcut-sep" aria-hidden>
                {' · '}
              </span>
              <span className="search-shortcut-close">
                Esc {t('closeDetail')}
              </span>
            </p>
            {onSyntaxToggle ? (
              <button
                type="button"
                className="search-syntax-toggle"
                aria-expanded={syntaxVisible}
                aria-controls="search-syntax-panel"
                onClick={onSyntaxToggle}
              >
                {syntaxVisible ? t('searchSyntaxCollapse') : t('searchSyntaxExpand')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
