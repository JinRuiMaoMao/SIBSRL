import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'
import {
  applySearchCompletion,
  getSearchCompletions,
  isSearchCompletionActive,
  shouldShowSearchCompletionPanel,
  type SearchCompletion,
} from '../utils/searchCompletions'

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
  dataTour?: string
}

function resolveCompletionDescription(
  completion: SearchCompletion,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): string {
  if (!completion.descriptionKey) return completion.replacement

  const vars: Record<string, string | number> = { ...completion.descriptionVars }
  if (typeof vars.nameKey === 'string') {
    vars.name = t(vars.nameKey as MessageKey)
    delete vars.nameKey
  }

  return t(completion.descriptionKey, vars)
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
  dataTour = 'route-search',
}: SearchBarProps) {
  const { t } = useLocale()
  const [focused, setFocused] = useState(false)
  const [tabCycleIndex, setTabCycleIndex] = useState(-1)
  const tabApplyingRef = useRef(false)
  const completions = useMemo(() => getSearchCompletions(value), [value])
  const completionSignature = useMemo(
    () => completions.map((item) => item.replacement).join('\0'),
    [completions],
  )
  const showHistory = focused && !value.trim() && searchHistory.length > 0
  const showCompletionPanel =
    focused && value.trim().length > 0 && shouldShowSearchCompletionPanel(value, completions)
  const tabCompletionsAvailable = focused && completions.length > 0

  useEffect(() => {
    setTabCycleIndex(-1)
  }, [completionSignature])

  const applyCompletion = (completion: SearchCompletion, index: number) => {
    tabApplyingRef.current = true
    setTabCycleIndex(index)
    onChange(applySearchCompletion(value, completion))
  }

  return (
    <div className="search-bar-wrap">
      <div className="search-bar" data-tour={dataTour}>
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
          onChange={(e) => {
            if (!tabApplyingRef.current) {
              setTabCycleIndex(-1)
            }
            tabApplyingRef.current = false
            onChange(e.target.value)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && tabCompletionsAvailable) {
              e.preventDefault()
              const next = (tabCycleIndex + 1) % completions.length
              applyCompletion(completions[next]!, next)
              return
            }

            if (e.key === 'ArrowDown' && showCompletionPanel) {
              e.preventDefault()
              const next =
                tabCycleIndex < 0 ? 0 : Math.min(completions.length - 1, tabCycleIndex + 1)
              setTabCycleIndex(next)
              return
            }

            if (e.key === 'ArrowUp' && showCompletionPanel) {
              e.preventDefault()
              const next =
                tabCycleIndex < 0
                  ? completions.length - 1
                  : Math.max(0, tabCycleIndex - 1)
              setTabCycleIndex(next)
              return
            }

            if (e.key === 'Enter') {
              e.preventDefault()
              onSearchCommit?.()
            }
          }}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showCompletionPanel}
          aria-controls={showCompletionPanel ? `${id}-completions` : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            showCompletionPanel && tabCycleIndex >= 0
              ? `${id}-completion-${tabCycleIndex}`
              : undefined
          }
        />
        <span className="search-meta" aria-live="polite">
          {t('routeCount', { count: resultCount, total: totalCount })}
        </span>

        {showCompletionPanel ? (
          <div
            id={`${id}-completions`}
            className="search-completion-panel"
            role="listbox"
            aria-label={t('searchCompletionPanelLabel')}
          >
            <p className="search-completion-hint">{t('searchCompletionTabHint')}</p>
            {completions.map((completion, index) => {
              const active = isSearchCompletionActive(completion, value, tabCycleIndex, index)
              return (
                <button
                  key={`${completion.kind}-${completion.replacement}`}
                  id={`${id}-completion-${index}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`search-completion-option ${active ? 'active' : ''}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyCompletion(completion, index)}
                >
                  <code className="search-completion-code">{completion.replacement}</code>
                  <span className="search-completion-desc">
                    {resolveCompletionDescription(completion, t)}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

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
