import { useEffect, useRef, useState, type RefObject } from 'react'

/** 语法顶缘进入搜索框下沿时隐藏（仅视觉，不改变布局高度） */
const HIDE_INSET_PX = 1
/** 重新显示时的滞后距离，避免临界区闪烁 */
const SHOW_CLEAR_PX = 10

export function useSearchSyntaxScrollHide(
  stickyRef: RefObject<HTMLElement | null>,
  syntaxRef: RefObject<HTMLElement | null>,
): boolean {
  const [hidden, setHidden] = useState(false)
  const hiddenRef = useRef(false)

  useEffect(() => {
    const sync = () => {
      const sticky = stickyRef.current
      const syntax = syntaxRef.current
      if (!sticky || !syntax) return

      const searchBar = sticky.querySelector<HTMLElement>('.search-bar')
      if (!searchBar) return

      const searchBottom = searchBar.getBoundingClientRect().bottom
      const syntaxTop = syntax.getBoundingClientRect().top

      let next = hiddenRef.current
      if (syntaxTop < searchBottom - HIDE_INSET_PX) {
        next = true
      } else if (syntaxTop >= searchBottom + SHOW_CLEAR_PX) {
        next = false
      }

      hiddenRef.current = next
      setHidden(next)
    }

    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)

    const ro = new ResizeObserver(sync)
    const sticky = stickyRef.current
    const syntax = syntaxRef.current
    if (sticky) ro.observe(sticky)
    if (syntax) ro.observe(syntax)

    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      ro.disconnect()
    }
  }, [stickyRef, syntaxRef])

  return hidden
}
