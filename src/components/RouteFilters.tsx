import { OPERATORS } from '../data/routes'
import { TYPE_FILTER_KEYS } from '../i18n/routeTypes'
import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import type { RouteGroupFilter, RouteTypeFilter } from '../types/route'

interface RouteFiltersProps {
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

export function RouteFilters({
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
}: RouteFiltersProps) {
  const { locale, t } = useLocale()

  return (
    <div className="filters">
      <div className="filter-group">
        <span className="filter-label">{t('filterRouteGroup')}</span>
        <div className="chip-row">
          <button
            type="button"
            className={`chip ${routeGroup === 'all' ? 'active' : ''}`}
            onClick={() => onRouteGroupChange('all')}
          >
            {t('filterAll')}
          </button>
          <button
            type="button"
            className={`chip ${routeGroup === 'normal' ? 'active' : ''}`}
            onClick={() => onRouteGroupChange('normal')}
          >
            {t('routeGroupNormal')}
          </button>
          <button
            type="button"
            className={`chip ${routeGroup === 'daily' ? 'active' : ''}`}
            onClick={() => onRouteGroupChange('daily')}
          >
            {t('routeGroupDaily')}
          </button>
          <button
            type="button"
            className={`chip ${routeGroup === 'seasonal' ? 'active' : ''}`}
            onClick={() => onRouteGroupChange('seasonal')}
          >
            {t('routeGroupSeasonal')}
          </button>
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">{t('filterZone')}</span>
        <div className="chip-row">
          <button
            type="button"
            className={`chip ${zone === 'all' ? 'active' : ''}`}
            onClick={() => onZoneChange('all')}
          >
            {t('filterAll')}
          </button>
          {zones.map((z) => (
            <button
              key={z}
              type="button"
              className={`chip ${zone === z ? 'active' : ''}`}
              onClick={() => onZoneChange(z)}
            >
              {t('filterZoneN', { n: z })}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">{t('filterOperator')}</span>
        <div className="chip-row">
          <button
            type="button"
            className={`chip ${operator === 'all' ? 'active' : ''}`}
            onClick={() => onOperatorChange('all')}
          >
            {t('filterAll')}
          </button>
          {operators.map((op) => (
            <button
              key={op}
              type="button"
              className={`chip ${operator === op ? 'active' : ''}`}
              onClick={() => onOperatorChange(op)}
              title={OPERATORS[op] ? getPrimaryText(OPERATORS[op], locale) : op}
            >
              {op}
            </button>
          ))}
        </div>
      </div>

      {types.length > 0 && (
        <div className="filter-group">
          <span className="filter-label">{t('filterCategory')}</span>
          <div className="chip-row">
            <button
              type="button"
              className={`chip ${type === 'all' ? 'active' : ''}`}
              onClick={() => onTypeChange('all')}
            >
              {t('filterAll')}
            </button>
            {types.map((item) => (
              <button
                key={item}
                type="button"
                className={`chip ${type === item ? 'active' : ''}`}
                onClick={() => onTypeChange(item)}
              >
                {t(TYPE_FILTER_KEYS[item])}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
