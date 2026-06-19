import { useEffect, useState, type RefObject } from 'react'

/** 语法顶缘进入搜索框下沿此范围内即隐藏 */
const HIDE_INSET_PX = 1

export function useSearchSyntaxScrollHide(
  stickyRef: RefObject<HTMLElement | null>,
  syntaxRef: RefObject<HTMLElement | null>,
): boolean {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const sync = () => {
      const sticky = stickyRef.current
      const syntax = syntaxRef.current
      if (!sticky || !syntax) return

      const searchBar = sticky.querySelector<HTMLElement>('.search-bar')
      if (!searchBar) return

      const searchBottom = searchBar.getBoundingClientRect().bottom
      const syntaxTop = syntax.getBoundingClientRect().top
      setHidden(syntaxTop < searchBottom - HIDE_INSET_PX)
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
