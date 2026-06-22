import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

/** 回到页面顶端时展开（需已 arm） */
export const SEARCH_SYNTAX_EXPAND_TOP_PX = 12
/** 顶端区域内滚轮向下可触发折叠 */
export const SEARCH_SYNTAX_WHEEL_ZONE_PX = 56
/** 向下滚动超过此值也折叠（触控板/拖动滚动条） */
export const SEARCH_SYNTAX_COLLAPSE_SCROLL_PX = 28
/** 折叠后须先滚过此距离，回到顶端才允许再次展开 */
export const SEARCH_SYNTAX_EXPAND_ARM_PX = 80
/** 折叠后短时间内忽略滚动触发的「顶端展开」，避免布局收拢引起抖动 */
const COLLAPSE_SUPPRESS_EXPAND_MS = 280
/** 与 App.css --syntax-dock-duration 一致 */
const SYNTAX_DOCK_ANIM_MS = 420
/** 固定展开后忽略布局触发的 scroll，再启用滑动关闭 */
const FORCE_OPEN_GRACE_MS = 320
const FORCE_OPEN_SCROLL_DELTA_PX = 6

function readScrollY(): number {
  return window.scrollY || document.documentElement.scrollTop || 0
}

/** 与 CSS cubic-bezier(0.32, 0.72, 0, 1) 视觉接近 */
function syntaxDockEase(t: number): number {
  return 1 - (1 - t) ** 3
}

export function isSearchSyntaxAtScrollTop(): boolean {
  return readScrollY() <= SEARCH_SYNTAX_EXPAND_TOP_PX
}

