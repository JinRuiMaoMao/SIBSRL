import { useCallback, useEffect, useRef, useState } from 'react'

export type SyntaxFold = 'open' | 'half' | 'closed'

/** 停下时高于此值则完全收起 */
const SCROLL_COLLAPSE_Y = 5
/** 滚动停下多久后更新折叠状态（毫秒） */
const SCROLL_IDLE_MS = 1

function readScrollY(): number {
  return window.scrollY || document.documentElement.scrollTop || 0
}

function isAtScrollTop(): boolean {
  return readScrollY() <= SCROLL_COLLAPSE_Y
}

export function useSearchSyntaxCollapse() {
  const [syntaxFold, setSyntaxFold] = useState<SyntaxFold>('open')
  /** 手动覆盖自动折叠；滚轮上滑回顶时清除 */
  const [manualFold, setManualFold] = useState<SyntaxFold | null>(null)
  const idleTimerRef = useRef<number | null>(null)
  const syntaxFoldRef = useRef<SyntaxFold>('open')

  const fold = manualFold ?? syntaxFold
  const syntaxOpen = fold === 'open'

  useEffect(() => {
    syntaxFoldRef.current = fold
  }, [fold])

  const expandSyntax = useCallback(() => {
    setManualFold(null)
    setSyntaxFold('open')
  }, [])

  const scheduleScrollIdle = useCallback(() => {
    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current)
    }
    idleTimerRef.current = window.setTimeout(() => {
      idleTimerRef.current = null
      const y = readScrollY()
      if (y > SCROLL_COLLAPSE_Y) {
        setManualFold(null)
        setSyntaxFold('closed')
      } else if (y > 0) {
        setManualFold(null)
        setSyntaxFold('half')
      }
    }, SCROLL_IDLE_MS)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      scheduleScrollIdle()
    }

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY >= 0) return
      if (!isAtScrollTop()) return
      if (syntaxFoldRef.current === 'open') return
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
    setManualFold((prev) => {
      const current = prev ?? syntaxFold
      return current === 'open' ? 'closed' : 'open'
    })
  }, [syntaxFold])

  return {
    syntaxFold: fold,
    syntaxOpen,
    toggleSyntax,
    autoCollapsed: fold === 'closed',
  }
}
