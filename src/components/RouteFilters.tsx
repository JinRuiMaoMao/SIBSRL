import { OPERATORS } from '../data/routes'
import { TYPE_FILTER_KEYS } from '../i18n/routeTypes'
import { useLocale } from '../i18n/LocaleContext'
import { getPrimaryText } from '../i18n/displayText'
import type { RouteTypeFilter } from '../types/route'

interface RouteFiltersProps {
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
}

function chipClassName(active: boolean, excluded: boolean): string {
  if (excluded) return 'chip excluded'
  if (active) return 'chip active'
  return 'chip'
}

export function RouteFilters({
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
}: RouteFiltersProps) {
  const { locale, t } = useLocale()
  const zoneAllActive = zone === 'all' && excludedZones.length === 0
  const operatorAllActive = operator === 'all' && excludedOperators.length === 0
  const typeAllActive = type === 'all' && excludedTypes.length === 0

  return (
    <div className="filters">
      <div className="filter-group">
        <span className="filter-label">{t('filterZone')}</span>
        <div className="chip-row">
          <button
            type="button"
            className={chipClassName(zoneAllActive, false)}
            onClick={() => onZoneChange('all')}
          >
            {t('filterAll')}
          </button>
          {zones.map((z) => (
            <button
              key={z}
              type="button"
              className={chipClassName(zone === z, excludedZones.includes(z))}
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
            className={chipClassName(operatorAllActive, false)}
            onClick={() => onOperatorChange('all')}
          >
            {t('filterAll')}
          </button>
          {operators.map((op) => (
            <button
              key={op}
              type="button"
              className={chipClassName(
                operator === op,
                excludedOperators.some((item) => item.toLowerCase() === op.toLowerCase()),
              )}
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
              className={chipClassName(typeAllActive, false)}
              onClick={() => onTypeChange('all')}
            >
              {t('filterAll')}
            </button>
            {types.map((item) => (
              <button
                key={item}
                type="button"
                className={chipClassName(type === item, excludedTypes.includes(item))}
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
