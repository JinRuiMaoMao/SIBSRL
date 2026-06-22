import { useLocale } from '../i18n/LocaleContext'
import type { BusRoute } from '../types/route'
import {
  getDirectionShortLabel,
  getSortedDirectionDataIndices,
} from '../utils/routeDirections'

interface LoopDirectionViewToggleProps {
  route: BusRoute
  directionIndex: number
  loopView: boolean
  onDirectionChange: (index: number) => void
  onLoopViewChange: (loopView: boolean) => void
  compact?: boolean
  className?: string
}

/** 环线分站序线路：西行／东行／环线 三选一（如 246X） */
export function LoopDirectionViewToggle({
  route,
  directionIndex,
  loopView,
  onDirectionChange,
  onLoopViewChange,
  compact = false,
  className = '',
}: LoopDirectionViewToggleProps) {
  const { locale, t } = useLocale()
  const sortedDataIndices = getSortedDirectionDataIndices(route)

  return (
    <div
      className={`direction-toggle loop-direction-view-toggle ${compact ? 'direction-toggle--compact' : ''} ${className}`.trim()}
      role="tablist"
      aria-label={t('loopDirectionViewToggleAria')}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {sortedDataIndices.map((dataIndex, sortedIndex) => (
        <button
          key={dataIndex}
          type="button"
          role="tab"
          aria-selected={!loopView && directionIndex === sortedIndex}
          className={`direction-toggle-btn ${!loopView && directionIndex === sortedIndex ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onLoopViewChange(false)
            onDirectionChange(sortedIndex)
          }}
        >
          {getDirectionShortLabel(route, sortedIndex, t, locale, compact)}
        </button>
      ))}
      <button
        type="button"
        role="tab"
        aria-selected={loopView}
        className={`direction-toggle-btn ${loopView ? 'active' : ''}`}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onLoopViewChange(true)
        }}
      >
        {t('loopViewFull')}
      </button>
    </div>
  )
}
