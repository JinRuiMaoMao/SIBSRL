import { isRoutesPage } from '../utils/appTabNavigation'
import { readRouteQueryFromLocation } from '../utils/routeNavigation'

export const GUIDED_TOUR_SEEN_KEY = 'sibs-guided-tour-seen'
export const GUIDED_TOUR_DEFERRED_KEY = 'sibs-guided-tour-deferred'

export function hasSeenGuidedTour(): boolean {
  try {
    return localStorage.getItem(GUIDED_TOUR_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markGuidedTourSeen(): void {
  try {
    localStorage.setItem(GUIDED_TOUR_SEEN_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function clearGuidedTourSeen(): void {
  try {
    localStorage.removeItem(GUIDED_TOUR_SEEN_KEY)
  } catch {
    /* ignore */
  }
}

export function shouldShowGuidedTour(): boolean {
  return !hasSeenGuidedTour()
}

export function deferGuidedTourThisSession(): void {
  try {
    sessionStorage.setItem(GUIDED_TOUR_DEFERRED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function clearGuidedTourDeferral(): void {
  try {
    sessionStorage.removeItem(GUIDED_TOUR_DEFERRED_KEY)
  } catch {
    /* ignore */
  }
}

export function isGuidedTourDeferredThisSession(): boolean {
  try {
    return sessionStorage.getItem(GUIDED_TOUR_DEFERRED_KEY) === '1'
  } catch {
    return false
  }
}

/** 自动弹出新手引导的前置条件（不含每日挑战/更新弹窗等待） */
export function canAutoStartGuidedTour(): boolean {
  return (
    shouldShowGuidedTour() &&
    isRoutesPage() &&
    !readRouteQueryFromLocation() &&
    !isGuidedTourDeferredThisSession()
  )
}
