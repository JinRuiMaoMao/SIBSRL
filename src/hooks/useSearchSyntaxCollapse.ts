import { useCallback, useEffect, useState } from 'react'

const SCROLL_COLLAPSE_THRESHOLD = 80

export function useSearchSyntaxCollapse() {
  const [scrolled, setScrolled] = useState(false)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    const sync = () => {
      setScrolled(window.scrollY > SCROLL_COLLAPSE_THRESHOLD)
    }
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    return () => window.removeEventListener('scroll', sync)
  }, [])

  useEffect(() => {
    if (!scrolled) setExpanded(true)
  }, [scrolled])

  const syntaxOpen = !scrolled || expanded

  const toggleSyntax = useCallback(() => {
    setExpanded((value) => !value)
  }, [])

  return { syntaxOpen, toggleSyntax, autoCollapsed: scrolled && !expanded }
}
