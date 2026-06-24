import { useEffect, useState } from 'react'

const COMPACT_TAB_NAV_QUERY = '(max-width: 900px), (hover: none) and (pointer: coarse)'

/** 手机 / iPad 等触屏或窄屏：使用底部图标折叠导航。 */
export function useCompactTabNav(): boolean {
  const [compact, setCompact] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(COMPACT_TAB_NAV_QUERY).matches
  })

  useEffect(() => {
    const media = window.matchMedia(COMPACT_TAB_NAV_QUERY)
    const onChange = () => setCompact(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return compact
}
