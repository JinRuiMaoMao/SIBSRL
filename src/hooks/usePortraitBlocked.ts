import { useEffect, useState } from 'react'
import { PORTRAIT_BLOCKED_MEDIA } from '../constants/layout'
import { isRealLayoutMode } from '../utils/appLayoutMode'

function readPortraitBlocked(): boolean {
  if (typeof window === 'undefined') return false
  if (!isRealLayoutMode()) return false
  return window.matchMedia(PORTRAIT_BLOCKED_MEDIA).matches
}

function applyPortraitBlockedAttribute(blocked: boolean): void {
  if (!isRealLayoutMode()) {
    document.documentElement.removeAttribute('data-portrait-blocked')
    return
  }
  document.documentElement.setAttribute('data-portrait-blocked', blocked ? 'true' : 'false')
}

export function usePortraitBlocked(): boolean {
  const [blocked, setBlocked] = useState(readPortraitBlocked)

  useEffect(() => {
    const media = window.matchMedia(PORTRAIT_BLOCKED_MEDIA)

    const sync = () => {
      const next = media.matches
      setBlocked(next)
      applyPortraitBlockedAttribute(next)
    }

    sync()
    media.addEventListener('change', sync)
    window.addEventListener('orientationchange', sync)
    window.addEventListener('resize', sync)

    return () => {
      media.removeEventListener('change', sync)
      window.removeEventListener('orientationchange', sync)
      window.removeEventListener('resize', sync)
    }
  }, [])

  return blocked
}
