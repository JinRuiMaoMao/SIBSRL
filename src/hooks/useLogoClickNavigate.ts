import { useCallback, useEffect, useRef, type MutableRefObject } from 'react'

const CLICK_TARGET = 10
const CLICK_RESET_MS = 2000

function clearClickResetTimer(timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current) {
    clearTimeout(timerRef.current)
    timerRef.current = null
  }
}

/** 连点图标跳转；pageKey 变化时清零计数 */
export function useLogoClickNavigate(
  pageKey: string,
  targetHref: string,
  onReach?: () => void,
) {
  const countRef = useRef(0)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    countRef.current = 0
    clearClickResetTimer(resetTimerRef)
  }, [pageKey])

  const onLogoClick = useCallback(() => {
    clearClickResetTimer(resetTimerRef)

    countRef.current += 1
    if (countRef.current >= CLICK_TARGET) {
      countRef.current = 0
      onReach?.()
      window.location.href = targetHref
      return
    }

    resetTimerRef.current = setTimeout(() => {
      countRef.current = 0
      resetTimerRef.current = null
    }, CLICK_RESET_MS)
  }, [onReach, targetHref])

  return onLogoClick
}
