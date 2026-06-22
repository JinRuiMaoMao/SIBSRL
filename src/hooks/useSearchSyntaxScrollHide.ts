import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

/** 回到页面顶端时展开（需已 arm） */
export const SEARCH_SYNTAX_EXPAND_TOP_PX = 12
/** 顶端区域内滚轮向下可触发折叠 */
export const SEARCH_SYNTAX_WHEEL_ZONE_PX = 56
/** 向下滚动超过此值也折叠（触控板/拖动滚动条） */
export const SEARCH_SYNTAX_COLLAPSE_SCROLL_PX = 28
/** 折叠后须先滚过此距离，回到顶端才允许再次展开 */
export const SEARCH_SYNTAX_EXPAND_ARM_PX = 80
/** 折叠后短时间内忽略「顶端展开」，避免布局收拢引起抖动 */
const COLLAPSE_SUPPRESS_EXPAND_MS = 360
/** 固定展开后忽略布局触发的 scroll，再启用滑动关闭 */
const FORCE_OPEN_GRACE_MS = 320
const FORCE_OPEN_SCROLL_DELTA_PX = 6

function readScrollY(): number {
  return window.scrollY || document.documentElement.scrollTop || 0
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
  const skipUnhideRef = useRef(false)
  const forceOpenRef = useRef(false)
  const forceOpenScrollYRef = useRef(0)
  const skipForceDismissRef = useRef(false)
  const forceOpenGraceTimerRef = useRef<number | null>(null)
  const compensateRafRef = useRef<number | null>(null)

  const cancelCollapseCompensation = useCallback(() => {
    if (compensateRafRef.current != null) {
      cancelAnimationFrame(compensateRafRef.current)
      compensateRafRef.current = null
    }
  }, [])

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
      cancelCollapseCompensation()
      latchedRef.current = false
      expandArmedRef.current = false
      collapsedAtRef.current = 0
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
    [beginForceOpenGrace, cancelCollapseCompensation],
  )

  const releaseForceOpen = useCallback(() => {
    dismissForceOpen()
  }, [dismissForceOpen])

  const collapseSyntax = useCallback(
    (options?: { compensate?: boolean }) => {
      if (latchedRef.current || forceOpenRef.current) return

      // 折叠期间让搜索框下方内容保持静止：随面板收起同步下移视口，抵消移除的高度
      if (options?.compensate) {
        const dock = syntaxRef.current
        const startHeight = dock?.offsetHeight ?? 0
        if (dock && startHeight > 0) {
          const startScrollY = readScrollY()
          cancelCollapseCompensation()
          const step = () => {
            const current = syntaxRef.current
            if (!current) {
              compensateRafRef.current = null
              return
            }
            const currentHeight = current.offsetHeight
            window.scrollTo(0, Math.max(0, startScrollY + (startHeight - currentHeight)))
            if (currentHeight > 1) {
              compensateRafRef.current = requestAnimationFrame(step)
            } else {
              compensateRafRef.current = null
            }
          }
          compensateRafRef.current = requestAnimationFrame(step)
        }
      }

      latchedRef.current = true
      expandArmedRef.current = false
      collapsedAtRef.current = Date.now()
      skipUnhideRef.current = true
      setHidden(true)

      window.setTimeout(() => {
        skipUnhideRef.current = false
      }, COLLAPSE_SUPPRESS_EXPAND_MS)
    },
    [cancelCollapseCompensation, syntaxRef],
  )

  const tryExpandAtTop = useCallback(
    (scrollY: number, notify: () => void) => {
      if (!latchedRef.current || forceOpenRef.current || skipUnhideRef.current) return
      if (Date.now() - collapsedAtRef.current < COLLAPSE_SUPPRESS_EXPAND_MS) return
      if (scrollY > SEARCH_SYNTAX_EXPAND_TOP_PX) return
      if (!expandArmedRef.current) return

      clearScrollHidden()
      notify()
    },
    [clearScrollHidden],
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
        tryExpandAtTop(scrollY, notifyReturnToTop)
      } else if (scrollY <= SEARCH_SYNTAX_EXPAND_TOP_PX) {
        tryExpandAtTop(scrollY, notifyReturnToTop)
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

      if (event.deltaY > 0 && !latchedRef.current && scrollY <= SEARCH_SYNTAX_WHEEL_ZONE_PX) {
        // 第一下滚轮只折叠面板，视图保持静止；后续滚动才真正移动页面
        event.preventDefault()
        collapseSyntax({ compensate: true })
        return
      }

      if (event.deltaY < 0 && latchedRef.current && scrollY <= SEARCH_SYNTAX_EXPAND_TOP_PX) {
        tryExpandAtTop(scrollY, notifyReturnToTop)
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
      cancelCollapseCompensation()
      if (forceOpenGraceTimerRef.current != null) {
        window.clearTimeout(forceOpenGraceTimerRef.current)
      }
    }
  }, [
    cancelCollapseCompensation,
    collapseSyntax,
    dismissForceOpen,
    options?.onReturnToTop,
    stickyRef,
    syntaxRef,
    tryExpandAtTop,
  ])

  return { scrollHidden: hidden, forceOpen, clearScrollHidden, releaseForceOpen }
}
