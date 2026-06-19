import { useCallback, useEffect, useRef, useState } from 'react'

/** 滚回此距离内时自动展开语法说明 */
const SCROLL_TOP_THRESHOLD = 80
/** 滚动超过此距离且停顿后收起语法说明 */
const SCROLL_COLLAPSE_Y = 5
/** 滚动停下多久后判定为一次滑动结束（毫秒） */
const SCROLL_IDLE_MS = 1

function readScrollY(): number {
  return window.scrollY || document.documentElement.scrollTop || 0
}

export function useSearchSyntaxCollapse() {
  const [syntaxDismissed, setSyntaxDismissed] = useState(false)
  /** 手动展开/收起；滚回顶部时清除 */
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const wasInTopZoneRef = useRef(true)
  const idleTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const onScroll = () => {
      const y = readScrollY()
      const inTopZone = y <= SCROLL_TOP_THRESHOLD

      if (inTopZone && !wasInTopZoneRef.current) {
        setManualOpen(null)
        setSyntaxDismissed(false)
      }
      wasInTopZoneRef.current = inTopZone

      if (idleTimerRef.current != null) {
        window.clearTimeout(idleTimerRef.current)
      }
      idleTimerRef.current = window.setTimeout(() => {
        idleTimerRef.current = null
        if (readScrollY() > SCROLL_COLLAPSE_Y) {
          setSyntaxDismissed(true)
        }
      }, SCROLL_IDLE_MS)
    }

    wasInTopZoneRef.current = readScrollY() <= SCROLL_TOP_THRESHOLD
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (idleTimerRef.current != null) {
        window.clearTimeout(idleTimerRef.current)
      }
    }
  }, [])

  const syntaxOpen = manualOpen ?? !syntaxDismissed

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
