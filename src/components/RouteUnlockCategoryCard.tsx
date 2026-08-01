import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'

export type RouteUnlockCategoryKind = 'seasonal' | 'special'

interface RouteUnlockCategoryCardProps {
  kind: RouteUnlockCategoryKind
  active?: boolean
  onClick: () => void
}

const TITLE_KEYS: Record<RouteUnlockCategoryKind, MessageKey> = {
  seasonal: 'routeUnlockCategoryEvents',
  special: 'routeUnlockCategorySpecial',
}

const DESC_KEYS: Record<RouteUnlockCategoryKind, MessageKey> = {
  seasonal: 'routeUnlockCategoryEventsDesc',
  special: 'routeUnlockCategorySpecialDesc',
}

function CategoryIcon({ kind }: { kind: RouteUnlockCategoryKind }) {
  if (kind === 'seasonal') {
    return (
      <svg className="route-unlock-category-icon" viewBox="0 0 24 24" width="28" height="28" aria-hidden>
        <path
          fill="currentColor"
          d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1m12 6H5v12h14zm-9 2h2v2H10zm4 0h2v2h-2zm-8 4h2v2H6zm4 0h2v2h-2zm4 0h2v2h-2zm-8 4h2v2H6zm4 0h2v2h-2zm4 0h2v2h-2z"
        />
      </svg>
    )
  }

  return (
    <svg className="route-unlock-category-icon" viewBox="0 0 24 24" width="28" height="28" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.5 14.6 9l6.9.5-5.2 4.4 1.6 6.7L12 17.8 5.1 20.6l1.6-6.7-5.2-4.4 6.9-.5z"
      />
    </svg>
  )
}

export function RouteUnlockCategoryCard({ kind, active = false, onClick }: RouteUnlockCategoryCardProps) {
  const { t } = useLocale()

  return (
    <button
      type="button"
      className={`route-unlock-category-card ${active ? 'is-active' : ''}`.trim()}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="route-unlock-category-icon-wrap">
        <CategoryIcon kind={kind} />
      </span>
      <span className="route-unlock-category-copy">
        <span className="route-unlock-category-title">{t(TITLE_KEYS[kind])}</span>
        <span className="route-unlock-category-desc">{t(DESC_KEYS[kind])}</span>
      </span>
      <span className="route-unlock-category-chevron" aria-hidden>
        ›
      </span>
    </button>
  )
}
