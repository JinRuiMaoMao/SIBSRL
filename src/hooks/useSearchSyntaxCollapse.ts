import { useCallback, useEffect, useRef, useState } from 'react'

/** 滚回此距离内时自动展开语法说明并清零滑动计数 */
const SCROLL_TOP_THRESHOLD = 80
/** 累计几次滑动后自动收起语法说明 */
const SCROLL_GESTURES_TO_COLLAPSE = 1
/** 一次滑动结束的空闲判定（毫秒） */
const SCROLL_GESTURE_IDLE_MS = 5
/** 至少滚动这么多像素才算一次有效滑动 */
const SCROLL_GESTURE_MIN_DELTA_PX = 5

export function useSearchSyntaxCollapse() {
  const [atPageTop, setAtPageTop] = useState(true)
  const [scrollGestures, setScrollGestures] = useState(0)
  /** 手动展开/收起；从下方滚回顶部时清除以恢复默认展开 */
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const wasAtPageTopRef = useRef(true)
  const gestureTimerRef = useRef<number | null>(null)
  const gestureStartYRef = useRef(0)

  useEffect(() => {
    const finishGesture = () => {
      const delta = Math.abs(window.scrollY - gestureStartYRef.current)
      if (delta < SCROLL_GESTURE_MIN_DELTA_PX) return
      gestureStartYRef.current = window.scrollY
      setScrollGestures((count) => count + 1)
    }

    const onScroll = () => {
      const y = window.scrollY
      setAtPageTop(y <= SCROLL_TOP_THRESHOLD)

      if (y <= SCROLL_GESTURE_MIN_DELTA_PX) {
        if (gestureTimerRef.current != null) {
          window.clearTimeout(gestureTimerRef.current)
          gestureTimerRef.current = null
        }
        return
      }

      if (gestureTimerRef.current == null) {
        gestureStartYRef.current = y
      }

      if (gestureTimerRef.current != null) {
        window.clearTimeout(gestureTimerRef.current)
      }
      gestureTimerRef.current = window.setTimeout(() => {
        gestureTimerRef.current = null
        finishGesture()
      }, SCROLL_GESTURE_IDLE_MS)
    }

    gestureStartYRef.current = window.scrollY
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (gestureTimerRef.current != null) {
        window.clearTimeout(gestureTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (atPageTop && !wasAtPageTopRef.current) {
      setManualOpen(null)
      setScrollGestures(0)
      gestureStartYRef.current = window.scrollY
    }
    wasAtPageTopRef.current = atPageTop
  }, [atPageTop])

  const shouldAutoCollapse = scrollGestures >= SCROLL_GESTURES_TO_COLLAPSE
  const syntaxOpen = manualOpen ?? !shouldAutoCollapse

  const toggleSyntax = useCallback(() => {
    setManualOpen((prev) => {
      const current = prev ?? !shouldAutoCollapse
      return !current
    })
  }, [shouldAutoCollapse])

  return {
    syntaxOpen,
    toggleSyntax,
    autoCollapsed: shouldAutoCollapse && !syntaxOpen,
  }
}
