import { useLocale } from '../i18n/LocaleContext'
import type { RouteGroupFilter, RouteTypeFilter } from '../types/route'
import { FilterMenu } from './FilterMenu'
import { RouteFilters } from './RouteFilters'
import { SearchBar } from './SearchBar'

interface SearchToolbarProps {
  value: string
  onChange: (value: string) => void
  resultCount: number
  totalCount: number
  randomEligibleCount: number
  onRandom: () => void
  filtersActive: boolean
  routeGroup: RouteGroupFilter
  zone: number | 'all'
  operator: string | 'all'
  type: RouteTypeFilter | 'all'
  zones: number[]
  operators: string[]
  types: RouteTypeFilter[]
  onRouteGroupChange: (group: RouteGroupFilter) => void
  onZoneChange: (zone: number | 'all') => void
  onOperatorChange: (op: string | 'all') => void
  onTypeChange: (type: RouteTypeFilter | 'all') => void
}

export function SearchToolbar({
  value,
  onChange,
  resultCount,
  totalCount,
  randomEligibleCount,
  onRandom,
  filtersActive,
  routeGroup,
  zone,
  operator,
  type,
  zones,
  operators,
  types,
  onRouteGroupChange,
  onZoneChange,
  onOperatorChange,
  onTypeChange,
}: SearchToolbarProps) {
  const { t } = useLocale()

  return (
    <div className="search-toolbar">
      <SearchBar
        value={value}
        onChange={onChange}
        resultCount={resultCount}
        totalCount={totalCount}
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
            routeGroup={routeGroup}
            zone={zone}
            operator={operator}
            type={type}
            zones={zones}
            operators={operators}
            types={types}
            onRouteGroupChange={onRouteGroupChange}
            onZoneChange={onZoneChange}
            onOperatorChange={onOperatorChange}
            onTypeChange={onTypeChange}
          />
        </FilterMenu>
      </div>
    </div>
  )
}
