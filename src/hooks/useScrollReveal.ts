import { useEffect, type RefObject } from 'react'
import { shouldReduceMotion } from '../storage/appPreferences'

/** Elements that fade/slide in as they enter the scroll viewport. */
export const SCROLL_REVEAL_SELECTORS = [
  '.page-intro',
  '.filter-group',
  '.section-title',
  '.updates-section-head',
  '.updates-changelog-totals',
  '.search-bar-wrap',
  '.search-toolbar',
  '.favorites-folder-bar',
  '.safety-broadcast-list > li',
  '.complaints-list > li',
  '.updates-list > li',
  '.route-group-collapse',
  '.transfer-plan-card-link',
  '.between-stops-section',
  '.settings-page-header',
  '.settings-page-nav-item',
  '.settings-page-panel-title',
  '.settings-field',
  '.account-page-header',
  '.account-profile-card',
  '.account-auth-card',
].join(', ')

const SCROLL_REVEAL_EXCLUDED_ANCESTORS = [
  '.route-detail-sheet',
  '.daily-challenge-prompt-root',
  '.daily-challenge-calendar-root',
  '.app-dialog-root',
  '.guided-tour-root',
].join(', ')

const SCROLL_REVEAL_SELECTOR = SCROLL_REVEAL_SELECTORS

function isScrollRevealCandidate(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false
  if (element.classList.contains('scroll-reveal')) return true
  if (!element.matches(SCROLL_REVEAL_SELECTOR)) return false
  if (element.closest(SCROLL_REVEAL_EXCLUDED_ANCESTORS)) return false
  return true
}

function revealElement(element: HTMLElement) {
  element.classList.add('scroll-reveal', 'is-revealed')
}

export function useScrollReveal(
  rootRef: RefObject<HTMLElement | null>,
  reduceMotion: boolean,
): void {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const motionReduced = reduceMotion || shouldReduceMotion()
    const observed = new WeakSet<Element>()

    const revealAll = () => {
      root.querySelectorAll<HTMLElement>(SCROLL_REVEAL_SELECTOR).forEach((element) => {
        if (!isScrollRevealCandidate(element)) return
        revealElement(element)
        observed.add(element)
      })
    }

    if (motionReduced) {
      revealAll()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const element = entry.target
          if (!(element instanceof HTMLElement)) continue
          element.classList.add('is-revealed')
          observer.unobserve(element)
          observed.add(element)
        }
      },
      {
        root: null,
        rootMargin: '0px 0px -5% 0px',
        threshold: 0.06,
      },
    )

    const observeElement = (element: HTMLElement) => {
      if (observed.has(element)) return
      if (!isScrollRevealCandidate(element)) return
      element.classList.add('scroll-reveal')
      if (element.getBoundingClientRect().height === 0 && element.getBoundingClientRect().width === 0) {
        return
      }
      observer.observe(element)
    }

    const scan = () => {
      root.querySelectorAll<HTMLElement>(SCROLL_REVEAL_SELECTOR).forEach(observeElement)
    }

    scan()

    let scanFrame = 0
    const scheduleScan = () => {
      if (scanFrame) return
      scanFrame = window.requestAnimationFrame(() => {
        scanFrame = 0
        scan()
      })
    }

    const mutationObserver = new MutationObserver(scheduleScan)
    mutationObserver.observe(root, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
      if (scanFrame) window.cancelAnimationFrame(scanFrame)
    }
  }, [rootRef, reduceMotion])
}
