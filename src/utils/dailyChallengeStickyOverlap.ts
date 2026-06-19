/** 每日挑战倒计时是否已滚入粘性搜索栏区域（视觉上被遮住） */
export function isDailyChallengeCountdownUnderSticky(sticky: HTMLElement): boolean {
  const countdown = document.querySelector<HTMLElement>('.daily-challenge-reset-countdown')
  if (!countdown) return false
  const stickyBottom = sticky.getBoundingClientRect().bottom
  const countdownBottom = countdown.getBoundingClientRect().bottom
  return countdownBottom <= stickyBottom + 1
}
