import { useLocale } from '../i18n/LocaleContext'
import type { BusRoute } from '../types/route'
import {
  getDirectionShortLabel,
  getSortedDirectionDataIndices,
  routeHasDirectionVariants,
} from '../utils/routeDirections'

interface DirectionToggleProps {
  route: BusRoute
  value: number
  onChange: (index: number) => void
  /** Smaller padding for route cards */
  compact?: boolean
  className?: string
}

export function DirectionToggle({
  route,
  value,
  onChange,
  compact = false,
  className = '',
}: DirectionToggleProps) {
  const { locale, t } = useLocale()

  if (!routeHasDirectionVariants(route)) return null

  const sortedDataIndices = getSortedDirectionDataIndices(route)

  return (
    <div
      className={`direction-toggle ${compact ? 'direction-toggle--compact' : ''} ${className}`.trim()}
      role="tablist"
      aria-label={t('directionToggleAria')}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {sortedDataIndices.map((dataIndex, sortedIndex) => (
        <button
          key={dataIndex}
          type="button"
          role="tab"
          aria-selected={value === sortedIndex}
          className={`direction-toggle-btn ${value === sortedIndex ? 'active' : ''}`}
          onClick={() => onChange(sortedIndex)}
        >
          {getDirectionShortLabel(route, sortedIndex, t, locale)}
        </button>
      ))}
    </div>
  )
}
