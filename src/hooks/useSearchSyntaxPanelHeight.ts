import { useEffect, type RefObject } from 'react'
import type { SyntaxFold } from './useSearchSyntaxCollapse'

const ORIGINAL_MAX_REM = 20
const VIEWPORT_BOTTOM_GAP_PX = 8

function readOriginalMaxPx(): number {
  const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  return ORIGINAL_MAX_REM * rootFontSize
}

function readViewportBudget(panel: HTMLElement): number {
  const sticky = document.querySelector<HTMLElement>('.route-lookup-sticky')
  const anchorBottom = sticky?.getBoundingClientRect().bottom ?? panel.getBoundingClientRect().top
  return Math.max(0, window.innerHeight - anchorBottom - VIEWPORT_BOTTOM_GAP_PX)
}

export function useSearchSyntaxPanelHeight(
  fold: SyntaxFold,
  panelRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const panel = panelRef.current
    const content = contentRef.current
    if (!panel || !content) return

    const clear = () => {
      panel.style.removeProperty('--search-syntax-open-height')
      panel.classList.remove('is-scrollable')
    }

    if (fold !== 'open') {
      clear()
      return
    }

    const sync = () => {
      const originalMaxPx = readOriginalMaxPx()
      const viewportBudget = readViewportBudget(panel)
      const capMax = Math.min(originalMaxPx, viewportBudget)
      const contentHeight = content.scrollHeight
      const openHeight = Math.min(contentHeight, capMax)
      const needsScroll = contentHeight > capMax

      panel.style.setProperty('--search-syntax-open-height', `${openHeight}px`)
      panel.classList.toggle('is-scrollable', needsScroll)
    }

    sync()
    window.addEventListener('resize', sync)

    const ro = new ResizeObserver(sync)
    ro.observe(content)
    ro.observe(panel)
    const sticky = document.querySelector<HTMLElement>('.route-lookup-sticky')
    if (sticky) ro.observe(sticky)

    return () => {
      window.removeEventListener('resize', sync)
      ro.disconnect()
      clear()
    }
  }, [fold, panelRef, contentRef])
}
