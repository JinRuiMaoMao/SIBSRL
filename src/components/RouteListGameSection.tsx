import { useId, type ReactNode } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'

interface RouteListGameSectionProps {
  titleKey: MessageKey
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  dataTour?: string
}

function SectionChevron({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`route-list-game-section-chevron ${className}`.trim()}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden
    >
      <path fill="currentColor" d="M12 7.5 18 13.5l-1.4 1.4L12 10.3 7.4 14.9 6 13.5z" />
    </svg>
  )
}

export function RouteListGameSection({
  titleKey,
  open,
  onOpenChange,
  children,
  dataTour,
}: RouteListGameSectionProps) {
  const { t } = useLocale()
  const panelId = useId()

  return (
    <section
      className={`route-list-game-section ${open ? 'is-open' : ''}`.trim()}
      data-tour={dataTour}
    >
      <button
        type="button"
        className="route-list-game-section-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
      >
        <SectionChevron />
        <span className="route-list-game-section-title">{t(titleKey)}</span>
        <SectionChevron />
      </button>

      <div
        id={panelId}
        className="route-list-game-section-panel"
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div className="route-list-game-section-panel-inner">{children}</div>
      </div>
    </section>
  )
}
