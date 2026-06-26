const ROUTE_LIST_OBSCURED_SELECTORS = [
  '.route-card-link',
  '.daily-challenge-card',
  '.seasonal-promoted-card',
  '.route-group-collapse-trigger',
  '.between-stops-route-wrap',
  '.between-stops-section',
].join(', ')

/** 列表内容是否已滚入置顶搜索栏区域（需启用底部渐变蒙版）。 */
export function isRouteListUnderStickyToolbar(sticky: HTMLElement): boolean {
  const stickyRect = sticky.getBoundingClientRect()
  const anchor = sticky.querySelector<HTMLElement>('.search-bar') ?? sticky
  const anchorBottom = anchor.getBoundingClientRect().bottom

  const countdown = document.querySelector<HTMLElement>('.daily-challenge-reset-countdown')
  if (countdown) {
    const countdownBottom = countdown.getBoundingClientRect().bottom
    if (countdownBottom <= anchorBottom + 1) return true
  }

  const list = sticky.closest('.route-lookup-page')?.querySelector('.route-list-section')
  if (!list) return false

  const viewportBottom = window.innerHeight
  for (const el of list.querySelectorAll<HTMLElement>(ROUTE_LIST_OBSCURED_SELECTORS)) {
    const rect = el.getBoundingClientRect()
    if (rect.bottom <= stickyRect.top + 2) continue
    if (rect.top >= viewportBottom) break
    if (rect.top < stickyRect.bottom - 2) return true
  }

  return false
}

/** @deprecated use isRouteListUnderStickyToolbar */
export function isDailyChallengeCountdownUnderSticky(sticky: HTMLElement): boolean {
  return isRouteListUnderStickyToolbar(sticky)
}
