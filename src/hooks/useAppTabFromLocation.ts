import { useCallback, useEffect, useState } from 'react'
import type { AppTab } from '../types/appTab'
import { isRealAppShellPage, readTabFromLocation } from '../utils/appTabNavigation'
import { REAL_SHELL_NAV_EVENT } from '../utils/realShellNavigation'

export function useAppTabFromLocation(): AppTab | null {
  const [tab, setTab] = useState<AppTab | null>(() => readTabFromLocation())

  const sync = useCallback(() => {
    setTab(readTabFromLocation())
  }, [])

  useEffect(() => {
    window.addEventListener('popstate', sync)
    window.addEventListener(REAL_SHELL_NAV_EVENT, sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(REAL_SHELL_NAV_EVENT, sync)
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
