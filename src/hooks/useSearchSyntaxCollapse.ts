import { useCallback, useEffect, useRef, useState } from 'react'

/** 停下时高于此值则收起；低于等于则展开 */
const SCROLL_COLLAPSE_Y = 5
/** 滚动停下多久后更新展开/收起（毫秒） */
const SCROLL_IDLE_MS = 1

function readScrollY(): number {
  return window.scrollY || document.documentElement.scrollTop || 0
}

function isAtScrollTop(): boolean {
  return readScrollY() <= SCROLL_COLLAPSE_Y
}

export function useSearchSyntaxCollapse() {
  const [syntaxDismissed, setSyntaxDismissed] = useState(false)
  /** 手动展开/收起 */
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const idleTimerRef = useRef<number | null>(null)
  const syntaxOpenRef = useRef(true)

  const syntaxOpen = manualOpen ?? !syntaxDismissed

  useEffect(() => {
    syntaxOpenRef.current = syntaxOpen
  }, [syntaxOpen])

  const expandSyntax = useCallback(() => {
    setManualOpen(null)
    setSyntaxDismissed(false)
  }, [])

  const scheduleScrollIdle = useCallback(() => {
    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current)
    }
    idleTimerRef.current = window.setTimeout(() => {
      idleTimerRef.current = null
      if (readScrollY() > SCROLL_COLLAPSE_Y) {
        setSyntaxDismissed(true)
      } else {
        expandSyntax()
      }
    }, SCROLL_IDLE_MS)
  }, [expandSyntax])

  useEffect(() => {
    const onScroll = () => {
      scheduleScrollIdle()
    }

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY >= 0) return
      if (!isAtScrollTop()) return
      if (syntaxOpenRef.current) return
      expandSyntax()
    }

    scheduleScrollIdle()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onWheel)
      if (idleTimerRef.current != null) {
        window.clearTimeout(idleTimerRef.current)
      }
    }
  }, [expandSyntax, scheduleScrollIdle])

  const toggleSyntax = useCallback(() => {
    setManualOpen((prev) => {
      const current = prev ?? !syntaxDismissed
      return !current
    })
  }, [syntaxDismissed])

  return {
    syntaxOpen,
    toggleSyntax,
    autoCollapsed: syntaxDismissed && !syntaxOpen,
  }
}
