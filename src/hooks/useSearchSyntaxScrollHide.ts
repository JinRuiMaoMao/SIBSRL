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
/** 与 App.css --syntax-dock-duration 一致；动画期间忽略滚动联动 */
const SYNTAX_DOCK_ANIM_MS = 420
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
  const skipScrollExpandRef = useRef(false)
  const forceOpenRef = useRef(false)
  const forceOpenScrollYRef = useRef(0)
  const skipForceDismissRef = useRef(false)
  const forceOpenGraceTimerRef = useRef<number | null>(null)
  const dockAnimatingRef = useRef(false)
  const dockAnimTimerRef = useRef<number | null>(null)

  const beginDockAnimation = useCallback(() => {
    dockAnimatingRef.current = true
    if (dockAnimTimerRef.current != null) {
      window.clearTimeout(dockAnimTimerRef.current)
    }
    dockAnimTimerRef.current = window.setTimeout(() => {
      dockAnimatingRef.current = false
      dockAnimTimerRef.current = null
    }, SYNTAX_DOCK_ANIM_MS + 60)
  }, [])

  const clearDockAnimation = useCallback(() => {
    dockAnimatingRef.current = false
    if (dockAnimTimerRef.current != null) {
      window.clearTimeout(dockAnimTimerRef.current)
      dockAnimTimerRef.current = null
    }
  }, [])

  const dismissForceOpen = useCallback(() => {
    forceOpenRef.current = false
    setForceOpen(false)
    latchedRef.current = true
    expandArmedRef.current = false
    collapsedAtRef.current = Date.now()
    setHidden(true)
    beginDockAnimation()
  }, [beginDockAnimation])

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
      clearDockAnimation()
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
      beginDockAnimation()
    },
    [beginDockAnimation, beginForceOpenGrace, clearDockAnimation],
  )

  const releaseForceOpen = useCallback(() => {
    dismissForceOpen()
  }, [dismissForceOpen])

  const collapseSyntax = useCallback(() => {
    if (latchedRef.current || forceOpenRef.current || dockAnimatingRef.current) return

    latchedRef.current = true
    expandArmedRef.current = false
    collapsedAtRef.current = Date.now()
    skipScrollExpandRef.current = true
    setHidden(true)
    beginDockAnimation()

    window.setTimeout(() => {
      skipScrollExpandRef.current = false
    }, COLLAPSE_SUPPRESS_EXPAND_MS)
  }, [beginDockAnimation])

  const expandSyntaxAtTop = useCallback(
    (notify: () => void) => {
      if (!latchedRef.current && !forceOpenRef.current) return
      clearScrollHidden()
      notify()
    },
    [clearScrollHidden],
  )

  const tryExpandAtTopFromScroll = useCallback(
    (scrollY: number, notify: () => void) => {
      if (dockAnimatingRef.current) return
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

      if (dockAnimatingRef.current) {
        prevScrollY = scrollY
        return
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
      if (dockAnimatingRef.current) return

      const scrollY = readScrollY()

      if (forceOpenRef.current) {
        if (skipForceDismissRef.current) return
        if (Math.abs(event.deltaY) < 1) return
        dismissForceOpenFromUserScroll()
        return
      }

      if (event.deltaY < 0 && latchedRef.current && scrollY <= SEARCH_SYNTAX_EXPAND_TOP_PX) {
        expandSyntaxAtTop(notifyReturnToTop)
        return
      }

      if (event.deltaY > 0 && !latchedRef.current && scrollY <= SEARCH_SYNTAX_WHEEL_ZONE_PX) {
        event.preventDefault()
        collapseSyntax()
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
      clearDockAnimation()
      if (forceOpenGraceTimerRef.current != null) {
        window.clearTimeout(forceOpenGraceTimerRef.current)
      }
      if (dockAnimTimerRef.current != null) {
        window.clearTimeout(dockAnimTimerRef.current)
      }
    }
  }, [
    clearDockAnimation,
    collapseSyntax,
    dismissForceOpen,
    expandSyntaxAtTop,
    options?.onReturnToTop,
    stickyRef,
    syntaxRef,
    tryExpandAtTopFromScroll,
  ])

  return { scrollHidden: hidden, forceOpen, clearScrollHidden, releaseForceOpen }
}
