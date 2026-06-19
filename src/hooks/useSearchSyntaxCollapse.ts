import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { isDailyChallengeCountdownUnderSticky } from '../utils/dailyChallengeStickyOverlap'

/** 视为「页面顶部」的滚动距离；从下方滚回此处时自动展开语法说明 */
const SCROLL_TOP_THRESHOLD = 80

export interface SearchSyntaxCollapseOptions {
  stickyRef?: RefObject<HTMLElement | null>
  dailyChallengeVisible?: boolean
}

export function useSearchSyntaxCollapse(options: SearchSyntaxCollapseOptions = {}) {
  const { stickyRef, dailyChallengeVisible = false } = options
  const [atPageTop, setAtPageTop] = useState(true)
  const [countdownHidden, setCountdownHidden] = useState(false)
  /** 手动展开/收起；从下方滚回顶部时清除以恢复默认展开 */
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const wasAtPageTopRef = useRef(true)

  useEffect(() => {
    const sync = () => {
      setAtPageTop(window.scrollY <= SCROLL_TOP_THRESHOLD)
    }
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    return () => window.removeEventListener('scroll', sync)
  }, [])

  useEffect(() => {
    if (atPageTop && !wasAtPageTopRef.current) {
      setManualOpen(null)
    }
    wasAtPageTopRef.current = atPageTop
  }, [atPageTop])

  useEffect(() => {
    if (!dailyChallengeVisible || !stickyRef) {
      setCountdownHidden(false)
      return
    }

    const sticky = stickyRef.current
    if (!sticky) return

    const sync = () => {
      setCountdownHidden(isDailyChallengeCountdownUnderSticky(sticky))
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
  }, [dailyChallengeVisible, stickyRef])

  const shouldAutoCollapse = atPageTop
    ? false
    : dailyChallengeVisible
      ? countdownHidden
      : true

  const syntaxOpen = atPageTop
    ? manualOpen !== false
    : (manualOpen ?? !shouldAutoCollapse)

  const toggleSyntax = useCallback(() => {
    setManualOpen((prev) => {
      const current = atPageTop ? prev !== false : (prev ?? !shouldAutoCollapse)
      return !current
    })
  }, [atPageTop, shouldAutoCollapse])

  return {
    syntaxOpen,
    toggleSyntax,
    autoCollapsed: !atPageTop && shouldAutoCollapse && !syntaxOpen,
  }
}
