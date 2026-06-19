import { useCallback, useEffect, useState } from 'react'

const SCROLL_COLLAPSE_THRESHOLD = 80

export function useSearchSyntaxCollapse() {
  const [scrolled, setScrolled] = useState(false)
  /** 用户手动展开/收起；回顶后恢复自动 */
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
    if (!scrolled) setManualOpen(null)
  }, [scrolled])

  const autoOpen = !scrolled
  const syntaxOpen = manualOpen ?? autoOpen

  const toggleSyntax = useCallback(() => {
    setManualOpen((prev) => {
      const current = prev ?? !scrolled
      return !current
    })
  }, [scrolled])

  return { syntaxOpen, toggleSyntax, autoCollapsed: scrolled && !syntaxOpen }
}