export function useSearchSyntaxScrollHide(
  stickyRef: RefObject<HTMLElement | null>,
  syntaxRef: RefObject<HTMLElement | null>,
  options?: { onReturnToTop?: () => void },
) {
  const [hidden, setHidden] = useState(false)
  const [forceOpen, setForceOpen] = useState(false)
  const latchedRef = useRef(false)
  const expandArmedRef = useRef(false)
  const collapsedAtRef = useRef(0)
  const skipScrollExpandRef = useRef(false)
  const forceOpenRef = useRef(false)
  const forceOpenScrollYRef = useRef(0)
  const skipForceDismissRef = useRef(false)
  const forceOpenGraceTimerRef = useRef<number | null>(null)
  const compensateRafRef = useRef<number | null>(null)
  const compensatingRef = useRef(false)

  const cancelCompensationRaf = useCallback(() => {
    if (compensateRafRef.current != null) {
      cancelAnimationFrame(compensateRafRef.current)
      compensateRafRef.current = null
    }
  }, [])

  const stopCompensation = useCallback(() => {
    compensatingRef.current = false
    cancelCompensationRaf()
  }, [cancelCompensationRaf])

  const dismissForceOpen = useCallback(() => {
    forceOpenRef.current = false
    setForceOpen(false)
    latchedRef.current = true
    expandArmedRef.current = false
    collapsedAtRef.current = Date.now()
    setHidden(true)
  }, [])

  const beginForceOpenGrace = useCallback(() => {
    skipForceDismissRef.current = true
    if (forceOpenGraceTimerRef.current != null) {
      window.clearTimeout(forceOpenGraceTimerRef.current)
    }
    forceOpenGraceTimerRef.current = window.setTimeout(() => {
      forceOpenGraceTimerRef.current = null
      skipForceDismissRef.current = false
      forceOpenScrollYRef.current = readScrollY()
    }, FORCE_OPEN_GRACE_MS)
  }, [])

  const clearScrollHidden = useCallback(
    (options?: { forceOpen?: boolean }) => {
      stopCompensation()
      latchedRef.current = false
      expandArmedRef.current = false
      collapsedAtRef.current = 0
      skipScrollExpandRef.current = false
      if (options?.forceOpen) {
        forceOpenRef.current = true
        forceOpenScrollYRef.current = readScrollY()
        setForceOpen(true)
        setHidden(true)
        beginForceOpenGrace()
        return
      }
      forceOpenRef.current = false
      setForceOpen(false)
      setHidden(false)
    },
    [beginForceOpenGrace, stopCompensation],
  )

  const releaseForceOpen = useCallback(() => {
    dismissForceOpen()
  }, [dismissForceOpen])

  const startCollapseCompensation = useCallback(
    (distance: number) => {
      if (distance <= 0) return

      stopCompensation()
      compensatingRef.current = true
      const startScrollY = readScrollY()
      const startTime = performance.now()

      const step = (now: number) => {
        if (!compensatingRef.current) {
          compensateRafRef.current = null
          return
        }

        const t = Math.min(1, (now - startTime) / SYNTAX_DOCK_ANIM_MS)
        window.scrollTo(0, Math.max(0, startScrollY + distance * syntaxDockEase(t)))

        if (t < 1) {
          compensateRafRef.current = requestAnimationFrame(step)
        } else {
          compensatingRef.current = false
          compensateRafRef.current = null
          expandArmedRef.current = true
        }
      }

      compensateRafRef.current = requestAnimationFrame(step)
    },
    [stopCompensation],
  )

  const collapseSyntax = useCallback(
    (options?: { compensate?: boolean }) => {
      if (latchedRef.current || forceOpenRef.current || compensatingRef.current) return

      if (options?.compensate) {
        const dock = syntaxRef.current
        const startHeight = dock?.offsetHeight ?? 0
        if (dock && startHeight > 0) {
          startCollapseCompensation(startHeight)
        }
      }

      latchedRef.current = true
      expandArmedRef.current = false
      collapsedAtRef.current = Date.now()
      skipScrollExpandRef.current = true
      setHidden(true)

      window.setTimeout(() => {
        skipScrollExpandRef.current = false
      }, COLLAPSE_SUPPRESS_EXPAND_MS)
    },
    [startCollapseCompensation, syntaxRef],
  )

  const expandSyntaxAtTop = useCallback(
    (notify: () => void) => {
      stopCompensation()
      if (readScrollY() > 0) {
        window.scrollTo(0, 0)
      }
      clearScrollHidden()
      notify()
    },
    [clearScrollHidden, stopCompensation],
  )

  const tryExpandAtTopFromScroll = useCallback(
    (scrollY: number, notify: () => void) => {
      if (!latchedRef.current || forceOpenRef.current || skipScrollExpandRef.current) return
      if (Date.now() - collapsedAtRef.current < COLLAPSE_SUPPRESS_EXPAND_MS) return
      if (scrollY > SEARCH_SYNTAX_EXPAND_TOP_PX) return
      if (!expandArmedRef.current) return

      expandSyntaxAtTop(notify)
    },
    [expandSyntaxAtTop],
  )

  useEffect(() => {
    const onReturnToTop = options?.onReturnToTop
    let prevScrollY = readScrollY()

    const notifyReturnToTop = () => {
      onReturnToTop?.()
    }

    const crossedIntoExpandTop = (scrollY: number) =>
      prevScrollY > SEARCH_SYNTAX_EXPAND_TOP_PX && scrollY <= SEARCH_SYNTAX_EXPAND_TOP_PX

    const dismissForceOpenFromUserScroll = () => {
      if (!forceOpenRef.current || skipForceDismissRef.current) return
      dismissForceOpen()
    }

    const sync = () => {
      const scrollY = readScrollY()

      if (scrollY > SEARCH_SYNTAX_EXPAND_ARM_PX) {
        expandArmedRef.current = true
      }

      if (forceOpenRef.current) {
        setHidden(true)
        if (skipForceDismissRef.current) {
          prevScrollY = scrollY
          return
        }

        if (Math.abs(scrollY - forceOpenScrollYRef.current) > FORCE_OPEN_SCROLL_DELTA_PX) {
          dismissForceOpenFromUserScroll()
        }
        prevScrollY = scrollY
        return
      }

      if (!latchedRef.current) {
        if (
          scrollY > SEARCH_SYNTAX_COLLAPSE_SCROLL_PX &&
          prevScrollY <= SEARCH_SYNTAX_COLLAPSE_SCROLL_PX
        ) {
          collapseSyntax()
        } else {
          setHidden(false)
        }
        prevScrollY = scrollY
        return
      }

      setHidden(true)

      if (crossedIntoExpandTop(scrollY)) {
        tryExpandAtTopFromScroll(scrollY, notifyReturnToTop)
      } else if (scrollY <= SEARCH_SYNTAX_EXPAND_TOP_PX) {
        tryExpandAtTopFromScroll(scrollY, notifyReturnToTop)
      }

      prevScrollY = scrollY
    }

    const onWheel = (event: WheelEvent) => {
      const scrollY = readScrollY()

      if (forceOpenRef.current) {
        if (skipForceDismissRef.current) return
        if (Math.abs(event.deltaY) < 1) return
        dismissForceOpenFromUserScroll()
        return
      }

      // 折叠动画中上滑：停止补偿并重新展开
      if (event.deltaY < 0 && (compensatingRef.current || latchedRef.current)) {
        if (scrollY <= SEARCH_SYNTAX_WHEEL_ZONE_PX || compensatingRef.current) {
          event.preventDefault()
          expandSyntaxAtTop(notifyReturnToTop)
        }
        return
      }

      if (event.deltaY > 0 && !latchedRef.current && scrollY <= SEARCH_SYNTAX_WHEEL_ZONE_PX) {
        event.preventDefault()
        collapseSyntax({ compensate: true })
      }
    }

    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    window.addEventListener('wheel', onWheel, { passive: false })

    const ro = new ResizeObserver(sync)
    if (stickyRef.current) ro.observe(stickyRef.current)
    if (syntaxRef.current) ro.observe(syntaxRef.current)

    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      window.removeEventListener('wheel', onWheel)
      ro.disconnect()
      stopCompensation()
      if (forceOpenGraceTimerRef.current != null) {
        window.clearTimeout(forceOpenGraceTimerRef.current)
      }
    }
  }, [
    collapseSyntax,
    dismissForceOpen,
    expandSyntaxAtTop,
    options?.onReturnToTop,
    stickyRef,
    stopCompensation,
    syntaxRef,
    tryExpandAtTopFromScroll,
  ])

  return { scrollHidden: hidden, forceOpen, clearScrollHidden, releaseForceOpen }
}
