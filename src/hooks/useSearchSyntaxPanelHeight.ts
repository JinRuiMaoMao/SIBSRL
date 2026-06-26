import { useEffect, type RefObject } from 'react'

const ORIGINAL_MAX_REM = 20
const VIEWPORT_BOTTOM_GAP_PX = 8
/** Match App.css --syntax-dock-duration so we remeasure after expand/collapse. */
const LAYOUT_RETRY_MS = 480

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

    let retryTimer: number | null = null

    const clear = () => {
      if (retryTimer != null) {
        window.clearTimeout(retryTimer)
        retryTimer = null
      }
      panel.style.removeProperty('--search-syntax-max-height')
      panel.classList.remove('is-scrollable')
    }

    const scheduleRetry = () => {
      if (retryTimer != null) return
      retryTimer = window.setTimeout(() => {
        retryTimer = null
        sync()
      }, LAYOUT_RETRY_MS)
    }

    const sync = () => {
      const originalMaxPx = readOriginalMaxPx()
      const viewportBudget = readViewportBudget(sticky)
      const capMax =
        viewportBudget > 0 ? Math.min(originalMaxPx, viewportBudget) : originalMaxPx
      const contentHeight = content.scrollHeight

      if (contentHeight <= 0) {
        panel.style.removeProperty('--search-syntax-max-height')
        panel.classList.remove('is-scrollable')
        scheduleRetry()
        return
      }

      if (retryTimer != null) {
        window.clearTimeout(retryTimer)
        retryTimer = null
      }

      const openHeight = Math.min(contentHeight, capMax)
      if (openHeight <= 0) {
        panel.style.removeProperty('--search-syntax-max-height')
        panel.classList.remove('is-scrollable')
        scheduleRetry()
        return
      }

      panel.style.setProperty('--search-syntax-max-height', `${openHeight}px`)
      panel.classList.toggle('is-scrollable', contentHeight > capMax)
    }

    sync()
    window.addEventListener('resize', sync)

    const dock = panel.closest('.route-syntax-dock')
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName === 'grid-template-rows') sync()
    }
    dock?.addEventListener('transitionend', onTransitionEnd)

    const ro = new ResizeObserver(sync)
    ro.observe(content)
    ro.observe(sticky)

    return () => {
      window.removeEventListener('resize', sync)
      dock?.removeEventListener('transitionend', onTransitionEnd)
      ro.disconnect()
      clear()
    }
  }, [enabled, stickyRef, panelRef, contentRef])
}
