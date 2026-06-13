import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useLocale } from '../i18n/LocaleContext'
import type { MessageKey } from '../i18n/messages'

const GROUP_TITLE_KEYS: Record<'normal' | 'daily' | 'seasonal', MessageKey> = {
  normal: 'routeGroupNormal',
  daily: 'routeGroupDaily',
  seasonal: 'routeGroupSeasonal',
}

const COLLAPSE_MS = 500
const COLLAPSE_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'

function collapseMotionMs(): number {
  if (typeof window === 'undefined') return COLLAPSE_MS
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : COLLAPSE_MS
}

interface RouteGroupCollapseProps {
  groupId: 'normal' | 'daily' | 'seasonal'
  count: number
  defaultOpen?: boolean
  children: ReactNode
}

export function RouteGroupCollapse({
  groupId,
  count,
  defaultOpen = false,
  children,
}: RouteGroupCollapseProps) {
  const { t } = useLocale()
  const panelId = useId()
  const innerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(defaultOpen)
  const [contentHeight, setContentHeight] = useState(0)
  const [motionMs, setMotionMs] = useState(COLLAPSE_MS)
  const title = t(GROUP_TITLE_KEYS[groupId])

  useLayoutEffect(() => {
    setMotionMs(collapseMotionMs())
    const node = innerRef.current
    if (!node) return

    const syncHeight = () => setContentHeight(node.scrollHeight)
    syncHeight()

    const observer = new ResizeObserver(syncHeight)
    observer.observe(node)
    return () => observer.disconnect()
  }, [children, count, open])

  const panelStyle: CSSProperties =
    motionMs === 0
      ? {
          maxHeight: open ? contentHeight : 0,
          opacity: open ? 1 : 0,
        }
      : {
          maxHeight: open ? contentHeight : 0,
          opacity: open ? 1 : 0,
          transition: `max-height ${motionMs}ms ${COLLAPSE_EASING}, opacity ${Math.round(motionMs * 0.85)}ms ${COLLAPSE_EASING}`,
        }

  return (
    <section className={`route-group-collapse ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="route-group-collapse-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
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
        style={panelStyle}
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div ref={innerRef} className="route-group-collapse-panel-inner">
          {children}
        </div>
      </div>
    </section>
  )
}
