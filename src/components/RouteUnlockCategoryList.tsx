import { RouteUnlockCategoryCard, type RouteUnlockCategoryKind } from './RouteUnlockCategoryCard'

interface RouteUnlockCategoryListProps {
  activeKind: RouteUnlockCategoryKind | null
  onSelect: (kind: RouteUnlockCategoryKind) => void
}

export function RouteUnlockCategoryList({ activeKind, onSelect }: RouteUnlockCategoryListProps) {
  return (
    <div className="route-unlock-category-list">
      <RouteUnlockCategoryCard
        kind="seasonal"
        active={activeKind === 'seasonal'}
        onClick={() => onSelect('seasonal')}
      />
      <RouteUnlockCategoryCard
        kind="special"
        active={activeKind === 'special'}
        onClick={() => onSelect('special')}
      />
    </div>
  )
}
