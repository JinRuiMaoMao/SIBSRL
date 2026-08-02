import type { ReactNode } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import {
  countLockedUnlockCategoryItems,
  UNLOCK_CATEGORY_ORDER,
  UNLOCK_CATEGORY_TITLE_KEYS,
} from '../utils/lockedUnlockCategories'
import type { RouteUnlockCategoryKind } from './RouteUnlockCategoryCard'

interface RouteLockedUnlockCategorySectionsProps<T> {
  groups: Record<RouteUnlockCategoryKind, readonly T[]>
  renderItems: (items: readonly T[]) => ReactNode
  highlightKind?: RouteUnlockCategoryKind | null
  layout?: 'grid' | 'list'
  emptyFallback?: ReactNode
}

export function RouteLockedUnlockCategorySections<T>({
  groups,
  renderItems,
  highlightKind = null,
  layout = 'grid',
  emptyFallback = null,
}: RouteLockedUnlockCategorySectionsProps<T>) {
  const { t } = useLocale()

  if (countLockedUnlockCategoryItems(groups) === 0) {
    return emptyFallback
  }

  return (
    <div className="route-locked-unlock-category-sections">
      {UNLOCK_CATEGORY_ORDER.map((kind) => {
        const items = groups[kind]
        if (items.length === 0) return null

        return (
          <section
            key={kind}
            id={`locked-unlock-category-${kind}`}
            className={`route-locked-unlock-category-group${
              highlightKind === kind ? ' is-highlighted' : ''
            }`.trim()}
          >
            <header className="route-locked-unlock-category-group-header">
              <h3 className="route-locked-unlock-category-group-title">
                {t(UNLOCK_CATEGORY_TITLE_KEYS[kind])}
              </h3>
              <span className="route-locked-unlock-category-group-count">{items.length}</span>
            </header>
            {layout === 'grid' ? (
              <div className="route-grid">{renderItems(items)}</div>
            ) : (
              <div className="route-locked-unlock-category-list-items">{renderItems(items)}</div>
            )}
          </section>
        )
      })}
    </div>
  )
}
