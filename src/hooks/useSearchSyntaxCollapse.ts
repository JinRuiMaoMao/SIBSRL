import { useCallback, useEffect, useState, type RefObject } from 'react'
import { DAILY_CHALLENGE_CARD_ID } from '../data/dailyChallenge'

/** 视为「页面顶部」的滚动距离；回到此处自动展开语法说明 */
const SCROLL_TOP_THRESHOLD = 80
/** 每日挑战顶缘进入搜索框下方此距离内时折叠语法 */
const CHALLENGE_COLLAPSE_GAP_PX = 12

export interface SearchSyntaxCollapseOptions {
  stickyRef?: RefObject<HTMLElement | null>
  dailyChallengeVisible?: boolean
}

export function useSearchSyntaxCollapse(options: SearchSyntaxCollapseOptions = {}) {
  const { stickyRef, dailyChallengeVisible = false } = options
  const [atPageTop, setAtPageTop] = useState(true)
  const [challengeNearToolbar, setChallengeNearToolbar] = useState(false)
  /** 离开顶部后的手动展开/收起；回顶时清除 */
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)

  useEffect(() => {
    const sync = () => {
      setAtPageTop(window.scrollY <= SCROLL_TOP_THRESHOLD)
    }
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    return () => window.removeEventListener('scroll', sync)
  }, [])

  useEffect(() => {
    if (!dailyChallengeVisible || !stickyRef || atPageTop) {
      setChallengeNearToolbar(false)
      return
    }

    const sticky = stickyRef.current
    if (!sticky) return

    const sync = () => {
      const searchBar = sticky.querySelector<HTMLElement>('.search-bar')
      const challenge = document.querySelector<HTMLElement>(
        `[data-route-id="${DAILY_CHALLENGE_CARD_ID}"]`,
      )
      if (!searchBar || !challenge) {
        setChallengeNearToolbar(false)
        return
      }

      const searchBarBottom = searchBar.getBoundingClientRect().bottom
      const challengeTop = challenge.getBoundingClientRect().top
      setChallengeNearToolbar(challengeTop <= searchBarBottom + CHALLENGE_COLLAPSE_GAP_PX)
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
  }, [atPageTop, dailyChallengeVisible, stickyRef])

  useEffect(() => {
    if (atPageTop) setManualOpen(null)
  }, [atPageTop])

  const shouldAutoCollapse = atPageTop
    ? false
    : dailyChallengeVisible
      ? challengeNearToolbar
      : true

  const syntaxOpen = atPageTop ? true : (manualOpen ?? !shouldAutoCollapse)

  const toggleSyntax = useCallback(() => {
    if (atPageTop) return
    setManualOpen((prev) => {
      const current = prev ?? !shouldAutoCollapse
      return !current
    })
  }, [atPageTop, shouldAutoCollapse])

  return {
    syntaxOpen,
    toggleSyntax,
    autoCollapsed: !atPageTop && shouldAutoCollapse && !syntaxOpen,
  }
}
