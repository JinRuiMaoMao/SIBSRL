import { useId, type ReactNode } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'

const GROUP_TITLE_KEYS: Record<'normal' | 'daily' | 'seasonal', MessageKey> = {
  normal: 'routeGroupNormal',
  daily: 'routeGroupDaily',
  seasonal: 'routeGroupSeasonal',
}

interface RouteGroupCollapseProps {
  groupId: 'normal' | 'daily' | 'seasonal'
  count: number
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function RouteGroupCollapse({
  groupId,
  count,
  open,
  onOpenChange,
  children,
}: RouteGroupCollapseProps) {
  const { t } = useLocale()
  const panelId = useId()
  const title = t(GROUP_TITLE_KEYS[groupId])

  return (
    <section className={`route-group-collapse ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="route-group-collapse-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
      >
        <span className="route-group-collapse-title">{title}</span>
        <span className="route-group-collapse-count">{count}</span>
        <svg
          className="route-group-collapse-icon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          aria-hidden
        >
          <path fill="currentColor" d="M12 7.5 18 13.5l-1.4 1.4L12 10.3 7.4 14.9 6 13.5z" />
        </svg>
      </button>

      <div
        id={panelId}
        className="route-group-collapse-panel"
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div className="route-group-collapse-panel-inner">{children}</div>
      </div>
    </section>
  )
}
