import { useCallback, useEffect, useRef, useState } from 'react'

export type SyntaxFold = 'open' | 'half' | 'closed'

/** 离开页面最顶部后进入半折叠 */
const SCROLL_HALF_ENTER_Y = 1
/** 超过此距离才完全收起（与半折叠之间留滞后带） */
const SCROLL_FULL_COLLAPSE_Y = 48
/** 视为顶部区域：滚轮上滑可展开 */
const SCROLL_TOP_ZONE_Y = 80
/** 滚动停下后再更新折叠（毫秒） */
const SCROLL_IDLE_MS = 48

function readScrollY(): number {
  return window.scrollY || document.documentElement.scrollTop || 0
}

function isInTopZone(): boolean {
  return readScrollY() <= SCROLL_TOP_ZONE_Y
}

function resolveAutoFold(scrollY: number, previous: SyntaxFold): SyntaxFold {
  if (scrollY > SCROLL_FULL_COLLAPSE_Y) return 'closed'
  if (scrollY > SCROLL_HALF_ENTER_Y) return 'half'
  if (previous === 'half' || previous === 'closed') return previous
  return 'open'
}

export function useSearchSyntaxCollapse() {
  const [syntaxFold, setSyntaxFold] = useState<SyntaxFold>('open')
  /** 手动覆盖自动折叠；滚轮上滑回顶时清除 */
  const [manualFold, setManualFold] = useState<SyntaxFold | null>(null)
  const idleTimerRef = useRef<number | null>(null)
  const syntaxFoldRef = useRef<SyntaxFold>('open')
  const manualFoldRef = useRef<SyntaxFold | null>(null)

  const fold = manualFold ?? syntaxFold
  const syntaxOpen = fold === 'open'

  useEffect(() => {
    syntaxFoldRef.current = fold
  }, [fold])

  useEffect(() => {
    manualFoldRef.current = manualFold
  }, [manualFold])

  const expandSyntax = useCallback(() => {
    setManualFold(null)
    setSyntaxFold('open')
  }, [])

  const applyScrollFold = useCallback(() => {
    if (manualFoldRef.current != null) return
    const next = resolveAutoFold(readScrollY(), syntaxFoldRef.current)
    if (next !== syntaxFoldRef.current) {
      setSyntaxFold(next)
    }
  }, [])

  const scheduleScrollIdle = useCallback(() => {
    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current)
    }
    idleTimerRef.current = window.setTimeout(() => {
      idleTimerRef.current = null
      requestAnimationFrame(applyScrollFold)
    }, SCROLL_IDLE_MS)
  }, [applyScrollFold])

  useEffect(() => {
    const onScroll = () => {
      scheduleScrollIdle()
    }

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY >= 0) return
      if (!isInTopZone()) return
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
