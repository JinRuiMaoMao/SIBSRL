import { useEffect, useState, type RefObject } from 'react'

/**
 * 列表上滑、每日挑战倒计时进入置顶搜索栏区域时，为搜索栏启用底部渐变蒙版。
 */
export function useRouteLookupStickyFade(
  stickyRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): boolean {
  const [fade, setFade] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setFade(false)
      return
    }

    const sticky = stickyRef.current
    if (!sticky) return

    const sync = () => {
      const countdown = document.querySelector<HTMLElement>('.daily-challenge-reset-countdown')
      if (!countdown) {
        setFade(false)
        return
      }
      const stickyBottom = sticky.getBoundingClientRect().bottom
      const countdownBottom = countdown.getBoundingClientRect().bottom
      setFade(countdownBottom <= stickyBottom + 1)
    }

    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)

    const ro = new ResizeObserver(sync)
    ro.observe(sticky)
    const countdown = document.querySelector<HTMLElement>('.daily-challenge-reset-countdown')
    if (countdown) ro.observe(countdown)

    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      ro.disconnect()
    }
  }, [enabled, stickyRef])

  return fade
}
