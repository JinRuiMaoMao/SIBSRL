import { useEffect, type RefObject } from 'react'

const ORIGINAL_MAX_REM = 20
const VIEWPORT_BOTTOM_GAP_PX = 8

function readOriginalMaxPx(): number {
  const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  return ORIGINAL_MAX_REM * rootFontSize
}

function readViewportBudget(sticky: HTMLElement): number {
  const anchorBottom = sticky.getBoundingClientRect().bottom
  return Math.max(0, window.innerHeight - anchorBottom - VIEWPORT_BOTTOM_GAP_PX)
}

export function useSearchSyntaxPanelHeight(
  stickyRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const panel = panelRef.current
    const content = contentRef.current
    const sticky = stickyRef.current
    if (!panel || !content || !sticky || !enabled) return

    const clear = () => {
      panel.style.removeProperty('--search-syntax-max-height')
      panel.classList.remove('is-scrollable')
    }

    const sync = () => {
      const originalMaxPx = readOriginalMaxPx()
      const viewportBudget = readViewportBudget(sticky)
      const capMax = Math.min(originalMaxPx, viewportBudget)
      const contentHeight = content.scrollHeight
      const openHeight = Math.min(contentHeight, capMax)
      const needsScroll = contentHeight > capMax

      panel.style.setProperty('--search-syntax-max-height', `${openHeight}px`)
      panel.classList.toggle('is-scrollable', needsScroll)
    }

    sync()
    window.addEventListener('resize', sync)

    const ro = new ResizeObserver(sync)
    ro.observe(content)
    ro.observe(panel)
    ro.observe(sticky)

    return () => {
      window.removeEventListener('resize', sync)
      ro.disconnect()
      clear()
    }
  }, [enabled, stickyRef, panelRef, contentRef])
}
