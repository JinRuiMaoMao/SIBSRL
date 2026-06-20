let lockCount = 0

/** 锁定页面滚动；弹窗叠层时引用计数，避免提前解锁。 */
export function lockPageScroll(): () => void {
  lockCount += 1
  if (lockCount === 1) {
    document.documentElement.classList.add('is-scroll-locked')
  }

  let released = false
  return () => {
    if (released) return
    released = true
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount === 0) {
      document.documentElement.classList.remove('is-scroll-locked')
    }
  }
}
