import type { RefObject } from 'react'
import type { SearchSyntaxCollapseOptions } from '../hooks/useSearchSyntaxCollapse'
import { useLocale } from '../i18n/LocaleContext'
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
  syntaxCollapse?: SearchSyntaxCollapseOptions
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
  syntaxCollapse,
}: SearchToolbarProps) {
  const { t } = useLocale()

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
        syntaxCollapse={syntaxCollapse}
      />
      <div className="search-toolbar-actions">
        <button
          type="button"
          className="random-route-btn"
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
