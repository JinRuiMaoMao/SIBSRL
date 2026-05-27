import { useEffect, useState } from 'react'

function safeMatchMedia(query: string): MediaQueryList | null {
  try {
    return window.matchMedia(query)
  } catch {
    return null
  }
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return safeMatchMedia(query)?.matches ?? false
  })

  useEffect(() => {
    const mq = safeMatchMedia(query)
    if (!mq) return
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}
