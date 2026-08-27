import { useCallback, useEffect, useState } from 'react'
import type { AppTab } from '../types/appTab'
import { isRealAppShellPage, readTabFromLocation } from '../utils/appTabNavigation'

export function useAppTabFromLocation(): AppTab | null {
  const [tab, setTab] = useState<AppTab | null>(() => readTabFromLocation())

  const sync = useCallback(() => {
    setTab(readTabFromLocation())
  }, [])

  useEffect(() => {
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [sync])

  useEffect(() => {
    if (!isRealAppShellPage()) return
    if (tab) {
      document.documentElement.setAttribute('data-app-tab', tab)
    } else {
      document.documentElement.removeAttribute('data-app-tab')
    }
  }, [tab])

  return tab
}
