/** 每日挑战倒计时是否已滚入搜索框后方（与语法面板高度无关） */
export function isDailyChallengeCountdownUnderSticky(sticky: HTMLElement): boolean {
  const countdown = document.querySelector<HTMLElement>('.daily-challenge-reset-countdown')
  if (!countdown) return false
  const anchor = sticky.querySelector<HTMLElement>('.search-bar') ?? sticky
  const anchorBottom = anchor.getBoundingClientRect().bottom
  const countdownBottom = countdown.getBoundingClientRect().bottom
  return countdownBottom <= anchorBottom + 1
}
