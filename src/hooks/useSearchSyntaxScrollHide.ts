import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

const SCROLL_TOP_THRESHOLD = 80
const HIDE_INSET_PX = 1
/** 固定展开后忽略布局触发的 scroll，再启用滑动关闭 */
const FORCE_OPEN_GRACE_MS = 320
const FORCE_OPEN_SCROLL_DELTA_PX = 6

function readScrollY(): number {
  return window.scrollY || document.documentElement.scrollTop || 0
}

function isAtScrollTop(): boolean {
  return readScrollY() <= SCROLL_TOP_THRESHOLD
}

export function useSearchSyntaxScrollHide(
  stickyRef: RefObject<HTMLElement | null>,
  syntaxRef: RefObject<HTMLElement | null>,
) {
  const [hidden, setHidden] = useState(false)
  const [forceOpen, setForceOpen] = useState(false)
  const latchedRef = useRef(false)
  const skipUnhideRef = useRef(false)
  const hideTriggeredAtScrollYRef = useRef(0)
  const forceOpenRef = useRef(false)
  const forceOpenScrollYRef = useRef(0)
  const skipForceDismissRef = useRef(false)
  const forceOpenGraceTimerRef = useRef<number | null>(null)

  const dismissForceOpen = useCallback(() => {
    forceOpenRef.current = false
    setForceOpen(false)
    latchedRef.current = true
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
      latchedRef.current = false
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
    [beginForceOpenGrace],
  )

  const releaseForceOpen = useCallback(() => {
    dismissForceOpen()
  }, [dismissForceOpen])

  useEffect(() => {
    const hideWithCollapse = () => {
      const syntax = syntaxRef.current
      if (!syntax || latchedRef.current || forceOpenRef.current) return

      const removedHeight = syntax.offsetHeight
      hideTriggeredAtScrollYRef.current = readScrollY()
      latchedRef.current = true
      skipUnhideRef.current = true
      setHidden(true)

      if (removedHeight <= 0) return

      requestAnimationFrame(() => {
        const scrollY = readScrollY()
        const nextY = Math.max(0, scrollY - removedHeight)
        if (nextY !== scrollY) {
          window.scrollTo(0, nextY)
        }
        window.setTimeout(() => {
          skipUnhideRef.current = false
        }, 120)
      })
    }

    const dismissForceOpenFromUserScroll = () => {
      if (!forceOpenRef.current || skipForceDismissRef.current) return
      dismissForceOpen()
    }

    const sync = () => {
      if (forceOpenRef.current) {
        setHidden(true)
        if (skipForceDismissRef.current) return

        const scrollY = readScrollY()
        if (Math.abs(scrollY - forceOpenScrollYRef.current) > FORCE_OPEN_SCROLL_DELTA_PX) {
          dismissForceOpenFromUserScroll()
        }
        return
      }

      const sticky = stickyRef.current
      const syntax = syntaxRef.current
      if (!sticky || !syntax) return

      const scrollY = readScrollY()

      if (latchedRef.current) {
        setHidden(true)
        if (
          scrollY <= SCROLL_TOP_THRESHOLD &&
          !skipUnhideRef.current &&
          hideTriggeredAtScrollYRef.current > SCROLL_TOP_THRESHOLD
        ) {
          clearScrollHidden()
        }
        return
      }

      const searchBar = sticky.querySelector<HTMLElement>('.search-bar')
      if (!searchBar) return

      const searchBottom = searchBar.getBoundingClientRect().bottom
      const syntaxTop = syntax.getBoundingClientRect().top

      if (syntaxTop < searchBottom - HIDE_INSET_PX) {
        hideWithCollapse()
      } else {
        setHidden(false)
      }
    }

    const onWheel = (event: WheelEvent) => {
      if (forceOpenRef.current) {
        if (skipForceDismissRef.current) return
        if (Math.abs(event.deltaY) < 1) return
        dismissForceOpenFromUserScroll()
        return
      }

      if (event.deltaY >= 0) return
      if (!isAtScrollTop()) return
      if (!latchedRef.current || skipUnhideRef.current) return
      clearScrollHidden()
    }

    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    window.addEventListener('wheel', onWheel, { passive: true })

    const ro = new ResizeObserver(sync)
    if (stickyRef.current) ro.observe(stickyRef.current)

    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      window.removeEventListener('wheel', onWheel)
      ro.disconnect()
      if (forceOpenGraceTimerRef.current != null) {
        window.clearTimeout(forceOpenGraceTimerRef.current)
      }
    }
  }, [clearScrollHidden, dismissForceOpen, stickyRef, syntaxRef])

  return { scrollHidden: hidden, forceOpen, clearScrollHidden, releaseForceOpen }
}
