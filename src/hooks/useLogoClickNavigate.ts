import { useCallback, useEffect, useRef, type MutableRefObject } from 'react'
import { getStartPageHref, isStartPage } from '../utils/appPage'

const CLICK_TARGET = 10
const CLICK_RESET_MS = 2000
const SINGLE_CLICK_NAV_MS = 420

function clearTimer(timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current) {
    clearTimeout(timerRef.current)
    timerRef.current = null
  }
}

/** 单击图标回到开始页；连点 10 次跳转 targetHref；pageKey 变化时清零计数 */
export function useLogoClickNavigate(
  pageKey: string,
  targetHref: string,
  onReach?: () => void,
  singleClickHref: string = getStartPageHref(),
) {
  const countRef = useRef(0)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const singleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    countRef.current = 0
    clearTimer(resetTimerRef)
    clearTimer(singleClickTimerRef)
  }, [pageKey])

  const onLogoClick = useCallback(() => {
    clearTimer(resetTimerRef)
    clearTimer(singleClickTimerRef)

    countRef.current += 1

    if (countRef.current >= CLICK_TARGET) {
      countRef.current = 0
      onReach?.()
      window.location.href = targetHref
      return
    }

    if (countRef.current === 1) {
      singleClickTimerRef.current = setTimeout(() => {
        singleClickTimerRef.current = null
        if (countRef.current !== 1) return
        countRef.current = 0
        if (isStartPage()) return
        window.location.href = singleClickHref
      }, SINGLE_CLICK_NAV_MS)
    }

    resetTimerRef.current = setTimeout(() => {
      countRef.current = 0
      resetTimerRef.current = null
    }, CLICK_RESET_MS)
  }, [onReach, singleClickHref, targetHref])

  return onLogoClick
}
