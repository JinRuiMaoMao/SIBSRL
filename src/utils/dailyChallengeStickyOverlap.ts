function getStickyOverlapAnchor(sticky: HTMLElement): HTMLElement {
  return sticky.querySelector<HTMLElement>('.search-bar') ?? sticky
}

export function measureDailyChallengeCountdownOverlap(sticky: HTMLElement): {
  anchorBottom: number
  countdownBottom: number
} | null {
  const countdown = document.querySelector<HTMLElement>('.daily-challenge-reset-countdown')
  if (!countdown) return null
  const anchor = getStickyOverlapAnchor(sticky)
  return {
    anchorBottom: anchor.getBoundingClientRect().bottom,
    countdownBottom: countdown.getBoundingClientRect().bottom,
  }
}

/** 每日挑战倒计时是否已滚入搜索框后方（与语法面板高度无关） */
export function isDailyChallengeCountdownUnderSticky(sticky: HTMLElement): boolean {
  const metrics = measureDailyChallengeCountdownOverlap(sticky)
  if (!metrics) return false
  return metrics.countdownBottom <= metrics.anchorBottom + 1
}

/** 带滞后的折叠判定，避免展开/收起引起布局位移后来回翻转 */
export function shouldCollapseSyntaxForCountdown(
  sticky: HTMLElement,
  previouslyCollapsed: boolean,
): boolean {
  const metrics = measureDailyChallengeCountdownOverlap(sticky)
  if (!metrics) return false

  const { anchorBottom, countdownBottom } = metrics
  const collapseAt = anchorBottom + 6
  const expandClearAt = anchorBottom + 100

  if (countdownBottom <= collapseAt) return true
  if (countdownBottom > expandClearAt) return false
  return previouslyCollapsed
}
