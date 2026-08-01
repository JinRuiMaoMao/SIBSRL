import type { RefObject } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import { isRealLayoutMode, getAlternateLayoutRoutesHref } from '../utils/appLayoutMode'
import type { RouteTypeFilter } from '../types/route'
import { FilterMenu } from './FilterMenu'
import { RouteFilters } from './RouteFilters'
import { SearchBar } from './SearchBar'

interface SearchToolbarProps {
  value: string
  onChange: (value: string) => void
  onSearchCommit?: () => void
  resultCount: number
  totalCount: number
  randomEligibleCount: number
  onRandom: () => void
  filtersActive: boolean
  zone: number | 'all'
  operator: string | 'all'
  type: RouteTypeFilter | 'all'
  excludedZones: number[]
  excludedOperators: string[]
  excludedTypes: RouteTypeFilter[]
  zones: number[]
  operators: string[]
  types: RouteTypeFilter[]
  onZoneChange: (zone: number | 'all') => void
  onOperatorChange: (op: string | 'all') => void
  onTypeChange: (type: RouteTypeFilter | 'all') => void
  searchHistory?: string[]
  onApplyHistory?: (query: string) => void
  onClearHistory?: () => void
  searchInputRef?: RefObject<HTMLInputElement | null>
  showShortcutHint?: boolean
  syntaxVisible?: boolean
  onSyntaxToggle?: () => void
}

export function SearchToolbar({
  value,
  onChange,
  onSearchCommit,
  resultCount,
  totalCount,
  randomEligibleCount,
  onRandom,
  filtersActive,
  zone,
  operator,
  type,
  excludedZones,
  excludedOperators,
  excludedTypes,
  zones,
  operators,
  types,
  onZoneChange,
  onOperatorChange,
  onTypeChange,
  searchHistory,
  onApplyHistory,
  onClearHistory,
  searchInputRef,
  showShortcutHint = true,
  syntaxVisible,
  onSyntaxToggle,
}: SearchToolbarProps) {
  const { t } = useLocale()
  const realLayout = isRealLayoutMode()
  const alternateLayoutHref = getAlternateLayoutRoutesHref()

  return (
    <div className="search-toolbar">
      <SearchBar
        value={value}
        onChange={onChange}
        onSearchCommit={onSearchCommit}
        resultCount={resultCount}
        totalCount={totalCount}
        searchHistory={searchHistory}
        onApplyHistory={onApplyHistory}
        onClearHistory={onClearHistory}
        inputRef={searchInputRef}
        showShortcutHint={showShortcutHint}
        syntaxVisible={syntaxVisible}
        onSyntaxToggle={onSyntaxToggle}
      />
      <div className="search-toolbar-actions">
        <a
          className={`route-layout-toggle-btn${realLayout ? ' route-layout-toggle-btn--active' : ''}`}
          href={alternateLayoutHref}
          aria-label={t('routeLookupLayoutToggleAria')}
          title={realLayout ? t('routeLookupLayoutGrid') : t('routeLookupLayoutSplit')}
        >
          {realLayout ? t('routeLookupLayoutGrid') : t('routeLookupLayoutSplit')}
        </a>
        <button
          type="button"
          className="random-route-btn"
          data-tour="random-route"
          onClick={onRandom}
          disabled={randomEligibleCount === 0}
          aria-label={t('randomRouteAria')}
          title={t('randomRouteAria')}
        >
          {t('randomRoute')}
        </button>
        <FilterMenu active={filtersActive}>
          <RouteFilters
            zone={zone}
            operator={operator}
            type={type}
            excludedZones={excludedZones}
            excludedOperators={excludedOperators}
            excludedTypes={excludedTypes}
            zones={zones}
            operators={operators}
            types={types}
            onZoneChange={onZoneChange}
            onOperatorChange={onOperatorChange}
            onTypeChange={onTypeChange}
          />
        </FilterMenu>
      </div>
    </div>
  )
}
