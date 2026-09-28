import { useEffect, useState, type RefObject } from 'react'
import { computeRealStartMenuUiScale, REAL_START_MENU_LAYOUT } from '../data/realStartMenuLayout'

/** Mirrors StartMenuRB.UIScale driven by StartMenu.AbsoluteSize.Y in the Roblox client. */
export function useRealStartMenuScale(menuRootRef: RefObject<HTMLElement | null>) {
  const [uiScale, setUiScale] = useState(1)

  useEffect(() => {
    const node = menuRootRef.current
    if (!node) return

    const update = () => {
      const height = node.getBoundingClientRect().height
      setUiScale(computeRealStartMenuUiScale(height))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [menuRootRef])

  return {
    uiScale,
    menuHeightScale: REAL_START_MENU_LAYOUT.menuHeightScale,
  }
}
