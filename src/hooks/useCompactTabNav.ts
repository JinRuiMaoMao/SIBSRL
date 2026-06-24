import { useEffect, useState } from 'react'

const COMPACT_TAB_NAV_QUERY = '(max-width: 900px), (hover: none)'
const TABLET_WIDTH_QUERY = '(max-width: 1180px)'

function detectCompactTabNav(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia(COMPACT_TAB_NAV_QUERY).matches) return true
  // iPadOS 有时上报 pointer:fine，用触屏 + 平板宽度兜底
  return navigator.maxTouchPoints > 1 && window.matchMedia(TABLET_WIDTH_QUERY).matches
}

/** 手机 / iPad 等触屏或窄屏：使用 iOS 风格常驻底栏。 */
export function useCompactTabNav(): boolean {
  const [compact, setCompact] = useState(() => detectCompactTabNav())

  useEffect(() => {
    const mediaQueries = [
      window.matchMedia(COMPACT_TAB_NAV_QUERY),
      window.matchMedia(TABLET_WIDTH_QUERY),
    ]
    const onChange = () => setCompact(detectCompactTabNav())
    onChange()
    for (const media of mediaQueries) {
      media.addEventListener('change', onChange)
    }
    window.addEventListener('orientationchange', onChange)
    return () => {
      for (const media of mediaQueries) {
        media.removeEventListener('change', onChange)
      }
      window.removeEventListener('orientationchange', onChange)
    }
  }, [])

  return compact
}
