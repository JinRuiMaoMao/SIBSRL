import { useCallback, useEffect, useState } from 'react'
import { isRealAppShellPage, readRealShellLanguageHash } from '../utils/appTabNavigation'

/** Tracks real/index.html#language so App re-renders on hash changes without an app tab change. */
export function useRealShellLanguageOpen(): boolean {
  const [open, setOpen] = useState(() => readRealShellLanguageHash())

  const sync = useCallback(() => {
    setOpen(readRealShellLanguageHash())
  }, [])

  useEffect(() => {
    if (!isRealAppShellPage()) return
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [sync])

  return open
}
