import { useCallback, useEffect, useRef, useState } from 'react'

export type SyntaxFold = 'open' | 'half' | 'closed'

/** 视为顶部区域：在此区域内用滚轮阶梯折叠 */
const SCROLL_TOP_ZONE_Y = 80
/** 页面实际滚过此距离则强制全折叠（触摸/拖动滚动） */
const SCROLL_FULL_COLLAPSE_Y = 48
/** 同一记滚轮手势内多次 tick 的合并窗口（毫秒） */
const WHEEL_GESTURE_IDLE_MS = 100
/** 页面滚动停下后再判定强制全折叠（毫秒） */
const SCROLL_IDLE_MS = 48

function readScrollY(): number {
  return window.scrollY || document.documentElement.scrollTop || 0
}

function isInTopZone(): boolean {
  return readScrollY() <= SCROLL_TOP_ZONE_Y
}

function foldFromWheelSteps(steps: number): SyntaxFold {
  if (steps >= 2) return 'closed'
  if (steps >= 1) return 'half'
  return 'open'
}

export function useSearchSyntaxCollapse() {
  const [syntaxFold, setSyntaxFold] = useState<SyntaxFold>('open')
  /** 手动覆盖自动折叠 */
  const [manualFold, setManualFold] = useState<SyntaxFold | null>(null)
  const scrollIdleRef = useRef<number | null>(null)
  const wheelIdleRef = useRef<number | null>(null)
  const wheelStepsRef = useRef(0)
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

  const applyWheelSteps = useCallback((steps: number) => {
    wheelStepsRef.current = steps
    setManualFold(null)
    setSyntaxFold(foldFromWheelSteps(steps))
  }, [])

  const expandSyntax = useCallback(() => {
    wheelStepsRef.current = 0
    setManualFold(null)
    setSyntaxFold('open')
  }, [])

  const registerWheelDownGesture = useCallback(() => {
    if (manualFoldRef.current != null) return
    if (!isInTopZone()) return
    applyWheelSteps(Math.min(2, wheelStepsRef.current + 1))
  }, [applyWheelSteps])

  const applyScrollFold = useCallback(() => {
    if (manualFoldRef.current != null) return
    if (readScrollY() > SCROLL_FULL_COLLAPSE_Y) {
      applyWheelSteps(2)
    }
  }, [applyWheelSteps])

  useEffect(() => {
    const onScroll = () => {
      if (scrollIdleRef.current != null) {
        window.clearTimeout(scrollIdleRef.current)
      }
      scrollIdleRef.current = window.setTimeout(() => {
        scrollIdleRef.current = null
        requestAnimationFrame(applyScrollFold)
      }, SCROLL_IDLE_MS)
    }

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        if (wheelIdleRef.current != null) {
          window.clearTimeout(wheelIdleRef.current)
          wheelIdleRef.current = null
        }
        if (!isInTopZone()) return
        if (syntaxFoldRef.current === 'open') return
        expandSyntax()
        return
      }

      if (event.deltaY <= 0 || !isInTopZone()) return

      if (wheelIdleRef.current != null) {
        window.clearTimeout(wheelIdleRef.current)
      }
      wheelIdleRef.current = window.setTimeout(() => {
        wheelIdleRef.current = null
        registerWheelDownGesture()
      }, WHEEL_GESTURE_IDLE_MS)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onWheel)
      if (scrollIdleRef.current != null) {
        window.clearTimeout(scrollIdleRef.current)
      }
      if (wheelIdleRef.current != null) {
        window.clearTimeout(wheelIdleRef.current)
      }
    }
  }, [applyScrollFold, expandSyntax, registerWheelDownGesture])

  const toggleSyntax = useCallback(() => {
    setManualFold((prev) => {
      const current = prev ?? syntaxFold
      const next = current === 'open' ? 'closed' : 'open'
      wheelStepsRef.current = next === 'closed' ? 2 : 0
      return next
    })
  }, [syntaxFold])

  return {
    syntaxFold: fold,
    syntaxOpen,
    toggleSyntax,
    autoCollapsed: fold === 'closed',
  }
}
