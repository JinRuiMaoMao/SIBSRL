import { useCallback, useEffect, useState, type RefObject } from 'react'
import { DAILY_CHALLENGE_CARD_ID } from '../data/dailyChallenge'

const SCROLL_COLLAPSE_THRESHOLD = 80
/** 每日挑战回到搜索栏下方足够远时，才解除折叠锁定 */
const CHALLENGE_EXPAND_CLEAR_GAP_PX = 72

export interface SearchSyntaxCollapseOptions {
  stickyRef?: RefObject<HTMLElement | null>
  dailyChallengeVisible?: boolean
}

export function useSearchSyntaxCollapse(options: SearchSyntaxCollapseOptions = {}) {
  const { stickyRef, dailyChallengeVisible = false } = options
  const [scrolled, setScrolled] = useState(false)
  const [overlapsChallenge, setOverlapsChallenge] = useState(false)
  const [challengeCollapseLatched, setChallengeCollapseLatched] = useState(false)
  /** 用户手动展开/收起；离开自动折叠区后恢复自动 */
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)

  useEffect(() => {
    const sync = () => {
      setScrolled(window.scrollY > SCROLL_COLLAPSE_THRESHOLD)
    }
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    return () => window.removeEventListener('scroll', sync)
  }, [])

  useEffect(() => {
    if (!dailyChallengeVisible || !stickyRef) {
      setOverlapsChallenge(false)
      setChallengeCollapseLatched(false)
      return
    }

    const sticky = stickyRef.current
    if (!sticky) return

    const sync = () => {
      const challenge = document.querySelector<HTMLElement>(
        `[data-route-id="${DAILY_CHALLENGE_CARD_ID}"]`,
      )
      if (!challenge) {
        setOverlapsChallenge(false)
        setChallengeCollapseLatched(false)
        return
      }

      const stickyBottom = sticky.getBoundingClientRect().bottom
      const challengeTop = challenge.getBoundingClientRect().top
      const overlapping = stickyBottom >= challengeTop - 4

      setOverlapsChallenge(overlapping)
      if (overlapping) {
        setChallengeCollapseLatched(true)
      } else if (challengeTop > stickyBottom + CHALLENGE_EXPAND_CLEAR_GAP_PX) {
        setChallengeCollapseLatched(false)
      }
    }

    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)

    const ro = new ResizeObserver(sync)
    ro.observe(sticky)
    const challenge = document.querySelector<HTMLElement>(
      `[data-route-id="${DAILY_CHALLENGE_CARD_ID}"]`,
    )
    if (challenge) ro.observe(challenge)

    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      ro.disconnect()
    }
  }, [dailyChallengeVisible, stickyRef])

  useEffect(() => {
    if (overlapsChallenge) setManualOpen(null)
  }, [overlapsChallenge])

  const shouldAutoCollapse = dailyChallengeVisible
    ? overlapsChallenge || challengeCollapseLatched
    : scrolled

  useEffect(() => {
    if (!shouldAutoCollapse) setManualOpen(null)
  }, [shouldAutoCollapse])

  const autoOpen = !shouldAutoCollapse
  const syntaxOpen = manualOpen ?? autoOpen

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
