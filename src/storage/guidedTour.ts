export const GUIDED_TOUR_SEEN_KEY = 'sibs-guided-tour-seen'

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
